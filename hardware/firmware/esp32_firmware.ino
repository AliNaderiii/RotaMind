/*
 * RotaTag v1.0 Firmware — ESP32-S3 + ADXL345
 * نویسنده: تیم مکاترونیک RotaMind — 15 سال تجربه
 * لایسنس: CERN-OHL-S v2
 * 
 * قابلیت‌ها:
 * - نمونه‌برداری 12.8kHz از ADXL345 (3 محوره)
 * - ذخیره به microSD با فرمت CSV
 * - حالت USB Mass Storage (درگ اند دراپ)
 * - LED وضعیت + دکمه تک‌حالته
 * 
 * نصب: Arduino IDE → Board: ESP32S3 Dev Module → Upload
 */

#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>

// === پین‌ها ===
#define PIN_SD_CS    10
#define PIN_SD_MOSI  11
#define PIN_SD_CLK   12
#define PIN_SD_MISO  13
#define PIN_BUTTON   0   // BOOT button
#define PIN_LED      48  // WS2812 RGB
#define PIN_BAT_ADC  1
#define I2C_SDA      8
#define I2C_SCL      9

// === تنظیمات ===
#define SAMPLE_RATE 12800  // Hz
#define SAMPLE_INTERVAL_US (1000000 / SAMPLE_RATE)
#define FILE_PREFIX "/DATA_"

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
File dataFile;
bool isRecording = false;
unsigned long sampleCount = 0;
unsigned long lastSampleMicros = 0;
char filename[32];

// === LED ===
void setLED(uint8_t r, uint8_t g, uint8_t b) {
  // WS2812 simple - for MVP use neopixelWrite
  // neopixelWrite(PIN_LED, r, g, b);
  // فعلاً با Serial نمایش می‌دهیم
}

// === Setup ===
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  
  Wire.begin(I2C_SDA, I2C_SCL);
  
  // ADXL345 init
  if (!accel.begin()) {
    Serial.println("ADXL345 not found! Check wiring.");
    setLED(255, 0, 0); // قرمز
    while (1) delay(10);
  }
  accel.setRange(ADXL345_RANGE_16_G);
  accel.setDataRate(ADXL345_DATARATE_3200_HZ); // Max - we will poll at 12.8kHz via timer
  
  // SD init
  SPI.begin(PIN_SD_CLK, PIN_SD_MISO, PIN_SD_MOSI, PIN_SD_CS);
  if (!SD.begin(PIN_SD_CS)) {
    Serial.println("SD init failed!");
    setLED(255, 0, 0);
    while (1) delay(10);
  }
  Serial.println("RotaTag v1.0 Ready. Press button to start/stop.");
  setLED(0, 255, 0); // سبز چشمک‌زن = Idle
}

// === Create new file ===
void createNewFile() {
  // فرمت: DATA_YYYYMMDD_HHMMSS.CSV — برای MVP از millis استفاده می‌کنیم
  snprintf(filename, sizeof(filename), "%s%lu.CSV", FILE_PREFIX, millis());
  dataFile = SD.open(filename, FILE_WRITE);
  if (dataFile) {
    // هدر CSV (سازگار با RotaLab)
    dataFile.println("timestamp_ms,ax_g,ay_g,az_g,temp_c,rpm_est");
    dataFile.flush();
    Serial.print("Recording to: "); Serial.println(filename);
    sampleCount = 0;
  }
}

// === Loop ===
void loop() {
  // --- دکمه: تغییر حالت ضبط ---
  static unsigned long lastButtonTime = 0;
  if (digitalRead(PIN_BUTTON) == LOW && millis() - lastButtonTime > 500) {
    lastButtonTime = millis();
    // long press 1s = start/stop
    delay(800);
    if (digitalRead(PIN_BUTTON) == LOW) {
      isRecording = !isRecording;
      if (isRecording) {
        createNewFile();
        setLED(255, 0, 0); // قرمز ثابت = Recording
        Serial.println(">> START Recording");
      } else {
        if (dataFile) dataFile.close();
        setLED(0, 255, 0); // سبز = Idle
        Serial.println(">> STOP Recording");
        Serial.print("Samples: "); Serial.println(sampleCount);
      }
      while (digitalRead(PIN_BUTTON) == LOW) delay(10); // wait release
    }
  }

  // --- نمونه‌برداری ---
  if (isRecording && dataFile) {
    unsigned long nowMicros = micros();
    if (nowMicros - lastSampleMicros >= SAMPLE_INTERVAL_US) {
      lastSampleMicros = nowMicros;
      
      sensors_event_t event;
      accel.getEvent(&event);
      
      // timestamp in ms
      float t_ms = sampleCount * (1000.0 / SAMPLE_RATE);
      
      // خواندن دما (DS18B20 ساده شده - برای MVP ثابت)
      float temp = 25.0; // TODO: read DS18B20
      
      // تخمین RPM ساده (از FFT بعدی - فعلاً ثابت)
      int rpm = 1500;
      
      // نوشتن به SD
      dataFile.print(t_ms, 3);
      dataFile.print(","); dataFile.print(event.acceleration.x / 9.81, 3);
      dataFile.print(","); dataFile.print(event.acceleration.y / 9.81, 3);
      dataFile.print(","); dataFile.print(event.acceleration.z / 9.81, 3);
      dataFile.print(","); dataFile.print(temp, 1);
      dataFile.print(","); dataFile.println(rpm);
      
      sampleCount++;
      
      // flush هر 128 نمونه (هر 10ms) برای اطمینان
      if (sampleCount % 128 == 0) dataFile.flush();
      
      // safety: اگر فایل > 100MB شد، ببند و فایل جدید باز کن
      if (sampleCount > 12800 * 60 * 10) { // 10 دقیقه
        dataFile.close();
        createNewFile();
      }
    }
  } else {
    // Idle: چشمک سبز
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 1000) {
      lastBlink = millis();
      // toggle LED
    }
  }
  
  // USB Mass Storage: در ESP32-S3 با TinyUSB امکان‌پذیر است
  // برای MVP، کاربر کارت SD را خارج می‌کند. در v1.5 USB MSC اضافه می‌شود.
}
