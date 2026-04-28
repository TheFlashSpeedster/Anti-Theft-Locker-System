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
const char *WIFI_SSID = "hello123";
const char *WIFI_PASSWORD = "poco1234";

// ── Firebase Realtime Database ────────────────────────────
const String FIREBASE_HOST = "locker-system-02-default-rtdb.firebaseio.com";
const String FIREBASE_SECRET = "YtyGo92r0BzPZOyCPeHRXve6xj8T98UEhdPpyrUU";

// ── Security (loaded from Firebase at runtime) ───────────
String CORRECT_PASSWORD = "2580";     // default; overwritten by fetchConfig()

// ── Telegram Bot (loaded from Firebase at runtime) ────────
// Configure via the web dashboard Settings tab.
// Stored at: locker/config/telegram/{botToken, chatId}
String TELEGRAM_TOKEN   = "";         // fetched from Firebase on boot
String TELEGRAM_CHAT_ID = "";         // fetched from Firebase on boot

// ── Servo positions ───────────────────────────────────────
const int SERVO1_LOCKED = 0;
const int SERVO1_UNLOCKED = 90;
const int SERVO2_CLOSED = 143;
const int SERVO2_OPEN = 45;
const int TRAPDOOR_HOLD_MS = 2000;

// ── Timing ────────────────────────────────────────────────
const int AUTO_LOCK_DELAY = 5000;
const int BUZZER_DURATION = 5000;
const int VIBRATION_COOLDOWN = 10000;
const int STARTUP_GRACE_MS = 8000;
const int FIREBASE_PUSH_MS = 8000; // Heartbeat every 8s
const int FIREBASE_CMD_MS =
    1000; // Poll web commands every 1s — commands are deleted after exec so polls return null instantly

// ── Pin definitions ───────────────────────────────────────
#define SERVO1_PIN 18
#define SERVO2_PIN 19
#define BUZZER_PIN 23
#define VIBRATION_PIN 5

// ===================== KEYPAD SETUP ========================
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {{'1', '2', '3', 'A'},
                         {'4', '5', '6', 'B'},
                         {'7', '8', '9', 'C'},
                         {'*', '0', '#', 'D'}};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ===================== OBJECTS =============================
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo servo1;
Servo servo2;

// ===================== STATE VARIABLES =====================
int failedAttempts = 0;
bool lockerOpen = false;
bool alertTriggered = false;
bool vibAlertTriggered = false;
bool ntpSynced = false;
unsigned long vibLastTrigger = 0;
unsigned long systemStartTime = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastFirebaseCmd = 0;
unsigned long lastNtpRetry = 0;
long lastCommandTs = 0;
unsigned long lastConfigFetch = 0;
const int CONFIG_FETCH_MS = 60000;  // re-fetch config every 60 s
String enteredPassword = "";
// No round-robin slot needed — commands and heartbeat run on independent timers

// ── Telegram notification queue (single-slot, non-blocking) ──────────────
// Events push a message here; loop sends it between other HTTP ops.
String telegramQueue = ""; // empty = nothing pending
unsigned long lastTgramSend = 0;
const int TELEGRAM_TIMEOUT = 3000; // ms — generous but Telegram is fast

// ===================== FORWARD DECLARES ====================
void showIdleScreen();
void flipTrapdoor();
void resetAlert();
void handleCommand(String text);
void processKey(char key);
void fetchConfig();

// Poll the keypad once and immediately process any key press.
// Safe to call in the main loop and before/after blocking HTTP ops
// because keypad.getKey() uses millis() which works correctly here.
void drainKeypad() {
  char k = keypad.getKey();
  if (k) processKey(k);
}

// Queue a Telegram message (only stores; doesn't send immediately)
void queueTelegram(String msg) {
  if (telegramQueue.isEmpty()) // don't overwrite an unsent message
    telegramQueue = msg;
}

// Send queued Telegram message if one is waiting.
// Retries on next loop if WiFi is down or HTTP fails.
// ===================== FETCH CONFIG FROM FIREBASE ==========
// Reads locker/config/{password, telegram} and updates runtime variables.
// Called once at boot and every CONFIG_FETCH_MS thereafter.
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = "https://" + FIREBASE_HOST + "/locker/config.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(2000);
  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    http.end();
    DynamicJsonDocument doc(512);
    if (!deserializeJson(doc, payload)) {
      // Locker PIN
      if (doc.containsKey("password") && !doc["password"].isNull()) {
        String p = doc["password"].as<String>();
        if (p.length() >= 4) {
          CORRECT_PASSWORD = p;
          Serial.println("[CFG] Locker PIN updated from Firebase.");
        }
      }
      // Telegram credentials
      if (doc.containsKey("telegram") && doc["telegram"].is<JsonObject>()) {
        JsonObject tg = doc["telegram"].as<JsonObject>();
        if (tg.containsKey("botToken") && !tg["botToken"].isNull()) {
          String tok = tg["botToken"].as<String>();
          if (tok.length() > 10) {
            TELEGRAM_TOKEN = tok;
            Serial.println("[CFG] Telegram token updated from Firebase.");
          }
        }
        if (tg.containsKey("chatId") && !tg["chatId"].isNull()) {
          String cid = tg["chatId"].as<String>();
          if (cid.length() > 0) {
            TELEGRAM_CHAT_ID = cid;
            Serial.println("[CFG] Telegram chat ID updated from Firebase.");
          }
        }
      }
    }
  } else {
    http.end();
    Serial.printf("[CFG] fetchConfig failed (HTTP %d)\n", code);
  }
}

void sendTelegramIfQueued() {
  if (telegramQueue.isEmpty()) return;
  if (TELEGRAM_TOKEN.isEmpty()) return; // not configured yet
  if (WiFi.status() != WL_CONNECTED) return;           // retry next loop — DON'T clear

  // Small settle delay after heavy Firebase activity to let TCP stack recover
  delay(200);

  HTTPClient http;
  String url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
  http.begin(url);
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
    Serial.printf("[TGRAM] OK (HTTP %d): %s\n", code, telegramQueue.c_str());
    telegramQueue = "";   // clear ONLY on success
    lastTgramSend = millis();
  } else {
    Serial.printf("[TGRAM] FAILED (HTTP %d) — will retry next loop\n", code);
    // Keep queue so next loop iteration retries
  }
}

// ===================== NTP (NON-BLOCKING) ==================
// Quick attempt at boot — does NOT block more than 3s
void syncTimeQuick() {
  configTime(19800, 0, "time.google.com", "pool.ntp.org",
             "time.cloudflare.com");
  struct tm timeinfo;
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 3) {
    delay(1000);
    Serial.print(".");
    retry++;
  }
  if (getLocalTime(&timeinfo)) {
    char buf[30];
    strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
    Serial.println("\nNTP synced: " + String(buf));
    ntpSynced = true;
  } else {
    Serial.println("\nNTP pending — will retry in background.");
  }
}

// Called periodically in loop until synced
void retryNtpBackground() {
  if (ntpSynced)
    return;
  configTime(19800, 0, "time.google.com", "pool.ntp.org",
             "time.cloudflare.com");
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char buf[30];
    strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
    Serial.println("[NTP] Background sync OK: " + String(buf));
    ntpSynced = true;
  }
}

String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return "Syncing...";
  char buf[30];
  strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
  return String(buf);
}

// ===================== FIREBASE HELPERS ====================
void pushLogToFirebase(String type, String message) {
  if (WiFi.status() != WL_CONNECTED)
    return;
  DynamicJsonDocument doc(256);
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = getCurrentTime();
  doc["ts"] = millis();
  String body;
  serializeJson(doc, body);
  HTTPClient http;
  String url = "https://" + FIREBASE_HOST + "/locker/logs/" + String(millis()) +
               ".json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(1500);
  http.addHeader("Content-Type", "application/json");
  http.PUT(body);
  http.end();
}

void pushStateToFirebase(String lastAction) {
  if (WiFi.status() != WL_CONNECTED)
    return;
  DynamicJsonDocument doc(512);
  doc["isLocked"] = !lockerOpen;
  doc["isSecretCompartmentOpen"] = (servo2.read() == SERVO2_OPEN);
  doc["failedAttempts"] = failedAttempts;
  doc["buzzerOn"] = (digitalRead(BUZZER_PIN) == HIGH);
  doc["isBreached"] = alertTriggered;
  doc["vibrationDetected"] = vibAlertTriggered;
  doc["lastAction"] = lastAction;
  doc["lastSeen"] = getCurrentTime();
  doc["ts"] =
      ntpSynced ? (long)time(nullptr) : 0L; // epoch s (for age calc after NTP)
  doc["uptimeMs"] =
      (long)millis(); // always changes — React uses for live detection

  String body;
  serializeJson(doc, body);
  HTTPClient http;
  String url = "https://" + FIREBASE_HOST +
               "/locker/status.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(1000); // tight timeout — Firebase usually responds <500ms
  http.addHeader("Content-Type", "application/json");
  http.PATCH(body);
  http.end();
}

void checkFirebaseCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "https://" + FIREBASE_HOST + "/locker/command.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(300); // short timeout — keeps keypad responsive
  int code = http.GET();
  if (code != 200) { http.end(); return; }

  String payload = http.getString();
  http.end();

  // No pending command — return immediately (fast path after deletion)
  if (payload == "null" || payload.isEmpty()) return;

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, payload)) return;

  long ts  = doc["ts"].as<long>();
  String cmd = doc["cmd"].as<String>();
  Serial.printf("[CMD] ts=%ld lastTs=%ld cmd=%s\n", ts, lastCommandTs, cmd.c_str());

  if (ts <= lastCommandTs) {
    // Stale command still in Firebase — delete it to stop log spam
    Serial.println("[CMD] Stale — deleting from Firebase");
    HTTPClient httpDel;
    httpDel.begin(url);
    httpDel.setTimeout(300);
    httpDel.sendRequest("DELETE");
    httpDel.end();
    return;
  }

  // New command — execute then immediately delete so it won't re-fire
  lastCommandTs = ts;
  Serial.println("[WEB CMD] Executing: " + cmd);
  handleCommand(cmd);

  // Delete the executed command node from Firebase
  HTTPClient httpDel;
  httpDel.begin(url);
  httpDel.setTimeout(300);
  httpDel.sendRequest("DELETE");
  httpDel.end();
  Serial.println("[CMD] Cleared from Firebase");
}

// ===================== SYSTEM SCREENS ======================
void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1);
  lcd.print("  Enter Pass: * ");
}

// ===================== TRAPDOOR ============================
void flipTrapdoor() {
  servo2.write(SERVO2_OPEN);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" Securing Items ");
  lcd.setCursor(0, 1);
  lcd.print(" Chamber Active ");
  delay(TRAPDOOR_HOLD_MS);
  servo2.write(SERVO2_CLOSED);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" Items Secured! ");
  lcd.setCursor(0, 1);
  lcd.print(" Chamber Sealed ");
  delay(1500);
}

// ===================== LOCKER OPEN =========================
void openLocker() {
  lockerOpen = true;
  servo1.write(SERVO1_UNLOCKED);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  ACCESS GRANTED");
  lcd.setCursor(0, 1);
  lcd.print("  Locker Opened!");
  Serial.println("[EVENT] Door opened via keypad");
  pushStateToFirebase("Door opened via keypad");
  pushLogToFirebase("success", "Access granted — door opened via keypad");

  // ── Prompt user to press A to lock ────────────────────────
  delay(1200); // brief "ACCESS GRANTED" display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" Door is Open   ");
  lcd.setCursor(0, 1);
  lcd.print(" Press A to Lock");
  Serial.println("[EVENT] Waiting for A key to lock...");

  // ── Wait: A on keypad OR remote /lock from dashboard ──────
  unsigned long lastCmdCheck = millis();
  bool remotelyLocked = false;
  while (true) {
    char k = keypad.getKey();
    if (k == 'A') break;                       // physical lock key

    // Poll Firebase commands every 500ms while door is open
    if (millis() - lastCmdCheck > 500) {
      lastCmdCheck = millis();
      checkFirebaseCommand();                  // handles /lock → sets lockerOpen=false
      if (!lockerOpen) { remotelyLocked = true; break; }
    }
    delay(50);
  }

  // ── Lock the servo (skip if remote /lock already did it) ──
  if (!remotelyLocked) {
    servo1.write(SERVO1_LOCKED);
    lockerOpen = false;
    failedAttempts = 0;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  Locker Locked ");
    lcd.setCursor(0, 1);
    lcd.print("                ");
    delay(1200);
    showIdleScreen();
    Serial.println("[EVENT] Door locked by A key");
    pushStateToFirebase("Door locked via keypad (A)");
    pushLogToFirebase("info", "Door locked via keypad (A)");
  } else {
    // Remote /lock already updated servo + LCD + Firebase via handleCommand()
    failedAttempts = 0;
    Serial.println("[EVENT] Door locked remotely while open");
  }
}


// ===================== SECURITY ALERT ======================
void triggerSecurityAlert(String reason) {
  if (alertTriggered)
    return;
  alertTriggered = true;
  digitalWrite(BUZZER_PIN, HIGH); // stays ON until resetAlert() or correct PIN
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1);
  lcd.print(reason.substring(0, 16));
  Serial.println("[ALERT] " + reason +
                 " — Trapdoor deploying. Buzzer latched ON.");
  // Compose a specific Telegram message based on breach reason
  String tgramMsg;
  if (reason.indexOf("Wrong Pass") >= 0 || reason.indexOf("Wrong PIN") >= 0) {
    tgramMsg = "🔐 <b>SECURITY BREACH — Wrong PIN</b>\n"
               "3 consecutive failed unlock attempts detected.\n"
               "\u23f0 Buzzer active | Trapdoor deployed\n"
               "\u2022 Enter correct PIN on keypad, OR\n"
               "\u2022 Reset via web dashboard.";
  } else if (reason.indexOf("Tamper") >= 0 || reason.indexOf("Vibration") >= 0) {
    tgramMsg = "⚡ <b>SECURITY BREACH — Physical Tamper</b>\n"
               "Vibration sensor (SW-420) triggered!\n"
               "Possible forced entry or impact detected.\n"
               "\u23f0 Buzzer active | Trapdoor deployed\n"
               "\u2022 Enter correct PIN on keypad, OR\n"
               "\u2022 Reset via web dashboard.";
  } else {
    tgramMsg = "🚨 <b>SECURITY BREACH</b>\n"
               "Reason: " + reason + "\n"
               "\u23f0 Buzzer active | Trapdoor deployed\n"
               "Reset via web or correct PIN.";
  }
  queueTelegram(tgramMsg);
  pushStateToFirebase("ALERT: " + reason);
  pushLogToFirebase("critical",
                    "ALERT: " + reason + " — buzzer latched, reset required");
  flipTrapdoor();
  // Keep showing alert on LCD — stays until resetAlert() is called
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1);
  lcd.print(reason.substring(0, 16));
  // Buzzer stays ON — only resetAlert() or correct PIN will stop it
}

// ===================== RESET ALERT =========================
void resetAlert() {
  alertTriggered = false;
  vibAlertTriggered = false;
  servo2.write(SERVO2_CLOSED);
  failedAttempts = 0;
  digitalWrite(BUZZER_PIN, LOW);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" System Reset   ");
  delay(1500);
  showIdleScreen();
  Serial.println("[EVENT] System RESET — all alerts cleared");
  queueTelegram(
      "✅ <b>Alert Cleared</b>\nAether Sentinel reset. System secure.");
  pushStateToFirebase("System RESET");
  pushLogToFirebase("info", "System reset — all alerts cleared");
}

// ===================== HANDLE COMMAND ======================
// Called by Firebase (website) or directly by keypad
void handleCommand(String text) {
  text.trim();
  String action = "";

  if (text == "/unlock") {
    servo1.write(SERVO1_UNLOCKED);
    lockerOpen = true;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Remote UNLOCK  ");
    lcd.setCursor(0, 1);
    lcd.print(" Door Open!     ");
    action = "Door UNLOCKED via web";

  } else if (text == "/lock") {
    servo1.write(SERVO1_LOCKED);
    lockerOpen = false;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Remote LOCK    ");
    lcd.setCursor(0, 1);
    lcd.print(" Door Locked!   ");
    delay(1500);
    showIdleScreen();
    action = "Door LOCKED via web";

  } else if (text == "/trapdoor_open") {
    servo2.write(SERVO2_OPEN);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Trapdoor OPEN  ");
    lcd.setCursor(0, 1);
    lcd.print(" Manual Control ");
    action = "Trapdoor OPENED manually";

  } else if (text == "/trapdoor_close") {
    servo2.write(SERVO2_CLOSED);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Trapdoor CLOSED");
    lcd.setCursor(0, 1);
    lcd.print(" Manual Control ");
    delay(1500);
    showIdleScreen();
    action = "Trapdoor CLOSED manually";

  } else if (text == "/trapdoor_flip") {
    flipTrapdoor();
    showIdleScreen();
    action = "Trapdoor flipped and SEALED";

  } else if (text == "/buzzer_on") {
    alertTriggered = true; // latch the breach state too
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" BUZZER ON      ");
    lcd.setCursor(0, 1);
    lcd.print(" ALERT ACTIVE   ");
    digitalWrite(BUZZER_PIN, HIGH);
    // Stays ON until /buzzer_off or /reset
    queueTelegram("🌐 <b>REMOTE ALERT — Web Trigger</b>\n"
                  "Alarm activated manually via web dashboard.\n"
                  "\u23f0 Buzzer latched ON\n"
                  "\u2022 Stop via web dashboard Reset button, OR\n"
                  "\u2022 Enter correct PIN on keypad.");
    action = "Buzzer LATCHED ON — web alert active";

  } else if (text == "/buzzer_off") {
    digitalWrite(BUZZER_PIN, LOW);
    showIdleScreen();
    action = "Buzzer turned OFF";

  } else if (text == "/reset") {
    resetAlert();
    action = "System RESET — all alerts cleared";
    return; // resetAlert already pushes

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
// Key map:
//   *        → Clear / cancel entry
//   0–9      → Digit input
//   D        → Backspace (Delete last digit)
//   #        → Submit PIN (Enter/Confirm)
//   A        → Lock door (only active while door is open)
//   B        → Reset alert / silence buzzer
//   C        → (unused — reserved)
void processKey(char key) {
  Serial.print("[KEY] ");
  Serial.println(key);

  // ─ * : Clear entry ─────────────────────────────────────────────
  if (key == '*') {
    enteredPassword = "";
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Enter Password: ");
    lcd.setCursor(0, 1);
    return;
  }

  // ─ B : Reset alert / silence buzzer ────────────────────────
  if (key == 'B') {
    if (alertTriggered) {
      resetAlert();
      Serial.println("[KEY] Alert reset via B key");
    }
    enteredPassword = "";
    return;
  }

  // ─ # : Submit PIN ─────────────────────────────────────────
  if (key == '#') {
    lcd.clear();
    lcd.setCursor(0, 0);
    if (enteredPassword == CORRECT_PASSWORD) {
      failedAttempts = 0;
      vibAlertTriggered = false;
      if (alertTriggered)
        resetAlert();
      openLocker();
    } else {
      failedAttempts++;
      lcd.print("Wrong Password! ");
      lcd.setCursor(0, 1);
      lcd.print("Attempt ");
      lcd.print(failedAttempts);
      lcd.print("/3      ");
      Serial.println("[KEY] Wrong PIN — attempt " + String(failedAttempts) + "/3");
      pushStateToFirebase("Wrong password attempt " + String(failedAttempts) + "/3");
      pushLogToFirebase("warning", "Wrong PIN — attempt " + String(failedAttempts) + "/3");
      delay(500);
      if (failedAttempts >= 3) {
        triggerSecurityAlert("3x Wrong Pass!");
        failedAttempts = 0;
      } else {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Enter Password: ");
        lcd.setCursor(0, 1);
      }
    }
    enteredPassword = "";
    return;
  }

  // ─ D : Backspace ───────────────────────────────────────────
  if (key == 'D') {
    if (enteredPassword.length() > 0)
      enteredPassword.remove(enteredPassword.length() - 1);
  } else if (key != 'A' && key != 'B' && key != 'C') {
    // ─ 0–9 : Digit accumulation (A/B/C not digits) ─────────────
    enteredPassword += key;
  }

  lcd.setCursor(0, 1);
  String masked = "";
  for (unsigned int i = 0; i < enteredPassword.length(); i++)
    masked += "*";
  while (masked.length() < 16)
    masked += " ";
  lcd.print(masked);
}

// ===================== SETUP ===============================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Anti-Theft Locker System starting...");

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1);
  lcd.print("  LOCKER SYSTEM ");
  delay(1500);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, INPUT_PULLDOWN);
  digitalWrite(BUZZER_PIN, LOW);

  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(SERVO1_LOCKED);
  servo2.write(SERVO2_CLOSED);

  // (Keypad polled directly in loop via keypad.getKey() — no ISR needed)

  // WiFi
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi ");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 1);
    lcd.print("WiFi Connected! ");
    Serial.println("\n[WiFi] IP: " + WiFi.localIP().toString());

    // ── Immediate boot signal (before NTP so website shows Live right away)
    pushStateToFirebase("Booting...");

    // ── Fetch config from Firebase (PIN + Telegram creds)
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Loading Config ");
    fetchConfig();
    lastConfigFetch = millis();

    // Quick NTP — max 3s, then continue
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Syncing Time.. ");
    syncTimeQuick();

    pushStateToFirebase("System ONLINE");
    pushLogToFirebase("info", "System initialized — ESP32 online");
    queueTelegram("🟢 <b>Aether Sentinel Online</b>\nIP: " +
                  WiFi.localIP().toString());
  } else {
    lcd.setCursor(0, 1);
    lcd.print("WiFi FAILED!    ");
    Serial.println("\n[WiFi] Connection failed — running offline");
    pushLogToFirebase("warning", "Boot with no WiFi — offline mode");
  }

  delay(1000);
  systemStartTime = millis();
  showIdleScreen();
  Serial.println("[BOOT] Ready.");
}

// ===================== MAIN LOOP ===========================
void loop() {

  // ---- 1. KEYPAD — drain full ring buffer every loop ----
  drainKeypad();

  // ---- 2. VIBRATION SENSOR ----
  if (millis() - systemStartTime > STARTUP_GRACE_MS) {
    if (digitalRead(VIBRATION_PIN) == HIGH) {
      int highCount = 0;
      for (int i = 0; i < 5; i++) {
        delay(20);
        if (digitalRead(VIBRATION_PIN) == HIGH)
          highCount++;
      }
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

  // ---- 3. BACKGROUND NTP RETRY (until synced) ----
  if (!ntpSynced && millis() - lastNtpRetry > 30000) {
    lastNtpRetry = millis();
    retryNtpBackground();
  }

  // ---- 4a. CONFIG REFRESH — every 60s ----
  if (millis() - lastConfigFetch > CONFIG_FETCH_MS) {
    lastConfigFetch = millis();
    fetchConfig();
  }

  // ---- 4b. FIREBASE: Commands — independent timer, 500ms interval ----
  //   Commands are decoupled from the heartbeat so they are never blocked
  //   waiting for the push slot. Max web-to-hardware latency ≈ 500ms.
  if (millis() - lastFirebaseCmd > FIREBASE_CMD_MS) {
    lastFirebaseCmd = millis();
    drainKeypad();
    checkFirebaseCommand();
    drainKeypad();
  }

  // ---- 5. FIREBASE: Heartbeat — every 8s ----
  if (millis() - lastFirebasePush > FIREBASE_PUSH_MS) {
    lastFirebasePush = millis();
    drainKeypad();
    pushStateToFirebase("Heartbeat");
    drainKeypad();
  }

  // ---- 6. TELEGRAM: send queued notification ----
  // Only runs when an event (breach/reset/boot) has queued a message.
  // Keypad ring buffer captures any keypresses during the HTTP call.
  if (!telegramQueue.isEmpty()) {
    drainKeypad();
    sendTelegramIfQueued();
    drainKeypad();
  }
}