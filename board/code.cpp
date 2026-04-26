/*
 ============================================================
  ANTI-THEFT LOCKER SYSTEM - ESP32
  Firebase Realtime Database + Telegram Bot
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

// ── Telegram ──────────────────────────────────────────────
const String BOT_TOKEN = "8510354203:AAGs0hyHpmpxIRAoA1gjj6-YbP8vMG_N_8c";
const String CHAT_ID = "5524391658";

// ── Firebase Realtime Database ────────────────────────────
// Go to Firebase Console → your project → Realtime Database
// Copy the database URL (e.g.
// https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app)
const String FIREBASE_HOST = "locker-system-02-default-rtdb.firebaseio.com";
const String FIREBASE_SECRET =
    "YtyGo92r0BzPZOyCPeHRXve6xj8T98UEhdPpyrUU"; // Project settings → Service
                                                // accounts → Database secrets

// ── Security ──────────────────────────────────────────────
const String CORRECT_PASSWORD = "2580";

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
const int STARTUP_GRACE_MS = 10000;
const int TELEGRAM_POLL_MS  = 3000;  // Poll Telegram every 3s
const int FIREBASE_PUSH_MS  = 8000;  // Heartbeat push every 8s (events push immediately)
const int FIREBASE_CMD_MS   = 2000;  // Check website commands every 2s

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
unsigned long vibLastTrigger = 0;
unsigned long systemStartTime = 0;
unsigned long lastTelegramPoll = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastFirebaseCmd = 0;
long lastUpdateId = 0;
long controlMessageId = 0;
long lastCommandTs = 0; // Timestamp of last executed website command
String enteredPassword = "";
uint8_t httpSlot = 0;   // Round-robin: 0=Firebase push, 1=Telegram, 2=Firebase cmd

// ---- Keypad interrupt via timer ----
volatile char keypadBuffer = 0;
volatile bool keypadReady = false;
hw_timer_t *keypadTimer = NULL;
portMUX_TYPE keypadMux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR onKeypadTimer() {
  portENTER_CRITICAL_ISR(&keypadMux);
  char k = keypad.getKey();
  if (k) {
    keypadBuffer = k;
    keypadReady = true;
  }
  portEXIT_CRITICAL_ISR(&keypadMux);
}

// ===================== FORWARD DECLARES ====================
void showIdleScreen();
void flipTrapdoor();
void resetAlert();
void handleCommand(String text);
void pushStateToFirebase(String lastAction);

// ===================== NTP TIME ============================
void syncTime() {
  configTime(19800, 0, "time.google.com", "pool.ntp.org",
             "time.cloudflare.com");
  struct tm timeinfo;
  Serial.print("Waiting for NTP");
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 30) {
    delay(1000);
    Serial.print(".");
    retry++;
  }
  if (getLocalTime(&timeinfo)) {
    char buf[30];
    strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
    Serial.println("\nTime synced: " + String(buf));
  } else {
    Serial.println("\nNTP failed — will retry later.");
  }
}

String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    configTime(19800, 0, "time.google.com", "pool.ntp.org",
               "time.cloudflare.com");
    if (!getLocalTime(&timeinfo))
      return "Syncing...";
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
  return String(buf);
}

// ===================== FIREBASE HELPERS ====================

// Push current system state to Firebase locker/status
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
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  String url = "https://" + FIREBASE_HOST +
               "/locker/status.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.PATCH(body); // PATCH only updates provided fields, keeps others
  http.end();
}

// Push a log event to Firebase locker/logs/<timestamp>
void pushLogToFirebase(String type, String message) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  DynamicJsonDocument doc(256);
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = getCurrentTime();
  doc["ts"] = millis(); // for sorting on React side
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  // Use PUT with a timestamp key so each log is unique
  String url = "https://" + FIREBASE_HOST + "/locker/logs/" + String(millis()) +
               ".json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.PUT(body);
  http.end();
}

// Poll Firebase locker/command for commands sent by the website
void checkFirebaseCommand() {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = "https://" + FIREBASE_HOST +
               "/locker/command.json?auth=" + FIREBASE_SECRET;
  http.begin(url);
  http.setTimeout(1500); // Short timeout — Firebase is fast on local WiFi
  int code = http.GET();
  if (code != 200) {
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  if (payload == "null" || payload.isEmpty())
    return;

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, payload))
    return;

  long ts = doc["ts"].as<long>();
  String cmd = doc["cmd"].as<String>();

  // Only execute if this is a NEW command (newer timestamp)
  if (ts <= lastCommandTs)
    return;
  lastCommandTs = ts;

  Serial.println("Firebase CMD: " + cmd);
  handleCommand(cmd);
}

// ===================== BUILD KEYBOARD JSON =================
String buildKeyboard() {
  return "{\"inline_keyboard\":["
         "[{\"text\":\"🔓 Unlock Door\",\"callback_data\":\"/unlock\"},"
         "{\"text\":\"🔒 Lock Door\",\"callback_data\":\"/lock\"}],"
         "[{\"text\":\"🚪 Trapdoor "
         "Open\",\"callback_data\":\"/trapdoor_open\"},"
         "{\"text\":\"🚪 Trapdoor "
         "Close\",\"callback_data\":\"/trapdoor_close\"}],"
         "[{\"text\":\"🔄 Trapdoor Flip "
         "(Auto)\",\"callback_data\":\"/trapdoor_flip\"}],"
         "[{\"text\":\"🔔 Buzzer ON\",\"callback_data\":\"/buzzer_on\"},"
         "{\"text\":\"🔕 Buzzer OFF\",\"callback_data\":\"/buzzer_off\"}],"
         "[{\"text\":\"📋 Status\",\"callback_data\":\"/status\"},"
         "{\"text\":\"✅ Reset System\",\"callback_data\":\"/reset\"}]"
         "]}";
}

// ===================== SEND CONTROL MESSAGE ================
void sendControlMessage(String text) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  DynamicJsonDocument body(2048);
  body["chat_id"] = CHAT_ID;
  body["text"] = text;
  DynamicJsonDocument kbDoc(1024);
  deserializeJson(kbDoc, buildKeyboard());
  body["reply_markup"] = kbDoc.as<JsonObject>();
  String bodyStr;
  serializeJson(body, bodyStr);

  HTTPClient http;
  http.begin("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage");
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(bodyStr);
  if (code == 200) {
    String response = http.getString();
    DynamicJsonDocument resp(1024);
    deserializeJson(resp, response);
    controlMessageId = resp["result"]["message_id"].as<long>();
  }
  http.end();
}

// ===================== UPDATE CONTROL MESSAGE ==============
void updateControlMessage(String text) {
  if (WiFi.status() != WL_CONNECTED)
    return;
  if (controlMessageId == 0) {
    sendControlMessage(text);
    return;
  }

  DynamicJsonDocument body(2048);
  body["chat_id"] = CHAT_ID;
  body["message_id"] = controlMessageId;
  body["text"] = text;
  DynamicJsonDocument kbDoc(1024);
  deserializeJson(kbDoc, buildKeyboard());
  body["reply_markup"] = kbDoc.as<JsonObject>();
  String bodyStr;
  serializeJson(body, bodyStr);

  HTTPClient http;
  http.begin("https://api.telegram.org/bot" + BOT_TOKEN + "/editMessageText");
  http.addHeader("Content-Type", "application/json");
  http.POST(bodyStr);
  http.end();
}

// ===================== ANSWER CALLBACK QUERY ===============
void answerCallbackQuery(String callbackQueryId) {
  if (WiFi.status() != WL_CONNECTED)
    return;
  HTTPClient http;
  http.begin("https://api.telegram.org/bot" + BOT_TOKEN +
             "/answerCallbackQuery?callback_query_id=" + callbackQueryId);
  http.GET();
  http.end();
}

// ===================== BUILD STATUS TEXT ===================
String buildStatusText(String lastAction) {
  String s = "🔐 ANTI-THEFT LOCKER CONTROL\n";
  s += "━━━━━━━━━━━━━━━━━━━━\n";
  s += "🚪 Door:   " + String(lockerOpen ? "OPEN 🟢" : "LOCKED 🔴") + "\n";
  s += "🚨 Alert:  " + String(alertTriggered ? "ACTIVE 🔴" : "None 🟢") + "\n";
  s += "❌ Failed: " + String(failedAttempts) + "/3\n";
  s += "🕐 Time:   " + getCurrentTime() + "\n";
  s += "━━━━━━━━━━━━━━━━━━━━\n";
  s += "▶ " + lastAction;
  return s;
}

// ===================== HANDLE COMMAND ======================
void handleCommand(String text) {
  text.trim();
  Serial.println("CMD: " + text);
  String action = "";

  if (text == "/unlock") {
    servo1.write(SERVO1_UNLOCKED);
    lockerOpen = true;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Remote UNLOCK  ");
    lcd.setCursor(0, 1);
    lcd.print(" Door Open!     ");
    action = "Door UNLOCKED via remote";

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
    action = "Door LOCKED via remote";

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
    action = "Trapdoor flip started...";
    flipTrapdoor();
    showIdleScreen();
    action = "Trapdoor flipped and SEALED";

  } else if (text == "/buzzer_on") {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" BUZZER ON      ");
    lcd.setCursor(0, 1);
    lcd.print(" Remote Trigger ");
    action = "Buzzer ON — stopping in 5s...";
    digitalWrite(BUZZER_PIN, HIGH);
    delay(BUZZER_DURATION);
    digitalWrite(BUZZER_PIN, LOW);
    showIdleScreen();
    action = "Buzzer stopped automatically";

  } else if (text == "/buzzer_off") {
    digitalWrite(BUZZER_PIN, LOW);
    showIdleScreen();
    action = "Buzzer turned OFF";

  } else if (text == "/reset") {
    resetAlert();
    action = "System RESET — all alerts cleared";

  } else if (text == "/status") {
    action = "Status refreshed at " + getCurrentTime();

  } else {
    action = "Unknown command";
  }

  // Sync to both Telegram and Firebase
  updateControlMessage(buildStatusText(action));
  pushStateToFirebase(action);
  pushLogToFirebase("info", action);
}

// ===================== TELEGRAM POLL =======================
void checkTelegramCommands() {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = "https://api.telegram.org/bot" + BOT_TOKEN +
               "/getUpdates?offset=" + String(lastUpdateId + 1) +
               "&timeout=1&allowed_updates=[\"message\",\"callback_query\"]";
  http.begin(url);
  http.setTimeout(2000); // Telegram can be slower, 2s is safe
  int httpCode = http.GET();
  if (httpCode != 200) {
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  DynamicJsonDocument doc(8192);
  if (deserializeJson(doc, payload))
    return;

  JsonArray results = doc["result"].as<JsonArray>();
  if (results.size() == 0)
    return;

  for (JsonObject update : results) {
    long updateId = update["update_id"].as<long>();
    if (updateId <= lastUpdateId)
      continue;
    lastUpdateId = updateId;

    if (update.containsKey("callback_query")) {
      String cbId = update["callback_query"]["id"].as<String>();
      String fromChatId =
          update["callback_query"]["message"]["chat"]["id"].as<String>();
      String cbData = update["callback_query"]["data"].as<String>();
      answerCallbackQuery(cbId);
      if (fromChatId != CHAT_ID)
        continue;
      handleCommand(cbData);

    } else if (update.containsKey("message")) {
      String fromChatId = update["message"]["chat"]["id"].as<String>();
      if (fromChatId != CHAT_ID)
        continue;
      String text = update["message"]["text"].as<String>();
      handleCommand(text);
    }
  }
}

// ===================== IDLE SCREEN =========================
void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1);
  lcd.print("  Enter Pass: * ");
}

// ===================== TRAPDOOR FLIP =======================
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
  pushStateToFirebase("Door opened via keypad");
  pushLogToFirebase("success", "Access granted — door opened via keypad");
  updateControlMessage(buildStatusText("Door opened via keypad"));
  delay(AUTO_LOCK_DELAY);
  servo1.write(SERVO1_LOCKED);
  lockerOpen = false;
  failedAttempts = 0;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  Locker Locked ");
  lcd.setCursor(0, 1);
  lcd.print("  Enter Password");
  delay(1500);
  showIdleScreen();
  pushStateToFirebase("Door auto-locked after opening");
  pushLogToFirebase("info", "Door auto-locked after timeout");
  updateControlMessage(buildStatusText("Door auto-locked after opening"));
}

// ===================== SECURITY ALERT ======================
void triggerSecurityAlert(String reason) {
  if (alertTriggered)
    return;
  alertTriggered = true;
  digitalWrite(BUZZER_PIN, HIGH);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1);
  lcd.print(reason.substring(0, 16));
  pushStateToFirebase("ALERT: " + reason);
  pushLogToFirebase("critical",
                    "ALERT TRIGGERED: " + reason + " — Trapdoor deployed");
  updateControlMessage(
      buildStatusText("🚨 ALERT: " + reason + " — Chamber ACTIVATED!"));
  flipTrapdoor();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" !! ALERT !!    ");
  lcd.setCursor(0, 1);
  lcd.print(reason.substring(0, 16));
  delay(BUZZER_DURATION);
  digitalWrite(BUZZER_PIN, LOW);
  updateControlMessage(buildStatusText("🚨 ALERT active — tap Reset to clear"));
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
  pushStateToFirebase("System RESET");
  pushLogToFirebase("info", "System reset — all alerts cleared");
}

// ===================== PROCESS KEYPAD KEY ==================
void processKey(char key) {
  Serial.print("Key: ");
  Serial.println(key);

  if (key == '*') {
    enteredPassword = "";
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Enter Password: ");
    lcd.setCursor(0, 1);
    return;
  }

  if (key == 'B') {
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
      pushStateToFirebase("Wrong password attempt " + String(failedAttempts) +
                          "/3");
      pushLogToFirebase("warning", "Wrong PIN entered — attempt " +
                                       String(failedAttempts) + "/3");
      updateControlMessage(buildStatusText("Wrong password attempt " +
                                           String(failedAttempts) + "/3"));
      delay(1200);
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

  if (key == 'D') {
    if (enteredPassword.length() > 0)
      enteredPassword.remove(enteredPassword.length() - 1);
  } else if (key != 'A' && key != 'C') {
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

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("  ANTI-THEFT    ");
  lcd.setCursor(0, 1);
  lcd.print("  LOCKER SYSTEM ");
  delay(2000);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, INPUT_PULLDOWN);
  digitalWrite(BUZZER_PIN, LOW);

  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(SERVO1_LOCKED);
  servo2.write(SERVO2_CLOSED);

  // ---- Keypad timer: scan every 20ms (ESP32 core v3.x API) ----
  keypadTimer = timerBegin(1000000); // 1MHz timer (1µs resolution)
  timerAttachInterrupt(keypadTimer, &onKeypadTimer);
  timerAlarm(keypadTimer, 20000, true, 0); // 20,000µs = 20ms, auto-reload

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
    Serial.println("\nWiFi IP: " + WiFi.localIP().toString());
    syncTime();
    pushStateToFirebase("System ONLINE");
    pushLogToFirebase("info", "System initialized — ESP32 online");
    sendControlMessage(buildStatusText("System ONLINE — ready"));
  } else {
    lcd.setCursor(0, 1);
    lcd.print("WiFi FAILED!    ");
    Serial.println("\nWiFi failed.");
  }

  delay(2000);
  systemStartTime = millis();
  showIdleScreen();
}

// ===================== MAIN LOOP ===========================
void loop() {

  // ---- 1. KEYPAD — read from timer ISR buffer ----
  if (keypadReady) {
    char k;
    portENTER_CRITICAL(&keypadMux);
    k = keypadBuffer;
    keypadReady = false;
    portEXIT_CRITICAL(&keypadMux);
    processKey(k);
  }

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
          Serial.println("HIGH IMPACT DETECTED!");
          triggerSecurityAlert("Tamper Detected!");
        }
      }
    }
  }



  // ---- 4. HTTP ROUND-ROBIN — one HTTP op per loop, staggered ----
  // This prevents Telegram + Firebase blocking simultaneously (was causing 4s+ freezes)
  httpSlot = (httpSlot + 1) % 3;

  if (httpSlot == 0) {
    // Firebase heartbeat (events already push immediately on change)
    if (millis() - lastFirebasePush > FIREBASE_PUSH_MS) {
      lastFirebasePush = millis();
      pushStateToFirebase("Heartbeat");
    }
  } else if (httpSlot == 1) {
    // Telegram poll
    if (millis() - lastTelegramPoll > TELEGRAM_POLL_MS) {
      lastTelegramPoll = millis();
      checkTelegramCommands();
    }
  } else {
    // Firebase command check (website → ESP32)
    if (millis() - lastFirebaseCmd > FIREBASE_CMD_MS) {
      lastFirebaseCmd = millis();
      checkFirebaseCommand();
    }
  }
}