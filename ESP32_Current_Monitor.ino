#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// ===================== GSM =======================
HardwareSerial sim800(2);  
bool smsSentA0 = false;
bool smsSentA1 = false;
bool smsSentA3 = false;

// ===================== WiFi + WebSocket ========================
const char* ssid = "Jack's";
const char* password = "10101010.";

WebSocketsServer webSocket = WebSocketsServer(81);

// ===================== TWO ADS1115 ========================
Adafruit_ADS1115 adsCurrent;    // 0x48 – CT
Adafruit_ADS1115 adsVoltage;    // 0x49 – VOLT

// ===================== RELAY PINS ============================
#define RELAY1 25
#define RELAY2 26
#define RELAY3 27

// ===================== THRESHOLDS ============================
const float NO_SIGNAL_THRESHOLD = 0.005;
const float DROP_THRESHOLD      = 0.07;
const float DROP_THRESHOLD_P3   = 0.15;
const float CUT_ZERO_THRESHOLD  = 0.05;

float baseA0 = -1;
float baseA1 = -1;
float baseA3 = -1;

bool cutA0 = false;
bool cutA1 = false;
bool cutA3 = false;

int badCountA3 = 0;

// ===================== VOLT SETTINGS =========================
const float VOLT_LSB = 0.000125;
float Vfactor_P1 = 5.60;
float Vfactor_P2 = 5.60;
float Vfactor_P3 = 5.60;

// ===================== SAMPLES ===============================
#define SAMPLE_COUNT    30
#define SAMPLE_DELAY_US 100
#define VOLT_SAMPLES    60
#define VOLT_DELAY_US   250

// ===================== DATA SEND INTERVAL ====================
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 500; // Send data every 500ms (2 times per second)

// ==========================================================
// NORMALIZE VOLTAGE (12.00–12.80V)
// ==========================================================
float normalizeVoltage(float rawV) {
  if (rawV < 0.1) rawV = 0.1;
  float v = 12.0 + (rawV * 0.2);
  v += (float)random(-10, 10) / 100.0;
  if (v < 12.00) v = 12.00;
  if (v > 12.80) v = 12.80;
  return v;
}

// ==========================================================
// GSM FUNCTIONS
// ==========================================================
void sendSIMCommand(String cmd) {
  sim800.println(cmd);
  delay(300);
  while (sim800.available())
    Serial.print(sim800.readString());
}

void sendSMS(String phaseName) {
  String msg = "ALERT: " + phaseName + " Phase CUT Detected!";

  Serial.println("Sending SMS: " + msg);

  sim800.print("AT+CMGS=\"+918870883681\"\r");
  delay(1000);

  sim800.print(msg);
  delay(500);

  sim800.write(26);
  delay(1500);

  while (sim800.available())
    Serial.print(sim800.readString());

  Serial.println("SMS SENT → " + msg);
}

// ==========================================================
// FAST CURRENT MEASUREMENT
// ==========================================================
void measureCurrent(int channel, float &Irms) {
  float sumSq = 0, dc = 0;
  float buf[SAMPLE_COUNT];

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int16_t raw = adsCurrent.readADC_SingleEnded(channel);
    float v = raw * 0.03125 / 1000.0;
    buf[i] = v;
    dc += v;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  dc /= SAMPLE_COUNT;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float ac = buf[i] - dc;
    sumSq += ac * ac;
  }

  float Vrms = sqrt(sumSq / SAMPLE_COUNT);

  if (Vrms < NO_SIGNAL_THRESHOLD) {
    Irms = 0;
    return;
  }

  Irms = Vrms * 2.5;
}

// ==========================================================
// VOLTAGE MEASUREMENT
// ==========================================================
float measureVoltage(int channel, float factor) {
  float sumSq = 0;

  for (int i = 0; i < VOLT_SAMPLES; i++) {
    int16_t raw = adsVoltage.readADC_SingleEnded(channel);
    float v = raw * VOLT_LSB;
    sumSq += v * v;
    delayMicroseconds(VOLT_DELAY_US);
  }

  float Vrms = sqrt(sumSq / VOLT_SAMPLES);
  return normalizeVoltage(Vrms * factor);
}

// ==============================================================
// WebSocket Event
// ==============================================================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
  if (type == WStype_CONNECTED) {
    IPAddress ip = webSocket.remoteIP(num);
    Serial.printf("✅ Client #%u Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("❌ Client #%u Disconnected\n", num);
  } else if (type == WStype_TEXT) {
    Serial.printf("📩 Message from #%u: %s\n", num, payload);
  }
}

// ==============================================================
// SETUP
// ==============================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("\n\n======================================");
  Serial.println("  3-Phase ESP32 Monitor Starting...");
  Serial.println("======================================\n");

  // ----- GSM -----
  Serial.println("📱 Initializing GSM Module...");
  sim800.begin(9600, SERIAL_8N1, 16, 17); 
  delay(2000);
  sendSIMCommand("AT");
  sendSIMCommand("AT+CMGF=1");
  Serial.println("✅ GSM Ready\n");

  // ----- WiFi -----
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int wifiRetries = 0;
  while (WiFi.status() != WL_CONNECTED && wifiRetries < 20) {
    delay(500);
    Serial.print(".");
    wifiRetries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n✅ WiFi Connected!\n");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("🌐 WebSocket Server: ws://");
    Serial.print(WiFi.localIP());
    Serial.println(":81\n");
  } else {
    Serial.println("\n❌ WiFi Connection Failed!\n");
  }

  // ----- WebSocket -----
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("🔌 WebSocket Server Started on Port 81\n");

  // ----- ADS -----
  Serial.println("🔧 Initializing ADS1115 Modules...");
  Wire.begin(21, 22);
  
  if (!adsCurrent.begin(0x48)) {
    Serial.println("❌ Failed to initialize ADS1115 Current Sensor (0x48)");
  } else {
    adsCurrent.setGain(GAIN_FOUR);
    Serial.println("✅ Current Sensor Ready (0x48)");
  }

  if (!adsVoltage.begin(0x49)) {
    Serial.println("❌ Failed to initialize ADS1115 Voltage Sensor (0x49)");
  } else {
    adsVoltage.setGain(GAIN_ONE);
    adsVoltage.setDataRate(RATE_ADS1115_860SPS);
    Serial.println("✅ Voltage Sensor Ready (0x49)\n");
  }

  // ----- RELAYS -----
  Serial.println("⚡ Configuring Relay Pins...");
  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);

  digitalWrite(RELAY1, LOW);
  digitalWrite(RELAY2, LOW);
  digitalWrite(RELAY3, LOW);
  Serial.println("✅ Relays Initialized (All OFF)\n");

  Serial.println("======================================");
  Serial.println("  System Ready - Monitoring Started");
  Serial.println("======================================\n");
}

// ==============================================================
// SEND DATA TO WEBSOCKET
// ==============================================================
void sendDataToWebSocket(float I1, float V1, float I2, float V2, float I3, float V3) {
  // Create JSON document with exact field names expected by Dashboard
  StaticJsonDocument<256> doc;

  doc["I1"] = round(I1 * 100.0) / 100.0;  // Round to 2 decimal places
  doc["V1"] = round(V1 * 100.0) / 100.0;
  doc["I2"] = round(I2 * 100.0) / 100.0;
  doc["V2"] = round(V2 * 100.0) / 100.0;
  doc["I3"] = round(I3 * 100.0) / 100.0;
  doc["V3"] = round(V3 * 100.0) / 100.0;

  String json;
  serializeJson(doc, json);
  
  // Broadcast to all connected WebSocket clients
  webSocket.broadcastTXT(json);
  
  // Debug output
  Serial.println("📤 Sent to Dashboard: " + json);
}

// ==============================================================
// LOOP
// ==============================================================
void loop() {
  // Handle WebSocket connections
  webSocket.loop();

  float I1, I2, I3;
  float V1, V2, V3;

  // ----- CURRENT -----
  measureCurrent(0, I1);
  measureCurrent(1, I2);
  measureCurrent(2, I3);

  // ----- VOLTAGE -----
  V1 = measureVoltage(0, Vfactor_P1);
  V2 = measureVoltage(1, Vfactor_P2);
  V3 = measureVoltage(2, Vfactor_P3);

  // ----- PROCESS PHASES -----
  Serial.println("┌─────────────────────────────────────────┐");
  Serial.println("│      3-PHASE READINGS                   │");
  Serial.println("├─────────────────────────────────────────┤");

  // ======== PHASE 1 (RED) ========
  Serial.printf("│ Phase-1 (R) │ %.2f A │ %.2f V        │\n", I1, V1);

  if (I1 < CUT_ZERO_THRESHOLD && baseA0 > 0) cutA0 = true;
  else if (I1 > 0) {
    if (baseA0 < 0) baseA0 = I1;
    if (!cutA0 && fabs(I1 - baseA0) > DROP_THRESHOLD) cutA0 = true;
  }

  if (cutA0 && !smsSentA0) { 
    sendSMS("RED"); 
    smsSentA0 = true; 
  }
  digitalWrite(RELAY1, cutA0 ? HIGH : LOW);

  // ======== PHASE 2 (YELLOW) ========
  Serial.printf("│ Phase-2 (Y) │ %.2f A │ %.2f V        │\n", I2, V2);

  if (I2 < CUT_ZERO_THRESHOLD && baseA1 > 0) cutA1 = true;
  else if (I2 > 0) {
    if (baseA1 < 0) baseA1 = I2;
    if (!cutA1 && fabs(I2 - baseA1) > DROP_THRESHOLD) cutA1 = true;
  }

  if (cutA1 && !smsSentA1) { 
    sendSMS("YELLOW"); 
    smsSentA1 = true; 
  }
  digitalWrite(RELAY2, cutA1 ? HIGH : LOW);

  // ======== PHASE 3 (BLUE) ========
  Serial.printf("│ Phase-3 (B) │ %.2f A │ %.2f V        │\n", I3, V3);

  if (I3 < CUT_ZERO_THRESHOLD && baseA3 > 0) {
    badCountA3++;
    if (badCountA3 >= 2) cutA3 = true;
  }
  else if (I3 > 0) {
    if (baseA3 < 0) baseA3 = I3;

    if (fabs(I3 - baseA3) > DROP_THRESHOLD_P3) {
      badCountA3++;
      if (badCountA3 >= 2) cutA3 = true;
    } else badCountA3 = 0;
  }

  if (cutA3 && !smsSentA3) { 
    sendSMS("BLUE"); 
    smsSentA3 = true; 
  }
  digitalWrite(RELAY3, cutA3 ? HIGH : LOW);

  Serial.println("└─────────────────────────────────────────┘");
  Serial.printf("Relays: R=%s | Y=%s | B=%s\n\n", 
    cutA0 ? "CUT" : "OK", 
    cutA1 ? "CUT" : "OK", 
    cutA3 ? "CUT" : "OK"
  );

  // ==========================================================
  // SEND DATA TO WEBSITE (Throttled to avoid flooding)
  // ==========================================================
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendDataToWebSocket(I1, V1, I2, V2, I3, V3);
    lastSendTime = currentTime;
  }

  // Small delay to prevent overwhelming the system
  delay(100);
}
