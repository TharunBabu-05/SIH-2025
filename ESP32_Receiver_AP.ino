// ============================================================
// ESP32 #2 - RECEIVER + ACCESS POINT + WEBSOCKET SERVER
// Receives ALL data from ESP32 #1 via ESP-NOW (2-10ms latency)
// Creates WiFi hotspot "ESP32-HUB" (192.168.4.1)
// Sends data + debug messages to website via WebSocket
// ============================================================

#include <WiFi.h>
#include <esp_now.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Data structure received from ESP32 #1
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

struct_message receivedData;

// Track connection status
bool dataReceived = false;
unsigned long lastDataTime = 0;

// Callback when ESP-NOW data arrives
void OnDataRecv(const uint8_t *mac, const uint8_t *incomingData, int len) {
  memcpy(&receivedData, incomingData, sizeof(receivedData));
  dataReceived = true;
  lastDataTime = millis();
  
  // Print debug message if present
  if (strlen(receivedData.debugMessage) > 0) {
    Serial.println(receivedData.debugMessage);
    
    // Send debug message to website
    StaticJsonDocument<256> debugDoc;
    debugDoc["type"] = "debug";
    debugDoc["message"] = receivedData.debugMessage;
    String debugJson;
    serializeJson(debugDoc, debugJson);
    webSocket.broadcastTXT(debugJson);
    
    receivedData.debugMessage[0] = '\0'; // Clear after sending
  }
  
  // Print received data (occasionally, not always)
  static int count = 0;
  if (count++ % 10 == 0) {
    Serial.printf("📥 R=%.2fV/%.3fA Y=%.2fV/%.3fA B=%.2fV/%.3fA | Faults: P1=%s P2=%s\n",
                  receivedData.voltageR, receivedData.currentR,
                  receivedData.voltageY, receivedData.currentY,
                  receivedData.voltageB, receivedData.currentB,
                  receivedData.cutP1 ? "CUT" : "OK",
                  receivedData.cutP2 ? "CUT" : "OK");
  }
}

// WebSocket event handler
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] 🔌 Website disconnected\n", num);
      break;
      
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] ✅ Website connected from %d.%d.%d.%d\n", 
                      num, ip[0], ip[1], ip[2], ip[3]);
        webSocket.sendTXT(num, "{\"type\":\"connection\",\"status\":\"connected\"}");
      }
      break;
      
    case WStype_TEXT:
      Serial.printf("[%u] Received: %s\n", num, payload);
      break;
  }
}

// Send complete data to website
void sendDataToWebsite() {
  if (!dataReceived) return;

  // Calculate power
  float powerR = receivedData.voltageR * receivedData.currentR;
  float powerY = receivedData.voltageY * receivedData.currentY;
  float powerB = receivedData.voltageB * receivedData.currentB;

  // Determine status
  String statusR = receivedData.cutP1 ? "CUT" : "NORMAL";
  String statusY = receivedData.cutP2 ? "CUT" : "NORMAL";
  String statusB = "NORMAL";

  // Build JSON in format website expects
  StaticJsonDocument<1536> doc;
  doc["type"] = "sensor_data";
  doc["timestamp"] = millis();
  doc["wifi_rssi"] = -50;
  
  // Phase R (Red) - with fault data
  doc["voltage_R"] = receivedData.voltageR;
  doc["current_R"] = receivedData.currentR;
  doc["power_R"] = powerR;
  doc["status_R"] = statusR;
  doc["relay_R"] = receivedData.relay1;
  doc["baseline_R"] = receivedData.baseP1;
  doc["pole_R"] = receivedData.poleP1;
  doc["distance_R"] = receivedData.distanceP1;
  doc["rcTime_R"] = receivedData.rcTimeP1;
  doc["faultType_R"] = receivedData.faultTypeP1;
  doc["cutDetected_R"] = receivedData.cutP1;
  
  // Phase Y (Yellow) - with fault data
  doc["voltage_Y"] = receivedData.voltageY;
  doc["current_Y"] = receivedData.currentY;
  doc["power_Y"] = powerY;
  doc["status_Y"] = statusY;
  doc["relay_Y"] = receivedData.relay2;
  doc["baseline_Y"] = receivedData.baseP2;
  doc["pole_Y"] = receivedData.poleP2;
  doc["distance_Y"] = receivedData.distanceP2;
  doc["rcTime_Y"] = receivedData.rcTimeP2;
  doc["faultType_Y"] = receivedData.faultTypeP2;
  doc["cutDetected_Y"] = receivedData.cutP2;
  
  // Phase B (Blue) - always on
  doc["voltage_B"] = receivedData.voltageB;
  doc["current_B"] = receivedData.currentB;
  doc["power_B"] = powerB;
  doc["status_B"] = statusB;
  doc["relay_B"] = receivedData.relay3;
  doc["baseline_B"] = receivedData.currentB;
  doc["pole_B"] = 0;
  doc["distance_B"] = 0;
  doc["rcTime_B"] = 0;
  doc["faultType_B"] = "ALWAYS_ON";
  doc["cutDetected_B"] = false;
  
  // Serialize and broadcast
  String json;
  serializeJson(doc, json);
  webSocket.broadcastTXT(json);
}

// Send fault log when fault detected
void sendFaultLog(const char* phase, const char* faultType, int pole, float distance) {
  StaticJsonDocument<512> doc;
  doc["type"] = "fault_log";
  doc["phase"] = phase;
  doc["fault_type"] = faultType;
  doc["pole_number"] = pole;
  doc["distance"] = distance;
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  webSocket.broadcastTXT(json);
  
  Serial.printf("⚠️  FAULT: %s Phase - %s at Pole #%d (%.2fm)\n", phase, faultType, pole, distance);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n===========================================");
  Serial.println("ESP32 #2 - RECEIVER + AP + WEBSOCKET");
  Serial.println("===========================================\n");

  // 🔥 CRITICAL: Use WIFI_AP_STA mode
  WiFi.mode(WIFI_AP_STA);
  
  // Start Access Point
  WiFi.softAP("ESP32-HUB", "12345678");
  IPAddress IP = WiFi.softAPIP();
  
  Serial.println("✅ Access Point Started");
  Serial.println("   SSID: ESP32-HUB");
  Serial.println("   Password: 12345678");
  Serial.print("   IP Address: ");
  Serial.println(IP);
  
  // Print MAC address
  Serial.print("📡 MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.println("   ⚠️  Copy this MAC to ESP32_Sender.ino\n");

  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    return;
  }
  Serial.println("✅ ESP-NOW initialized");

  // Register receive callback
  esp_now_register_recv_cb(OnDataRecv);
  Serial.println("✅ ESP-NOW callback registered");

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("✅ WebSocket server started on port 81");

  Serial.println("\n===========================================");
  Serial.println("🚀 SYSTEM READY!");
  Serial.println("===========================================");
  Serial.println("1️⃣  Power ESP32 #1 (sensor node)");
  Serial.println("2️⃣  Connect laptop to: ESP32-HUB");
  Serial.println("3️⃣  Open browser: http://192.168.4.1");
  Serial.println("4️⃣  Watch real-time data + debug messages");
  Serial.println("===========================================\n");
}

void loop() {
  webSocket.loop();

  // Send data to website every 200ms
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 200) {
    sendDataToWebsite();
    lastSend = millis();
  }

  // Check for fault events and send logs
  static bool lastCutP1 = false;
  static bool lastCutP2 = false;
  
  if (dataReceived) {
    // Phase 1 fault detected
    if (receivedData.cutP1 && !lastCutP1) {
      sendFaultLog("R", receivedData.faultTypeP1, receivedData.poleP1, receivedData.distanceP1);
    }
    lastCutP1 = receivedData.cutP1;
    
    // Phase 2 fault detected
    if (receivedData.cutP2 && !lastCutP2) {
      sendFaultLog("Y", receivedData.faultTypeP2, receivedData.poleP2, receivedData.distanceP2);
    }
    lastCutP2 = receivedData.cutP2;
  }

  // Check if data is stale
  if (dataReceived && (millis() - lastDataTime > 5000)) {
    Serial.println("⚠️  No data from ESP32 #1 for 5 seconds");
    dataReceived = false;
  }

  delay(10);
}
