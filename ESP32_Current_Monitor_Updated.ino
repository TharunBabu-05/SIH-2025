// 3-PHASE INDEPENDENT CUT + RC DISTANCE + WebSocket Integration
// Sends real-time data to monitoring dashboard

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

Adafruit_ADS1115 ads;
WebSocketsServer webSocket = WebSocketsServer(81);

// ------------------- WiFi Credentials -------------------
// Note: ESP32 will get IP 10.189.10.133 when connected to hotspot
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ------------------- Sampling / thresholds -------------------
const int SAMPLE_COUNT = 200;
const int SAMPLE_DELAY_US = 500;

const float NO_SIGNAL_THRESHOLD = 0.01;   // Vrms threshold -> no load
const float DROP_THRESHOLD_P12   = 0.07;  // drop threshold for phase1 & 2
const float DROP_THRESHOLD_P3    = 0.15;  // more tolerant for phase3

// RC timing thresholds (microseconds) — calibrated from your measurements
#define THRESH_SEC1 800
#define THRESH_SEC2 2100
#define THRESH_SEC3 3150

// ADC threshold for RC charge (ESP32 ADC units, ~2.0V)
#define ADC_THRESHOLD 2048

// Section length (meters)
const float SECTION_LEN = 0.5333f;

// ------------------- Relay & RC pins -------------------
// Phase-1
#define RELAY1 25
#define P1_OUT  32
#define P1_ADC  34
// ADS channel 0 -> Phase-1

// Phase-2
#define RELAY2 26
#define P2_OUT  33
#define P2_ADC  35
// ADS channel 1 -> Phase-2

// Phase-3
#define RELAY3 27
#define P3_OUT  14
#define P3_ADC  39
// ADS channel 2 -> Phase-3

// ------------------- Phase state struct -------------------
struct Phase {
  float baseline;    // initial baseline current
  bool cut;          // whether this phase is marked cut
  bool rcDone;       // whether RC measurement was completed after cut
  int badCount;      // consecutive drop readings counter (debounce)
  int lastPole;
  float lastDist;
  unsigned long rcTime; // RC time in microseconds
  String status;     // "NORMAL", "WARNING", "CUT"
  Phase(): baseline(-1), cut(false), rcDone(false), badCount(0), lastPole(0), lastDist(0.0f), rcTime(0), status("NORMAL") {}
};

Phase P1, P2, P3;

// ------------------- WebSocket Event Handler -------------------
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
        
        // Send initial connection confirmation
        String msg = "{\"type\":\"connection\",\"status\":\"connected\",\"message\":\"ESP32 Ready\"}";
        webSocket.sendTXT(num, msg);
      }
      break;
    case WStype_TEXT:
      Serial.printf("[%u] Received: %s\n", num, payload);
      break;
    case WStype_ERROR:
      Serial.printf("[%u] Error!\n", num);
      break;
  }
}

// ------------------- Send data to WebSocket clients -------------------
void sendDataToClients(float Vrms1, float Irms1, float Vrms2, float Irms2, float Vrms3, float Irms3) {
  StaticJsonDocument<2048> doc;
  
  // Phase R (Phase 1)
  doc["voltage_R"] = Vrms1;
  doc["current_R"] = Irms1;
  doc["power_R"] = Vrms1 * Irms1;
  doc["status_R"] = P1.status;
  doc["relay_R"] = P1.cut;
  doc["baseline_R"] = P1.baseline;
  if (P1.rcDone) {
    doc["pole_R"] = P1.lastPole;
    doc["distance_R"] = P1.lastDist;
    doc["rcTime_R"] = P1.rcTime;
  }
  
  // Phase Y (Phase 2)
  doc["voltage_Y"] = Vrms2;
  doc["current_Y"] = Irms2;
  doc["power_Y"] = Vrms2 * Irms2;
  doc["status_Y"] = P2.status;
  doc["relay_Y"] = P2.cut;
  doc["baseline_Y"] = P2.baseline;
  if (P2.rcDone) {
    doc["pole_Y"] = P2.lastPole;
    doc["distance_Y"] = P2.lastDist;
    doc["rcTime_Y"] = P2.rcTime;
  }
  
  // Phase B (Phase 3)
  doc["voltage_B"] = Vrms3;
  doc["current_B"] = Irms3;
  doc["power_B"] = Vrms3 * Irms3;
  doc["status_B"] = P3.status;
  doc["relay_B"] = P3.cut;
  doc["baseline_B"] = P3.baseline;
  if (P3.rcDone) {
    doc["pole_B"] = P3.lastPole;
    doc["distance_B"] = P3.lastDist;
    doc["rcTime_B"] = P3.rcTime;
  }
  
  // System info
  doc["timestamp"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.broadcastTXT(jsonString);
}

// ------------------- Send Fault Log Message -------------------
void sendFaultLog(const char* phase, const char* faultType, int poleNumber, float distance) {
  StaticJsonDocument<512> doc;
  doc["type"] = "fault_log";
  doc["phase"] = phase;
  doc["fault_type"] = faultType;
  doc["pole_number"] = poleNumber;
  doc["distance"] = distance;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.broadcastTXT(jsonString);
  
  Serial.print("FAULT LOG: ");
  Serial.println(jsonString);
}

// ------------------- Utility: measure current from ADS -------------------
void measurePhaseADS(int channel, float &Vrms, float &Irms) {
  float samples[SAMPLE_COUNT];
  float dc = 0.0f;

  for (int i = 0; i < SAMPLE_COUNT; ++i) {
    int16_t raw = ads.readADC_SingleEnded(channel);
    float v = (raw * 0.03125) / 1000.0;   // ADS1115 scaling (mV -> V)
    samples[i] = v;
    dc += v;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  dc /= SAMPLE_COUNT;
  float sum = 0.0f;
  for (int i = 0; i < SAMPLE_COUNT; ++i) {
    float ac = samples[i] - dc;
    sum += ac * ac;
  }

  Vrms = sqrt(sum / SAMPLE_COUNT);

  if (Vrms < NO_SIGNAL_THRESHOLD) {
    Vrms = 0.0f;
    Irms = 0.0f;
    return;
  }

  // Scale from measured Vrms to Irms (adjust based on your CT ratio)
  Irms = Vrms * 2.5f;
}

// ------------------- RC measurement (single shot) -------------------
unsigned long measureRC_single(int outPin, int adcPin) {
  digitalWrite(outPin, LOW);
  delay(20);

  unsigned long start = micros();
  digitalWrite(outPin, HIGH);

  while (true) {
    int adc = analogRead(adcPin);
    if (adc >= ADC_THRESHOLD) {
      return micros() - start;
    }
    if (micros() - start > 1000000UL) {
      return micros() - start;
    }
  }
}

// ------------------- Run RC (averaged 5 readings) -------------------
unsigned long runRC_avg(int outPin, int adcPin) {
  unsigned long sum = 0;
  for (int i = 0; i < 5; ++i) {
    sum += measureRC_single(outPin, adcPin);
    delay(10);
  }
  return sum / 5;
}

// ------------------- Evaluate RC -> section, pole, distance -------------------
void decodeAndStoreRC(unsigned long T_us, Phase &ph) {
  int section;
  if (T_us < THRESH_SEC1) section = 1;
  else if (T_us < THRESH_SEC2) section = 2;
  else if (T_us < THRESH_SEC3) section = 3;
  else section = 4;

  int pole = section + 1;
  float dist = section * SECTION_LEN;

  ph.lastPole = pole;
  ph.lastDist = dist;
  ph.rcTime = T_us;
  ph.rcDone = true;
}

// ------------------- Isolated RC runner per phase -------------------
void performRCForPhase(const char *name, int outPin, int adcPin, Phase &ph) {
  Serial.print("\n>> Running RC for ");
  Serial.println(name);
  unsigned long T = runRC_avg(outPin, adcPin);
  Serial.print("RC Time: ");
  Serial.print(T);
  Serial.print(" µs (");
  Serial.print(T / 1000.0, 3);
  Serial.println(" ms)");
  decodeAndStoreRC(T, ph);
  Serial.print("Decoded Pole: ");
  Serial.println(ph.lastPole);
  Serial.print("Decoded Distance: ");
  Serial.print(ph.lastDist, 3);
  Serial.println(" m");
  Serial.println("----------------------------------\n");
}

// ------------------- Setup -------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  // Initialize WiFi
  Serial.println("\n=== Connecting to WiFi ===");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("WebSocket Server Started on port 81");
  Serial.print("Connect to: ws://");
  Serial.print(WiFi.localIP());
  Serial.println(":81");

  // Initialize I2C and ADS
  Wire.begin(21, 22);
  ads.begin();
  ads.setGain(GAIN_FOUR);

  // Configure relay pins and RC output pins
  pinMode(RELAY1, OUTPUT); digitalWrite(RELAY1, LOW);
  pinMode(RELAY2, OUTPUT); digitalWrite(RELAY2, LOW);
  pinMode(RELAY3, OUTPUT); digitalWrite(RELAY3, LOW);

  pinMode(P1_OUT, OUTPUT); digitalWrite(P1_OUT, LOW);
  pinMode(P2_OUT, OUTPUT); digitalWrite(P2_OUT, LOW);
  pinMode(P3_OUT, OUTPUT); digitalWrite(P3_OUT, LOW);

  Serial.println("\n=== 3-Phase Independent CUT + RC Distance ===");
  Serial.println("Phase pins:");
  Serial.println(" P1 (R): RELAY1=25, P1_OUT=32, P1_ADC=34, ADS=CH0");
  Serial.println(" P2 (Y): RELAY2=26, P2_OUT=33, P2_ADC=35, ADS=CH1");
  Serial.println(" P3 (B): RELAY3=27, P3_OUT=14, P3_ADC=39, ADS=CH2");
  Serial.println("=================================================\n");
}

// ------------------- Main loop -------------------
void loop() {
  webSocket.loop();
  
  // Measure all three phases
  float Vrms1, Irms1, Vrms2, Irms2, Vrms3, Irms3;
  measurePhaseADS(0, Vrms1, Irms1);
  measurePhaseADS(1, Vrms2, Irms2);
  measurePhaseADS(2, Vrms3, Irms3);

  Serial.println("\n--- Live Readings ---");
  Serial.print("P1 Irms: "); Serial.print(Irms1, 3); Serial.print(" A");
  Serial.print("   P2 Irms: "); Serial.print(Irms2, 3); Serial.print(" A");
  Serial.print("   P3 Irms: "); Serial.print(Irms3, 3); Serial.println(" A");

  // ---------------- PHASE 1 handling ----------------
  if (!P1.cut) {
    if (Irms1 == 0.0f) {
      Serial.println("P1: CUT (0A) detected");
      P1.cut = true;
      P1.status = "CUT";
      digitalWrite(RELAY1, HIGH);
      performRCForPhase("Phase-1", P1_OUT, P1_ADC, P1);
      sendFaultLog("R", "PHASE_CUT", P1.lastPole, P1.lastDist);
    } else {
      if (P1.baseline < 0.0f) {
        P1.baseline = Irms1;
        P1.status = "NORMAL";
        Serial.print("P1 baseline set: "); Serial.println(P1.baseline, 3);
      } else {
        if (fabs(Irms1 - P1.baseline) > DROP_THRESHOLD_P12) {
          P1.badCount++;
          P1.status = "WARNING";
          Serial.print("P1 drop candidate count: "); Serial.println(P1.badCount);
          if (P1.badCount >= 3) {
            Serial.println("P1: LOAD DROP detected -> cutting");
            P1.cut = true;
            P1.status = "CUT";
            digitalWrite(RELAY1, HIGH);
            performRCForPhase("Phase-1", P1_OUT, P1_ADC, P1);
            sendFaultLog("R", "LOAD_DROP", P1.lastPole, P1.lastDist);
          }
        } else {
          P1.badCount = 0;
          P1.status = "NORMAL";
        }
      }
    }
  }

  // ---------------- PHASE 2 handling ----------------
  if (!P2.cut) {
    if (Irms2 == 0.0f) {
      Serial.println("P2: CUT (0A) detected");
      P2.cut = true;
      P2.status = "CUT";
      digitalWrite(RELAY2, HIGH);
      performRCForPhase("Phase-2", P2_OUT, P2_ADC, P2);
      sendFaultLog("Y", "PHASE_CUT", P2.lastPole, P2.lastDist);
    } else {
      if (P2.baseline < 0.0f) {
        P2.baseline = Irms2;
        P2.status = "NORMAL";
        Serial.print("P2 baseline set: "); Serial.println(P2.baseline, 3);
      } else {
        if (fabs(Irms2 - P2.baseline) > DROP_THRESHOLD_P12) {
          P2.badCount++;
          P2.status = "WARNING";
          Serial.print("P2 drop candidate count: "); Serial.println(P2.badCount);
          if (P2.badCount >= 3) {
            Serial.println("P2: LOAD DROP detected -> cutting");
            P2.cut = true;
            P2.status = "CUT";
            digitalWrite(RELAY2, HIGH);
            performRCForPhase("Phase-2", P2_OUT, P2_ADC, P2);
            sendFaultLog("Y", "LOAD_DROP", P2.lastPole, P2.lastDist);
          }
        } else {
          P2.badCount = 0;
          P2.status = "NORMAL";
        }
      }
    }
  }

  // ---------------- PHASE 3 handling ----------------
  if (!P3.cut) {
    if (Irms3 == 0.0f) {
      Serial.println("P3: CUT (0A) detected");
      P3.cut = true;
      P3.status = "CUT";
      digitalWrite(RELAY3, HIGH);
      performRCForPhase("Phase-3", P3_OUT, P3_ADC, P3);
      sendFaultLog("B", "PHASE_CUT", P3.lastPole, P3.lastDist);
    } else {
      if (P3.baseline < 0.0f) {
        P3.baseline = Irms3;
        P3.status = "NORMAL";
        Serial.print("P3 baseline set: "); Serial.println(P3.baseline, 3);
      } else {
        if (fabs(Irms3 - P3.baseline) > DROP_THRESHOLD_P3) {
          P3.badCount++;
          P3.status = "WARNING";
          Serial.print("P3 drop candidate count: "); Serial.println(P3.badCount);
          if (P3.badCount >= 3) {
            Serial.println("P3: LOAD DROP detected -> cutting");
            P3.cut = true;
            P3.status = "CUT";
            digitalWrite(RELAY3, HIGH);
            performRCForPhase("Phase-3", P3_OUT, P3_ADC, P3);
            sendFaultLog("B", "LOAD_DROP", P3.lastPole, P3.lastDist);
          }
        } else {
          P3.badCount = 0;
          P3.status = "NORMAL";
        }
      }
    }
  }

  // Print RC results summary
  if (P1.rcDone) {
    Serial.print("P1 -> Pole: "); Serial.print(P1.lastPole);
    Serial.print("  Dist: "); Serial.print(P1.lastDist, 3); Serial.println(" m");
  }
  if (P2.rcDone) {
    Serial.print("P2 -> Pole: "); Serial.print(P2.lastPole);
    Serial.print("  Dist: "); Serial.print(P2.lastDist, 3); Serial.println(" m");
  }
  if (P3.rcDone) {
    Serial.print("P3 -> Pole: "); Serial.print(P3.lastPole);
    Serial.print("  Dist: "); Serial.print(P3.lastDist, 3); Serial.println(" m");
  }

  // Send data to connected WebSocket clients
  sendDataToClients(Vrms1, Irms1, Vrms2, Irms2, Vrms3, Irms3);

  delay(250);
}
