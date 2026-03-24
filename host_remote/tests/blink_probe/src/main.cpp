 #include <Arduino.h>                                                                                                                                                               
                                                                                                                                                                                     
  static constexpr int kLedPin = 2;                                                                                                                                                  
                                                                                                                                                                                     
  void setup() {                                                                                                                                                                     
    Serial.begin(115200);                                                                                                                                                            
    pinMode(kLedPin, OUTPUT);                                                                                                                                                        
    Serial.println("blink probe start");                                                                                                                                             
  }                                                                                                                                                                                  
                                                                                                                                                                                     
  void loop() {                                                                                                                                                                      
    digitalWrite(kLedPin, HIGH);                                                                                                                                                     
    Serial.println("LED ON");                                                                                                                                                        
    delay(500);                                                                                                                                                                      
                                                                                                                                                                                     
    digitalWrite(kLedPin, LOW);                                                                                                                                                      
    Serial.println("LED OFF");                                                                                                                                                       
    delay(500);                                                                                                                                                                      
  }   