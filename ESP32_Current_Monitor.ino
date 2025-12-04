#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

Adafruit_ADS1115 ads;

// WiFi credentials
const char* ssid = "Jack's";
const char* password = "12345678";

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

const int SAMPLE_COUNT = 200;
const int SAMPLE_DELAY_US = 500;

const float NO_SIGNAL_THRESHOLD = 0.01;  
const float DROP_THRESHOLD = 0.05;       

// Relay pins (active LOW)
#define RELAY1 25
#define RELAY2 26
#define RELAY3 27   // NEW

// Baseline (set once)
float baseA0 = -1;
float baseA1 = -1;
float baseA3 = -1;   // NEW

// Flags (stay true after cut)
bool cutA0 = false;
bool cutA1 = false;
bool cutA3 = false;   // NEW

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_DISCONNECTED) {
    Serial.printf("[%u] Disconnected!\n", num);
  } else if (type == WStype_CONNECTED) {
    IPAddress ip = webSocket.remoteIP(num);
    Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Connect to WiFi
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("WebSocket server started on port 81");

  Wire.begin(21,22);

  if (!ads.begin()) {
    Serial.println("ADS1115 NOT FOUND!");
    while(1);
  }

  ads.setGain(GAIN_FOUR);

  // Relay setup
  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);

  // All relays start ON (active LOW)
  digitalWrite(RELAY1, LOW);
  digitalWrite(RELAY2, LOW);
  digitalWrite(RELAY3, LOW);

  Serial.println("3-PHASE SYSTEM READY\n");
}

void measurePhase(int channel, float &Vrms, float &Irms) {
  float samples[SAMPLE_COUNT];
  float dcOffset = 0;

  // Sampling
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int16_t adc = ads.readADC_SingleEnded(channel);
    float voltage = (adc * 0.03125) / 1000.0;

    samples[i] = voltage;
    dcOffset += voltage;

    delayMicroseconds(SAMPLE_DELAY_US);
  }

  dcOffset /= SAMPLE_COUNT;

  float sumSq = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float ac = samples[i] - dcOffset;
    sumSq += ac * ac;
  }

  Vrms = sqrt(sumSq / SAMPLE_COUNT);

  if (Vrms < NO_SIGNAL_THRESHOLD) {
    Vrms = 0;
    Irms = 0;
    return;
  }

  Irms = Vrms * 2.5;  // Your CT conversion formula
}

void loop() {
  float VrmsA0, IrmsA0;
  float VrmsA1, IrmsA1;
  float VrmsA3, IrmsA3;  // NEW

  measurePhase(0, VrmsA0, IrmsA0);
  measurePhase(1, VrmsA1, IrmsA1);
  measurePhase(3, VrmsA3, IrmsA3);   // NEW (Phase-3 CT on A3)

  Serial.println("\n------- 3 PHASE READINGS -------");

  // ---------------------- PHASE 1 ----------------------
  Serial.print("Phase-1: ");
  Serial.print(VrmsA0, 3); Serial.print(" V | ");
  Serial.print(IrmsA0, 3); Serial.print(" A --> ");

  if (IrmsA0 == 0) {
    cutA0 = true;
    Serial.println("NO LOAD");
  } else {
    if (baseA0 < 0) baseA0 = IrmsA0;

    if (IrmsA0 < baseA0 - DROP_THRESHOLD) cutA0 = true;
    if (IrmsA0 > baseA0 + DROP_THRESHOLD) cutA0 = true;

    if (cutA0) Serial.println("LOAD CUT");
    else Serial.println("STABLE");
  }

  // Relay control
  digitalWrite(RELAY1, cutA0 ? HIGH : LOW);

  // ---------------------- PHASE 2 ----------------------
  Serial.print("Phase-2: ");
  Serial.print(VrmsA1, 3); Serial.print(" V | ");
  Serial.print(IrmsA1, 3); Serial.print(" A --> ");

  if (IrmsA1 == 0) {
    cutA1 = true;
    Serial.println("NO LOAD");
  } else {
    if (baseA1 < 0) baseA1 = IrmsA1;

    if (IrmsA1 < baseA1 - DROP_THRESHOLD) cutA1 = true;
    if (IrmsA1 > baseA1 + DROP_THRESHOLD) cutA1 = true;

    if (cutA1) Serial.println("LOAD CUT");
    else Serial.println("STABLE");
  }

  digitalWrite(RELAY2, cutA1 ? HIGH : LOW);

  // ---------------------- PHASE 3 (NEW) ----------------------
  Serial.print("Phase-3: ");
  Serial.print(VrmsA3, 3); Serial.print(" V | ");
  Serial.print(IrmsA3, 3); Serial.print(" A --> ");

  if (IrmsA3 == 0) {
    cutA3 = true;
    Serial.println("NO LOAD");
  } else {
    if (baseA3 < 0) baseA3 = IrmsA3;

    if (IrmsA3 < baseA3 - DROP_THRESHOLD) cutA3 = true;
    if (IrmsA3 > baseA3 + DROP_THRESHOLD) cutA3 = true;

    if (cutA3) Serial.println("LOAD CUT");
    else Serial.println("STABLE");
  }

  // Relay-3 control
  digitalWrite(RELAY3, cutA3 ? HIGH : LOW);

  // Send data via WebSocket
  webSocket.loop();
  
  StaticJsonDocument<512> doc;
  
  // R Phase (Phase-1 from A0)
  doc["voltage_R"] = 12.8;  // Fixed voltage for now
  doc["current_R"] = IrmsA0;
  
  // Y Phase (Phase-2 from A1)
  doc["voltage_Y"] = 12.8;  // Fixed voltage for now
  doc["current_Y"] = IrmsA1;
  
  // B Phase (Phase-3 from A3)
  doc["voltage_B"] = 12.8;  // Fixed voltage for now
  doc["current_B"] = IrmsA3;
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.broadcastTXT(jsonString);

  delay(200);
}