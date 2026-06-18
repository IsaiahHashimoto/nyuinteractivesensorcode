//const int sensorPin = 5;        // Capacitive sensor pin
//const int ledPin = 6;            // LED pin

const int seedLights = 3;
int lightPins[seedLights] = { 6, 10, 3 };
int cs[seedLights] = { 5, 9, 2 };
int sensorstate[seedLights] = { 0, 0, 0 };
int statechange[seedLights] = { 0, 0, 0 };


int lightState = 0;
int storyVar = 5;  //one more than the amount of sound files

int defaultBrightness = 255;  // Default LED brightness
int touchBrightness = 255;   // LED brightness when touch is detected


void setup() {
  for (int i = 0; i < seedLights; ++i) {
    pinMode(cs[i], INPUT_PULLUP);   //indexes capacitive
    pinMode(lightPins[i], OUTPUT);  // indexes lights
    analogWrite(lightPins[i], defaultBrightness);
  }
  //analogWrite(ledPin, defaultBrightness);
  Serial.begin(9600);
}

void loop() {
  //analogWrite(ledPin, defaultBrightness);

  for (int i = 0; i < seedLights; i++) {
    sensorstate[i] = digitalRead(cs[i]);  // Assuming sensorPin[] is defined somewhere

    if (sensorstate[i] != statechange[i]) {  //if senses capacitive touch, changes light state
      if (sensorstate[i] == HIGH) {
        analogWrite(lightPins[i], touchBrightness);  // Brighten light when touched
        storyVar = i;
      } else {
        // Serial.print(lightPins[i]);
      }
      statechange[i] = sensorstate[i];
    }

    else if (statechange[i] == HIGH) {
      analogWrite(lightPins[i], touchBrightness);  // Brighten light when touched
    } else {
      analogWrite(lightPins[i], defaultBrightness);  // Dim light when not touched
    }
  }

  

  // Serial.print(sensorstate[0]);
  // Serial.print(", ");
  // Serial.print(sensorstate[1]);
  // Serial.print(", ");
  // Serial.println(sensorstate[2]);




  // Serial.print(lightPins[i]);
  // Serial.print(", ");
  // Serial.println(sensorState);
  //   if (sensorState == HIGH) {
  //     analogWrite(lightPins[i], touchBrightness);  // Brighten light when touched
  //     Serial.print(lightPins[i]);
  //     Serial.print(", ");
  //     Serial.print(touchBrightness);
  //     delay(500);
  //     Serial.println(".  TOUCH");
  //   } else {
  //     Serial.print(lightPins[i]);
  //     Serial.print(", ");
  //     Serial.print(defaultBrightness);
  //     analogWrite(lightPins[i], defaultBrightness);  // Dim light when not touched
  //     Serial.println(".  NOTOUCH");
  //   }
  // }

  //handles light state
  if (lightState >= 0 && lightState < seedLights) {
    for (int i = 0; i < seedLights; ++i) {
      
       //analogWrite(lightPins[i], i == lightState ? 255 : 10);
    }
  }
  //serial communication
  if (Serial.available() > 0) {
    lightState = Serial.read();

    Serial.print(sensorstate[0]);
    Serial.print(", ");
    Serial.print(sensorstate[1]);
    Serial.print(", ");
    Serial.println(sensorstate[2]);
    //Serial.println(storyVar);
  }

  delay(10);
}
