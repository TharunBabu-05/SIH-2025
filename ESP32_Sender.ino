// =============================================================
// ESP32 #1 - SENSOR + FAULT DETECTION + ESP-NOW SENDER
// 3-PHASE MONITOR + RC DISTANCE
// PHASE-1 = NEW ADVANCED LOGIC
// PHASE-2 = OLD LOGIC
// PHASE-3 = ALWAYS ON
// Sends ALL data to ESP32 #2 via ESP-NOW
// =============================================================

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <esp_now.h>
#include <LoRa.h>

// ===================== LoRa CONFIG =======================
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_CS    5
#define LORA_RST   14
#define LORA_IRQ   4
#define LORA_BAND  433E6

// ===================== ADS1115 ============================
Adafruit_ADS1115 ads;

// ===================== RELAYS =============================
#define RELAY1 25
#define RELAY2 26
#define RELAY3 27

// ================== RC PINS ================================
#define P1_OUT 32
#define P1_ADC 34
#define P2_OUT 33
#define P2_ADC 35

// ================== ESP-NOW DATA STRUCTURE =================
typedef struct struct_message {
  // Live sensor values
  float voltageR;
  float currentR;
  float voltageY;
  float currentY;
  float voltageB;
  float currentB;
  
  // Fault detection status
  bool cutP1;
  bool cutP2;
  float baseP1;
  float baseP2;
  bool relay1;
  bool relay2;
  bool relay3;
  
  // RC distance data
  float rcTimeP1;
  float rcTimeP2;
  int poleP1;
  int poleP2;
  float distanceP1;
  float distanceP2;
  
  // Fault information
  char faultTypeP1[32];
  char faultTypeP2[32];
  char debugMessage[128];
  
  unsigned long timestamp;
} struct_message;

struct_message sensorData;

// 🔴 REPLACE WITH YOUR ESP32 #2 MAC ADDRESS
uint8_t receiverMac[] = {0x24, 0x6F, 0x28, 0xXX, 0xXX, 0xXX};

// Callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  // Silent - don't spam serial
}

// Send data via ESP-NOW
void sendData() {
  sensorData.timestamp = millis();
  esp_err_t result = esp_now_send(receiverMac, (uint8_t *)&sensorData, sizeof(sensorData));
}

// Send debug message
void sendDebugMessage(const char* msg) {
  strncpy(sensorData.debugMessage, msg, 127);
  sensorData.debugMessage[127] = '\0';
  sendData();
  Serial.println(msg); // Also print locally
}

// ======================================================================
// =============== ADVANCED PHASE-1 RC LOGIC ============================
// ======================================================================

#define CUT_CURRENT_THRESHOLD 0.05
#define DROP_THRESHOLD_NEW    0.1
#define ADC_THRESHOLD         2048
const float SECTION_LEN = 0.5333f;

float baseP1 = -1;
bool cutP1 = false;

float median3(float a, float b, float c) {
  if ((a > b) != (a > c)) return a;
  if ((b > a) != (b > c)) return b;
  return c;
}

// Thresholds based on measurements
const float TH_P3      = 2.05f;
const float TH_P4      = 3.05f;
const float TH_BR_OPEN = 5.00f;
const float TH_B1      = 7.50f;
const float TH_P4B     = 8.90f;

unsigned long measureTimeToThreshold_P1() {
  digitalWrite(P1_OUT, LOW);
  delay(20);

  unsigned long ts = micros();
  digitalWrite(P1_OUT, HIGH);

  while (1) {
    if (analogRead(P1_ADC) >= ADC_THRESHOLD)
      return micros() - ts;

    if (micros() - ts > 1000000UL)
      return micros() - ts;
  }
}

void decodeRCPole_P1(float Tms) {
  char msg[128];
  
  sendDebugMessage("\n[P1] ---- DISTANCE ANALYSIS ----");

  if (Tms < TH_P3) {
    sensorData.poleP1 = 3;
    sensorData.distanceP1 = 3 * SECTION_LEN;
    strcpy(sensorData.faultTypeP1, "MAIN_CUT_POLE3");
    snprintf(msg, 128, "[P1] HIGH-IMPEDANCE FAULT → MAIN CUT at POLE-3 (%.2f m)", sensorData.distanceP1);
    sendDebugMessage(msg);
  }
  else if (Tms < TH_P4) {
    sensorData.poleP1 = 4;
    sensorData.distanceP1 = 4 * SECTION_LEN;
    strcpy(sensorData.faultTypeP1, "MAIN_CUT_POLE4_BR_OFF");
    snprintf(msg, 128, "[P1] HIGH-IMPEDANCE FAULT → MAIN CUT at POLE-4 (Branch OFF) (%.2f m)", sensorData.distanceP1);
    sendDebugMessage(msg);
  }
  else if (Tms < TH_BR_OPEN) {
    sensorData.poleP1 = 5;
    sensorData.distanceP1 = 5 * SECTION_LEN;
    strcpy(sensorData.faultTypeP1, "BRANCH_OPEN_POLE5");
    sendDebugMessage("[P1] MAIN HEALTHY → BRANCH OPEN at POLE-5 END");
  }
  else if (Tms < TH_B1) {
    sensorData.poleP1 = 4;
    sensorData.distanceP1 = 4 * SECTION_LEN;
    strcpy(sensorData.faultTypeP1, "BRANCH_CUT_B1");
    snprintf(msg, 128, "[P1] HIGH-IMPEDANCE FAULT → BRANCH CUT at B1 (%.2f m)", sensorData.distanceP1);
    sendDebugMessage(msg);
  }
  else if (Tms < TH_P4B) {
    sensorData.poleP1 = 4;
    sensorData.distanceP1 = 4 * SECTION_LEN;
    strcpy(sensorData.faultTypeP1, "MAIN_CUT_POLE4_BR_ACTIVE");
    snprintf(msg, 128, "[P1] HIGH-IMPEDANCE FAULT → MAIN CUT at POLE-4 (Branch ACTIVE) (%.2f m)", sensorData.distanceP1);
    sendDebugMessage(msg);
  }
  else {
    sensorData.poleP1 = 0;
    sensorData.distanceP1 = 0;
    strcpy(sensorData.faultTypeP1, "LINE_HEALTHY");
    sendDebugMessage("[P1] LINE HEALTHY → NO CUT DETECTED");
  }

  sendDebugMessage("-----------------------------------");
}

void runRCDistance_P1() {
  sendDebugMessage("\n[P1] Waiting 3 seconds...");
  delay(3000);

  sendDebugMessage("[P1] ==== RC MEASUREMENT START ====");

  unsigned long tvals[3];
  for (int i = 0; i < 3; i++) {
    tvals[i] = measureTimeToThreshold_P1();
    delay(10);
  }

  float Tmed = median3(tvals[0]/1000.0f, tvals[1]/1000.0f, tvals[2]/1000.0f);
  sensorData.rcTimeP1 = Tmed;
  
  char msg[64];
  snprintf(msg, 64, "[P1] RC Time: %.3f ms", Tmed);
  sendDebugMessage(msg);

  decodeRCPole_P1(Tmed);

  sendDebugMessage("[P1] ==== RC MEASUREMENT END ====\n");
}

// ======================================================================
// =============== FAST CURRENT READ ====================================
// ======================================================================

#define SAMPLE_COUNT 30
#define SAMPLE_DELAY_US 100
const float NO_SIGNAL_THRESHOLD = 0.01;

void measureCurrent(int channel, float &Irms) {
  float buf[SAMPLE_COUNT], dc = 0, sumSq = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int16_t raw = ads.readADC_SingleEnded(channel);
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
  if (Vrms < NO_SIGNAL_THRESHOLD) { Irms = 0; return; }
  Irms = Vrms * 2.5;
}

// ======================================================================
// =============== OLD PHASE-2 LOGIC ====================================
// ======================================================================

float baseP2 = -1;
bool cutP2 = false;
const float DROP_THRESHOLD_P12 = 0.07;

unsigned long measureRC(int outPin, int adcPin) {
  digitalWrite(outPin, LOW);
  delay(15);

  unsigned long s = micros();
  digitalWrite(outPin, HIGH);

  while (1) {
    if (analogRead(adcPin) >= 2048)
      return micros() - s;

    if (micros() - s > 1000000UL)
      return micros() - s;
  }
}

unsigned long measureRCAvg(int outPin, int adcPin) {
  unsigned long t = 0;
  for (int i = 0; i < 5; i++) {
    t += measureRC(outPin, adcPin);
    delay(10);
  }
  return t / 5;
}

#define THRESH_SEC1 800
#define THRESH_SEC2 2100
#define THRESH_SEC3 3150

void decodeRC(const char *name, unsigned long T) {
  int sec;
  if (T < THRESH_SEC1) sec = 1;
  else if (T < THRESH_SEC2) sec = 2;
  else if (T < THRESH_SEC3) sec = 3;
  else sec = 4;

  float dist = sec * SECTION_LEN;
  
  sensorData.poleP2 = sec + 1;
  sensorData.distanceP2 = dist;
  sensorData.rcTimeP2 = T / 1000.0f;
  strcpy(sensorData.faultTypeP2, "CUT_DETECTED");

  char msg[96];
  snprintf(msg, 96, "[%s] HIGH-IMPEDANCE FAULT → SECTION-%d CUT (%.2f m)", name, sec, dist);
  sendDebugMessage(msg);
}

// ======================================================================
// =============== VOLTAGE SIMULATION ===================================
// ======================================================================

float V1 = 12.0 + random(0, 80) / 10.0;
float V2 = 12.0 + random(0, 80) / 10.0;
float V3 = 12.0 + random(0, 80) / 10.0;

// ======================================================================
// =============== SETUP ================================================
// ======================================================================

void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println("\n=== ESP32 #1 - SENSOR NODE (ESP-NOW) ===");

  Wire.begin(21,22);
  ads.begin();
  ads.setGain(GAIN_FOUR);

  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);

  digitalWrite(RELAY1, LOW);
  digitalWrite(RELAY2, LOW);
  digitalWrite(RELAY3, LOW);

  pinMode(P1_OUT, OUTPUT);
  pinMode(P2_OUT, OUTPUT);

  SPI.begin(LORA_SCK,LORA_MISO,LORA_MOSI,LORA_CS);
  LoRa.setPins(LORA_CS,LORA_RST,LORA_IRQ);
  LoRa.begin(LORA_BAND);

  // Initialize ESP-NOW
  WiFi.mode(WIFI_STA);
  Serial.print("📡 MAC Address: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    return;
  }
  Serial.println("✅ ESP-NOW initialized");

  esp_now_register_send_cb(OnDataSent);

  // Register peer (ESP32 #2)
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, receiverMac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to add peer");
    return;
  }
  Serial.println("✅ Peer added - Ready to send data");

  Serial.println("\n=== SYSTEM READY ===\n");
}

// ======================================================================
// =============== MAIN LOOP ============================================
// ======================================================================

void loop() {
  float I1, I2, I3;

  // Read currents
  measureCurrent(0, I1);
  measureCurrent(3, I2);
  measureCurrent(2, I3);

  // Update voltages based on current
  if (I1 <= 0.01) V1 = 0.0;
  if (I2 <= 0.01) V2 = 0.0;
  if (I3 <= 0.01) V3 = 0.0;

  // Regenerate voltage if current returns
  if (I1 > 0.01 && V1 == 0.0) V1 = 12.0 + random(0, 80) / 10.0;
  if (I2 > 0.01 && V2 == 0.0) V2 = 12.0 + random(0, 80) / 10.0;
  if (I3 > 0.01 && V3 == 0.0) V3 = 12.0 + random(0, 80) / 10.0;

  // Update data structure
  sensorData.voltageR = V1;
  sensorData.currentR = I1;
  sensorData.voltageY = V2;
  sensorData.currentY = I2;
  sensorData.voltageB = V3;
  sensorData.currentB = I3;
  sensorData.cutP1 = cutP1;
  sensorData.cutP2 = cutP2;
  sensorData.baseP1 = baseP1;
  sensorData.baseP2 = baseP2;
  sensorData.relay1 = digitalRead(RELAY1);
  sensorData.relay2 = digitalRead(RELAY2);
  sensorData.relay3 = digitalRead(RELAY3);

  // PRINT LIVE VALUES
  Serial.printf(
    "\nLIVE →  "
    "P1=%.3fA %.2fV |  "
    "P2=%.3fA %.2fV |  "
    "P3=%.3fA %.2fV\n",
    I1, V1, I2, V2, I3, V3
  );

  // ------------------------------------------------------------
  // PHASE-1 (NEW LOGIC)
  // ------------------------------------------------------------
  if (!cutP1) {
    if (baseP1 < 0 && I1 > CUT_CURRENT_THRESHOLD)
      baseP1 = I1;

    if (I1 < CUT_CURRENT_THRESHOLD) {
      sendDebugMessage("[P1] HIGH-IMPEDANCE FAULT → CURRENT DROPPED");
      cutP1 = true;
      digitalWrite(RELAY1, HIGH);
      runRCDistance_P1();
    }

    if (baseP1 > 0 && fabs(I1 - baseP1) > DROP_THRESHOLD_NEW) {
      sendDebugMessage("[P1] HIGH-IMPEDANCE FAULT → LOAD DROP DETECTED");
      cutP1 = true;
      digitalWrite(RELAY1, HIGH);
      runRCDistance_P1();
    }
  }

  // ------------------------------------------------------------
  // PHASE-2 (OLD LOGIC)
  // ------------------------------------------------------------
  if (!cutP2) {
    if (baseP2 < 0 && I2 > 0.05)
      baseP2 = I2;

    if (I2 == 0 || fabs(I2 - baseP2) > DROP_THRESHOLD_P12) {
      cutP2 = true;
      digitalWrite(RELAY2, HIGH);

      sendDebugMessage("[P2] HIGH-IMPEDANCE FAULT → CURRENT DROP");

      unsigned long t = measureRCAvg(P2_OUT, P2_ADC);
      decodeRC("P2", t);
    }
  }

  // PHASE-3 ALWAYS ON
  digitalWrite(RELAY3, LOW);

  // Send continuous data via ESP-NOW
  static unsigned long last = 0;
  if (millis() - last > 100) {
    sendData();
    last = millis();
  }

  delay(120);
}
