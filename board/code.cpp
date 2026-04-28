/*
 ============================================================
  ANTI-THEFT LOCKER SYSTEM - ESP32
  Firebase Realtime Database + Telegram Notifications
 ============================================================
*/

#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <Keypad.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>

// ===================== CONFIGURATION =====================
const char *WIFI_SSID     = "hello123";
const char *WIFI_PASSWORD = "poco1234";

// ── Firebase Realtime Database ────────────────────────────
const String FIREBASE_HOST   = "locker-system-02-default-rtdb.firebaseio.com";
const String FIREBASE_SECRET = "YtyGo92r0BzPZOyCPeHRXve6xj8T98UEhdPpyrUU";

// ── Security (runtime — overwritten by fetchConfig on boot) ─
String CORRECT_PASSWORD = "2580";

// ── Telegram (runtime — set via web dashboard Settings tab) ─
// Stored in Firebase at: locker/config/telegram/{botToken, chatId}
String TELEGRAM_TOKEN   = "";
String TELEGRAM_CHAT_ID = "";

// ── Servo positions ───────────────────────────────────────
const int SERVO1_LOCKED   = 0;
const int SERVO1_UNLOCKED = 90;
const int SERVO2_CLOSED   = 143;
const int SERVO2_OPEN     = 45;
const int TRAPDOOR_HOLD_MS = 2000;

// ── Timing ────────────────────────────────────────────────
const int VIBRATION_COOLDOWN = 10000;
const int STARTUP_GRACE_MS   = 8000;
const int FIREBASE_PUSH_MS   = 8000;   // heartbeat every 8 s
const int FIREBASE_CMD_MS    = 1000;   // command poll every 1 s (null returns are instant after delete)
const int CONFIG_FETCH_MS    = 60000;  // re-fetch PIN + Telegram creds every 60 s
const int TELEGRAM_TIMEOUT   = 3000;

// ── Pin definitions ───────────────────────────────────────
#define SERVO1_PIN    18
#define SERVO2_PIN    19
#define BUZZER_PIN    23
#define VIBRATION_PIN  5

// ===================== KEYPAD SETUP ========================
// Key map:
//   *   → Clear / cancel entry
//   0–9 → Digit input
//   D   → Backspace
//   #   → Submit PIN (Enter)
//   A   → Lock door (when open)
//   B   → Reset alert / silence buzzer
//   C   → Reserved
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {{'1','2','3','A'},
                          {'4','5','6','B'},
                          {'7','8','9','C'},
                          {'*','0','#','D'}};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ===================== OBJECTS =============================
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo servo1;
Servo servo2;

// ===================== STATE VARIABLES =====================
int  failedAttempts    = 0;
bool lockerOpen        = false;
bool alertTriggered    = false;
bool vibAlertTriggered = false;
bool ntpSynced         = false;
unsigned long vibLastTrigger  = 0;
unsigned long systemStartTime = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastFirebaseCmd  = 0;
unsigned long lastNtpRetry     = 0;
unsigned long lastConfigFetch  = 0;
long lastCommandTs = 0;
String enteredPassword = "";

// ── Telegram single-slot queue (non-blocking) ─────────────
String telegramQueue = "";  // empty = nothing pending

// ── Deferred Firebase push (set in processKey, sent in loop) ─
// Keeps the keypad & LCD fully responsive — no HTTP blocking in processKey.
bool   pendingStatePush = false;
String pendingAction    = "";
bool   pendingLogPush   = false;
String pendingLogType   = "";
String pendingLogMsg    = "";

// ===================== FORWARD DECLARES ====================
void showIdleScreen();
void flipTrapdoor();
void resetAlert();
void handleCommand(String text);
void processKey(char key);
void fetchConfig();

// ===================== HELPERS =============================

void drainKeypad() {
  char k = keypad.getKey();
  if (k) processKey(k);
}

void queueTelegram(String msg) {
  if (telegramQueue.isEmpty())
    telegramQueue = msg;
}

// Send an HTTP DELETE to the given Firebase URL (used to clear executed commands)
void firebaseDelete(const String &url) {
  HTTPClient h;
  h.begin(url);
  h.setTimeout(300);
  h.sendRequest("DELETE");
  h.end();
}

// ===================== FETCH CONFIG FROM FIREBASE ==========
// Reads locker/config/{password, telegram} and updates runtime variables.
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = "https://" + FIREBASE_HOST + "/locker/config.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(2000);
  int code = http.GET();
  String payload = (code == 200) ? http.getString() : "";
  http.end();

  if (code != 200) {
    Serial.printf("[CFG] fetchConfig failed (HTTP %d)\n", code);
    return;
  }

  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, payload)) return;

  if (!doc["password"].isNull()) {
    String p = doc["password"].as<String>();
    if (p.length() >= 4) {
      CORRECT_PASSWORD = p;
      Serial.println("[CFG] PIN updated.");
    }
  }

  JsonVariant tg = doc["telegram"];
  if (tg.is<JsonObject>()) {
    String tok = tg["botToken"] | "";
    String cid = tg["chatId"]   | "";
    if (tok.length() > 10) { TELEGRAM_TOKEN   = tok; Serial.println("[CFG] Telegram token updated."); }
    if (cid.length() >  0) { TELEGRAM_CHAT_ID = cid; Serial.println("[CFG] Telegram chat ID updated."); }
  }
}

// ===================== TELEGRAM ============================
void sendTelegramIfQueued() {
  if (telegramQueue.isEmpty() || TELEGRAM_TOKEN.isEmpty()) return;
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage");
  http.setTimeout(TELEGRAM_TIMEOUT);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512);
  doc["chat_id"]    = TELEGRAM_CHAT_ID;
  doc["text"]       = telegramQueue;
  doc["parse_mode"] = "HTML";
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("[TGRAM] OK (HTTP %d)\n", code);
    telegramQueue = "";
  } else {
    Serial.printf("[TGRAM] FAILED (HTTP %d) — will retry\n", code);
  }
}

// ===================== NTP =================================
void syncTimeQuick() {
  configTime(19800, 0, "time.google.com", "pool.ntp.org", "time.cloudflare.com");
  struct tm t;
  int retry = 0;
  while (!getLocalTime(&t) && retry++ < 3) { delay(1000); Serial.print("."); }
  if (getLocalTime(&t)) {
    char buf[30]; strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &t);
    Serial.println("\nNTP synced: " + String(buf));
    ntpSynced = true;
  } else {
    Serial.println("\nNTP pending — will retry in background.");
  }
}

void retryNtpBackground() {
  // configTime already called at boot; just check if time is available yet
  struct tm t;
  if (getLocalTime(&t)) {
    char buf[30]; strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &t);
    Serial.println("[NTP] Background sync OK: " + String(buf));
    ntpSynced = true;
  }
}

String getCurrentTime() {
  struct tm t;
  if (!getLocalTime(&t)) return "Syncing...";
  char buf[30];
  strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &t);
  return String(buf);
}

// ===================== FIREBASE HELPERS ====================
void pushLogToFirebase(String type, String message) {
  if (WiFi.status() != WL_CONNECTED) return;
  DynamicJsonDocument doc(256);
  doc["type"]      = type;
  doc["message"]   = message;
  doc["timestamp"] = getCurrentTime();
  doc["ts"]        = millis();
  String body; serializeJson(doc, body);

  String url = "https://" + FIREBASE_HOST + "/locker/logs/" + String(millis()) + ".json?auth=" + FIREBASE_SECRET;
  HTTPClient http;
  http.begin(url);
  http.setTimeout(400);  // short — called from loop, not processKey
  http.addHeader("Content-Type", "application/json");
  http.PUT(body);
  http.end();
}

void pushStateToFirebase(String lastAction) {
  if (WiFi.status() != WL_CONNECTED) return;
  DynamicJsonDocument doc(512);
  doc["isLocked"]               = !lockerOpen;
  doc["isSecretCompartmentOpen"]= (servo2.read() == SERVO2_OPEN);
  doc["failedAttempts"]         = failedAttempts;
  doc["buzzerOn"]               = (digitalRead(BUZZER_PIN) == HIGH);
  doc["isBreached"]             = alertTriggered;
  doc["vibrationDetected"]      = vibAlertTriggered;
  doc["lastAction"]             = lastAction;
  doc["lastSeen"]               = getCurrentTime();
  doc["ts"]                     = ntpSynced ? (long)time(nullptr) : 0L;
  doc["uptimeMs"]               = (long)millis();
  String body; serializeJson(doc, body);

  HTTPClient http;
  http.begin("https://" + FIREBASE_HOST + "/locker/status.json?auth=" + FIREBASE_SECRET);
  http.setTimeout(400);  // short — called from loop, not processKey
  http.addHeader("Content-Type", "application/json");
  http.PATCH(body);
  http.end();
}

void checkFirebaseCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = "https://" + FIREBASE_HOST + "/locker/command.json?auth=" + FIREBASE_SECRET;
  HTTPClient http;
  http.begin(url);
  http.setTimeout(300);
  int code = http.GET();
  if (code != 200) { http.end(); return; }

  String payload = http.getString();
  http.end();
  if (payload == "null" || payload.isEmpty()) return;

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, payload)) return;

  long ts    = doc["ts"].as<long>();
  String cmd = doc["cmd"].as<String>();
  Serial.printf("[CMD] ts=%ld lastTs=%ld cmd=%s\n", ts, lastCommandTs, cmd.c_str());

  // Stale or duplicate — delete and bail
  if (ts <= lastCommandTs) {
    Serial.println("[CMD] Stale — deleting from Firebase");
    firebaseDelete(url);
    return;
  }

  // New command — execute, then delete to prevent re-fire on reboot
  lastCommandTs = ts;
  Serial.println("[WEB CMD] " + cmd);
  handleCommand(cmd);
  firebaseDelete(url);
  Serial.println("[CMD] Cleared from Firebase");
}

// ===================== SYSTEM SCREENS ======================
void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1); lcd.print("  Enter Pass: * ");
}

// ===================== TRAPDOOR ============================
void flipTrapdoor() {
  servo2.write(SERVO2_OPEN);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" Securing Items ");
  lcd.setCursor(0, 1); lcd.print(" Chamber Active ");
  delay(TRAPDOOR_HOLD_MS);
  servo2.write(SERVO2_CLOSED);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" Items Secured! ");
  lcd.setCursor(0, 1); lcd.print(" Chamber Sealed ");
  delay(1500);
}

// ===================== LOCKER OPEN =========================
void openLocker() {
  lockerOpen = true;
  servo1.write(SERVO1_UNLOCKED);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("  ACCESS GRANTED");
  lcd.setCursor(0, 1); lcd.print("  Locker Opened!");
  Serial.println("[EVENT] Door opened via keypad");
  pushStateToFirebase("Door opened via keypad");
  pushLogToFirebase("success", "Access granted — door opened via keypad");

  delay(1200);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" Door is Open   ");
  lcd.setCursor(0, 1); lcd.print(" Press A to Lock");
  Serial.println("[EVENT] Waiting for A key to lock...");

  // Wait for A (physical) or remote /lock (Firebase)
  unsigned long lastCmdCheck = millis();
  bool remotelyLocked = false;
  while (true) {
    if (keypad.getKey() == 'A') break;
    if (millis() - lastCmdCheck > 500) {
      lastCmdCheck = millis();
      checkFirebaseCommand();
      if (!lockerOpen) { remotelyLocked = true; break; }
    }
    delay(50);
  }

  if (!remotelyLocked) {
    servo1.write(SERVO1_LOCKED);
    lockerOpen = false;
    failedAttempts = 0;
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("  Locker Locked ");
    lcd.setCursor(0, 1); lcd.print("                ");
    delay(1200);
    showIdleScreen();
    Serial.println("[EVENT] Door locked by A key");
    pushStateToFirebase("Door locked via keypad (A)");
    pushLogToFirebase("info", "Door locked via keypad (A)");
  } else {
    failedAttempts = 0;
    Serial.println("[EVENT] Door locked remotely while open");
  }
}

// ===================== SECURITY ALERT ======================
void triggerSecurityAlert(String reason) {
  if (alertTriggered) return;
  alertTriggered = true;
  digitalWrite(BUZZER_PIN, HIGH);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1); lcd.print(reason.substring(0, 16));
  Serial.println("[ALERT] " + reason + " — Trapdoor deploying. Buzzer latched ON.");

  String tgramMsg;
  if (reason.indexOf("Wrong Pass") >= 0 || reason.indexOf("Wrong PIN") >= 0) {
    tgramMsg = "🔐 <b>SECURITY BREACH — Wrong PIN</b>\n"
               "3 consecutive failed unlock attempts detected.\n"
               "⏰ Buzzer active | Trapdoor deployed\n"
               "• Enter correct PIN on keypad, OR\n"
               "• Reset via web dashboard.";
  } else if (reason.indexOf("Tamper") >= 0 || reason.indexOf("Vibration") >= 0) {
    tgramMsg = "⚡ <b>SECURITY BREACH — Physical Tamper</b>\n"
               "Vibration sensor (SW-420) triggered!\n"
               "Possible forced entry or impact detected.\n"
               "⏰ Buzzer active | Trapdoor deployed\n"
               "• Enter correct PIN on keypad, OR\n"
               "• Reset via web dashboard.";
  } else {
    tgramMsg = "🚨 <b>SECURITY BREACH</b>\n"
               "Reason: " + reason + "\n"
               "⏰ Buzzer active | Trapdoor deployed\n"
               "Reset via web or correct PIN.";
  }
  queueTelegram(tgramMsg);
  pushStateToFirebase("ALERT: " + reason);
  pushLogToFirebase("critical", "ALERT: " + reason + " — buzzer latched, reset required");
  flipTrapdoor();
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1); lcd.print(reason.substring(0, 16));
}

// ===================== RESET ALERT =========================
void resetAlert() {
  alertTriggered    = false;
  vibAlertTriggered = false;
  failedAttempts    = 0;
  servo2.write(SERVO2_CLOSED);
  digitalWrite(BUZZER_PIN, LOW);
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" System Reset   ");
  delay(1500);
  showIdleScreen();
  Serial.println("[EVENT] System RESET — all alerts cleared");
  queueTelegram("✅ <b>Alert Cleared</b>\nAether Sentinel reset. System secure.");
  pushStateToFirebase("System RESET");
  pushLogToFirebase("info", "System reset — all alerts cleared");
}

// ===================== HANDLE COMMAND ======================
void handleCommand(String text) {
  text.trim();
  String action;

  if (text == "/unlock") {
    servo1.write(SERVO1_UNLOCKED);
    lockerOpen = true;
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Remote UNLOCK  ");
    lcd.setCursor(0, 1); lcd.print(" Door Open!     ");
    action = "Door UNLOCKED via web";

  } else if (text == "/lock") {
    servo1.write(SERVO1_LOCKED);
    lockerOpen = false;
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Remote LOCK    ");
    lcd.setCursor(0, 1); lcd.print(" Door Locked!   ");
    delay(1500);
    showIdleScreen();
    action = "Door LOCKED via web";

  } else if (text == "/trapdoor_open") {
    servo2.write(SERVO2_OPEN);
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Trapdoor OPEN  ");
    lcd.setCursor(0, 1); lcd.print(" Manual Control ");
    action = "Trapdoor OPENED manually";

  } else if (text == "/trapdoor_close") {
    servo2.write(SERVO2_CLOSED);
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Trapdoor CLOSED");
    lcd.setCursor(0, 1); lcd.print(" Manual Control ");
    delay(1500);
    showIdleScreen();
    action = "Trapdoor CLOSED manually";

  } else if (text == "/trapdoor_flip") {
    flipTrapdoor();
    showIdleScreen();
    action = "Trapdoor flipped and SEALED";

  } else if (text == "/buzzer_on") {
    alertTriggered = true;
    digitalWrite(BUZZER_PIN, HIGH);
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" BUZZER ON      ");
    lcd.setCursor(0, 1); lcd.print(" ALERT ACTIVE   ");
    queueTelegram("🌐 <b>REMOTE ALERT — Web Trigger</b>\n"
                  "Alarm activated manually via web dashboard.\n"
                  "⏰ Buzzer latched ON\n"
                  "• Stop via web dashboard Reset button, OR\n"
                  "• Enter correct PIN on keypad.");
    action = "Buzzer LATCHED ON — web alert active";

  } else if (text == "/buzzer_off") {
    digitalWrite(BUZZER_PIN, LOW);
    showIdleScreen();
    action = "Buzzer turned OFF";

  } else if (text == "/reset") {
    resetAlert();
    return; // resetAlert already pushes state + log

  } else if (text == "/status") {
    action = "Status refreshed at " + getCurrentTime();

  } else {
    action = "Unknown command: " + text;
  }

  Serial.println("[WEB] " + action);
  pushStateToFirebase(action);
  pushLogToFirebase("info", action);
}

// ===================== PROCESS KEYPAD KEY ==================
void processKey(char key) {
  Serial.print("[KEY] "); Serial.println(key);

  if (key == '*') {                          // Clear
    enteredPassword = "";
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print("Enter Password: ");
    lcd.setCursor(0, 1);
    return;
  }

  if (key == 'B') {                          // Reset alert
    if (alertTriggered) resetAlert();
    enteredPassword = "";
    return;
  }

  if (key == '#') {                          // Submit PIN
    lcd.clear(); lcd.setCursor(0, 0);
    if (enteredPassword == CORRECT_PASSWORD) {
      failedAttempts    = 0;
      vibAlertTriggered = false;
      if (alertTriggered) resetAlert();
      openLocker();
    } else {
      failedAttempts++;
      lcd.print("Wrong Password! ");
      lcd.setCursor(0, 1);
      lcd.print("Attempt "); lcd.print(failedAttempts); lcd.print("/3      ");
      Serial.println("[KEY] Wrong PIN — attempt " + String(failedAttempts) + "/3");
      // Defer Firebase push — keeps LCD & keypad responsive
      pendingAction    = "Wrong password attempt " + String(failedAttempts) + "/3";
      pendingStatePush = true;
      pendingLogType   = "warning";
      pendingLogMsg    = "Wrong PIN — attempt " + String(failedAttempts) + "/3";
      pendingLogPush   = true;
      delay(500);
      if (failedAttempts >= 3) {
        triggerSecurityAlert("3x Wrong Pass!");
        failedAttempts = 0;
      } else {
        lcd.clear();
        lcd.setCursor(0, 0); lcd.print("Enter Password: ");
        lcd.setCursor(0, 1);
      }
    }
    enteredPassword = "";
    return;
  }

  if (key == 'D') {                          // Backspace
    if (enteredPassword.length() > 0)
      enteredPassword.remove(enteredPassword.length() - 1);
  } else if (key != 'A' && key != 'C') {    // Digit
    enteredPassword += key;
  }

  // Refresh masked display
  lcd.setCursor(0, 1);
  String masked = "";
  for (unsigned int i = 0; i < enteredPassword.length(); i++) masked += '*';
  while (masked.length() < 16) masked += ' ';
  lcd.print(masked);
}

// ===================== SETUP ===============================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Anti-Theft Locker System starting...");

  lcd.init(); lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1); lcd.print("  LOCKER SYSTEM ");
  delay(1500);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, INPUT_PULLDOWN);
  digitalWrite(BUZZER_PIN, LOW);
  servo1.attach(SERVO1_PIN); servo1.write(SERVO1_LOCKED);
  servo2.attach(SERVO2_PIN); servo2.write(SERVO2_CLOSED);

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("Connecting WiFi ");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout++ < 20) {
    delay(500); Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 1); lcd.print("WiFi Connected! ");
    Serial.println("\n[WiFi] IP: " + WiFi.localIP().toString());

    pushStateToFirebase("Booting...");

    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Loading Config ");
    fetchConfig();
    lastConfigFetch = millis();

    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Syncing Time.. ");
    syncTimeQuick();

    pushStateToFirebase("System ONLINE");
    pushLogToFirebase("info", "System initialized — ESP32 online");
    queueTelegram("🟢 <b>Aether Sentinel Online</b>\nIP: " + WiFi.localIP().toString());
  } else {
    lcd.setCursor(0, 1); lcd.print("WiFi FAILED!    ");
    Serial.println("\n[WiFi] Connection failed — running offline");
  }

  delay(1000);
  systemStartTime = millis();
  showIdleScreen();
  Serial.println("[BOOT] Ready.");
}

// ===================== MAIN LOOP ===========================
void loop() {
  drainKeypad();

  // Vibration sensor (ignore STARTUP_GRACE_MS after boot)
  if (millis() - systemStartTime > STARTUP_GRACE_MS) {
    if (digitalRead(VIBRATION_PIN) == HIGH) {
      int highCount = 0;
      for (int i = 0; i < 5; i++) { delay(20); if (digitalRead(VIBRATION_PIN) == HIGH) highCount++; }
      if (highCount == 5) {
        unsigned long now = millis();
        if (!vibAlertTriggered || (now - vibLastTrigger > VIBRATION_COOLDOWN)) {
          vibAlertTriggered = true;
          vibLastTrigger = now;
          Serial.println("[SENSOR] High-impact vibration detected!");
          triggerSecurityAlert("Tamper Detected!");
        }
      }
    }
  }

  // NTP background retry (until synced)
  if (!ntpSynced && millis() - lastNtpRetry > 30000) {
    lastNtpRetry = millis();
    retryNtpBackground();
  }

  // Config refresh (PIN + Telegram) every 60 s
  if (millis() - lastConfigFetch > CONFIG_FETCH_MS) {
    lastConfigFetch = millis();
    fetchConfig();
  }

  // Firebase command poll every 1 s
  if (millis() - lastFirebaseCmd > FIREBASE_CMD_MS) {
    lastFirebaseCmd = millis();
    drainKeypad();
    checkFirebaseCommand();
    drainKeypad();
  }

  // Deferred keypad-event push (instant key response, async Firebase)
  if (pendingStatePush) {
    pendingStatePush = false;
    pushStateToFirebase(pendingAction);
  }
  if (pendingLogPush) {
    pendingLogPush = false;
    pushLogToFirebase(pendingLogType, pendingLogMsg);
  }

  // Firebase heartbeat every 8 s
  if (millis() - lastFirebasePush > FIREBASE_PUSH_MS) {
    lastFirebasePush = millis();
    drainKeypad();
    pushStateToFirebase("Heartbeat");
    drainKeypad();
  }

  // Telegram — only runs when a message is queued
  if (!telegramQueue.isEmpty()) {
    drainKeypad();
    sendTelegramIfQueued();
    drainKeypad();
  }
}