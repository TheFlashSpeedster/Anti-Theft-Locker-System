/*
 ============================================================
  KEYPAD TEST SKETCH — Anti-Theft Locker System
  Tests the 4x4 membrane keypad via Serial Monitor.
  ─────────────────────────────────────────────
  Pins (same as main code):
    ROW pins : 13, 12, 14, 27
    COL pins : 26, 25, 33, 32
  Upload, open Serial Monitor at 115200 baud, press keys.
 ============================================================
*/

#include <Keypad.h>

// ── Keypad layout ─────────────────────────────────────────
const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

// ── Pin mapping (matches your main code) ──────────────────
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ── Press counter for quick validation ────────────────────
int pressCount = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n========================================");
  Serial.println("  4x4 KEYPAD TEST — Press any key");
  Serial.println("========================================");
  Serial.println("Layout:");
  Serial.println("  [1][2][3][A]");
  Serial.println("  [4][5][6][B]");
  Serial.println("  [7][8][9][C]");
  Serial.println("  [*][0][#][D]");
  Serial.println("----------------------------------------");
}

void loop() {
  char key = keypad.getKey();

  if (key) {
    pressCount++;
    Serial.print("Key #");
    Serial.print(pressCount);
    Serial.print(" pressed: [ ");
    Serial.print(key);
    Serial.println(" ]");
  }
}
