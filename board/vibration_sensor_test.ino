const int vibPin = 5; // DO connected to GPIO 5

void setup() {
  Serial.begin(115200);
  pinMode(vibPin, INPUT); // digital input
}

void loop() {
  int state = digitalRead(vibPin);

  Serial.println(state); // prints 1 or 0

  delay(200); // small delay for readability
}