# ESP32 API Documentation

This document provides examples for ESP32 devices to interact with the IoT dashboard.

## Available Endpoints

All endpoints are available at: `https://YOUR_SUPABASE_URL/functions/v1/`

### 1. Device Registration

Register or update a device in the system.

**Endpoint:** `POST /esp32-register`

**Example (Arduino/ESP32):**

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void registerDevice() {
  HTTPClient http;

  String url = "https://YOUR_SUPABASE_URL/functions/v1/esp32-register";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");

  StaticJsonDocument<512> doc;
  doc["device_id"] = "WP01-D004";
  doc["project_id"] = "WP01";
  doc["role"] = "regular";
  doc["auto_update"] = true;
  doc["tank_shape"] = "cylinder";
  doc["height_cm"] = 200;
  doc["width_cm"] = 100;
  doc["max_flow_in"] = 10.0;
  doc["max_flow_out"] = 5.0;
  doc["pump_lower_threshold"] = 15.0;
  doc["pump_upper_threshold"] = 95.0;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}
```

### 2. Upload Telemetry Data

Upload sensor readings to the dashboard.

**Endpoint:** `POST /esp32-upload`

**Example (Arduino/ESP32):**

```cpp
void uploadTelemetry(float level, bool pumpOn, float flowOut, float flowIn) {
  HTTPClient http;

  String url = "https://YOUR_SUPABASE_URL/functions/v1/esp32-upload";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");

  StaticJsonDocument<512> doc;
  doc["project_id"] = "WP01";
  doc["device_id"] = "WP01-D004";
  doc["data_type"] = "water_pump";

  JsonObject data = doc.createNestedObject("data");
  data["level_pct"] = level;
  data["pump_on"] = pumpOn;
  data["flow_out_lpm"] = flowOut;
  data["flow_in_lpm"] = flowIn;
  data["net_flow_lpm"] = flowIn - flowOut;
  data["manual_switch_status"] = digitalRead(MANUAL_SWITCH_PIN);

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}
```

### 3. Read Device Configuration

Get device configuration including thresholds and settings.

**Endpoint:** `GET /esp32-config?device_id=DEVICE_ID`

**Example (Arduino/ESP32):**

```cpp
void readDeviceConfig() {
  HTTPClient http;

  String url = "https://YOUR_SUPABASE_URL/functions/v1/esp32-config?device_id=WP01-D004";
  http.begin(url);
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");

  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();

    StaticJsonDocument<1024> doc;
    deserializeJson(doc, response);

    if (doc["success"]) {
      JsonObject device = doc["device"];

      float pumpLowerThreshold = device["pump_lower_threshold"];
      float pumpUpperThreshold = device["pump_upper_threshold"];
      float maxFlowIn = device["max_flow_in"];
      float maxFlowOut = device["max_flow_out"];
      int manualSwitch = device["manual_switch"];
      bool autoUpdate = device["auto_update"];

      Serial.println("Device config received:");
      Serial.printf("Pump Lower: %.1f%%\n", pumpLowerThreshold);
      Serial.printf("Pump Upper: %.1f%%\n", pumpUpperThreshold);
      Serial.printf("Manual Switch: %d\n", manualSwitch);
    }
  }

  http.end();
}
```

### 4. Read Manual Switch Status

Check the current manual switch state.

**Endpoint:** `GET /esp32-switch?device_id=DEVICE_ID`

**Example (Arduino/ESP32):**

```cpp
int readManualSwitch() {
  HTTPClient http;

  String url = "https://YOUR_SUPABASE_URL/functions/v1/esp32-switch?device_id=WP01-D004";
  http.begin(url);
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");

  int httpCode = http.GET();
  int switchState = 0;

  if (httpCode > 0) {
    String response = http.getString();

    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);

    switchState = doc["manual_switch"];
    Serial.printf("Manual switch state: %d\n", switchState);
  }

  http.end();
  return switchState;
}
```

### 5. Write Manual Switch Status

Update the manual switch state from the device.

**Endpoint:** `POST /esp32-switch?device_id=DEVICE_ID`

**Example (Arduino/ESP32):**

```cpp
void writeManualSwitch(int state) {
  HTTPClient http;

  String url = "https://YOUR_SUPABASE_URL/functions/v1/esp32-switch?device_id=WP01-D004";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");

  StaticJsonDocument<128> doc;
  doc["manual_switch"] = state;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}
```

## Complete Example: Water Pump Controller

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* supabaseUrl = "https://YOUR_SUPABASE_URL";
const char* anonKey = "YOUR_ANON_KEY";
const char* deviceId = "WP01-D004";
const char* projectId = "WP01";

// Pin definitions
#define LEVEL_SENSOR_PIN 34
#define PUMP_PIN 25
#define MANUAL_SWITCH_PIN 26

// Thresholds (will be updated from server)
float pumpLowerThreshold = 15.0;
float pumpUpperThreshold = 95.0;
int manualSwitchState = 0;

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(MANUAL_SWITCH_PIN, INPUT_PULLUP);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Register device
  registerDevice();

  // Read initial configuration
  readDeviceConfig();
}

void loop() {
  // Read sensors
  float waterLevel = readWaterLevel();
  bool pumpOn = digitalRead(PUMP_PIN);
  float flowOut = random(20, 30) / 10.0;
  float flowIn = pumpOn ? random(80, 100) / 10.0 : 0;

  // Check manual switch from dashboard
  int dashboardSwitch = readManualSwitch();

  // Control logic
  if (dashboardSwitch == 1) {
    // Manual mode - turn on pump
    digitalWrite(PUMP_PIN, HIGH);
  } else if (waterLevel >= pumpUpperThreshold) {
    // Auto mode - turn off when full
    digitalWrite(PUMP_PIN, LOW);
    // Reset manual switch when upper threshold reached
    writeManualSwitch(0);
  } else if (waterLevel <= pumpLowerThreshold) {
    // Auto mode - turn on when low
    digitalWrite(PUMP_PIN, HIGH);
  }

  // Upload telemetry
  uploadTelemetry(waterLevel, digitalRead(PUMP_PIN), flowOut, flowIn);

  // Update configuration every 10 cycles
  static int cycleCount = 0;
  if (++cycleCount >= 10) {
    readDeviceConfig();
    cycleCount = 0;
  }

  delay(5000); // Upload every 5 seconds
}

float readWaterLevel() {
  int rawValue = analogRead(LEVEL_SENSOR_PIN);
  return map(rawValue, 0, 4095, 0, 100);
}

void registerDevice() {
  // Implementation from example above
}

void uploadTelemetry(float level, bool pumpOn, float flowOut, float flowIn) {
  // Implementation from example above
}

void readDeviceConfig() {
  // Implementation from example above
  // Updates: pumpLowerThreshold, pumpUpperThreshold, manualSwitchState
}

int readManualSwitch() {
  // Implementation from example above
  return 0;
}

void writeManualSwitch(int state) {
  // Implementation from example above
}
```

## Notes

- **Manual Switch Auto-Reset:** When water level reaches `pump_upper_threshold`, the manual switch automatically resets to 0 (OFF)
- **Telemetry Frequency:** Upload data every 5-60 seconds depending on your requirements
- **Configuration Updates:** Poll for configuration changes every 30-60 seconds
- **Error Handling:** Always check HTTP response codes and handle errors appropriately
- **Power Management:** Consider using deep sleep between readings to save power
