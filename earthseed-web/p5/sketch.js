

//let serial;

const serial = new p5.WebSerial();
let sounds = [];
let portButton;
let inData;
let outByte = 0; // for outgoing data
let storyState = 0; // which one should be playing
let audioState = 0; // has it already been playing
let defaultSound;
let seed1=0; //
let seed2=0;
let seed3=0;


function preload() {
  // Load sounds into the array
  let soundFiles = ["seed1_collage.mp3", "seed2_dre.mp3", "seed3_ximena.mp3"];
  soundFiles.forEach((file) => {
    sounds.push(loadSound(file));
  });
  defaultSound = loadSound("crickets.mp3");
  
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  if (!navigator.serial) {
    alert("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
  }
  console.log("we are in setup");
  console.log(serial);
  // if serial is available, add connect/disconnect listeners:
  navigator.serial.addEventListener("connect", portConnect);
  navigator.serial.addEventListener("disconnect", portDisconnect);
  // check for any ports that are available:
  serial.getPorts();
  // if there's no port chosen, choose one:
  serial.on("noport", makePortButton);
  // open whatever port is available:
  serial.on("portavailable", openPort);
  // handle serial errors:
  serial.on("requesterror", portError);
  // handle any incoming serial data:
  serial.on("data", serialEvent);
  serial.on("close", makePortButton);
  
 defaultSound.loop();
}

function draw() {
  // if there's no port selected,
  // make a port select button appear:
}

function makePortButton() {
  // create and position a port chooser button:
  portButton = createButton("choose port");
  portButton.position(10, 10);
  // give the port button a mousepressed handler:
  portButton.mousePressed(choosePort);
}

// make the port selector window appear:
function choosePort() {
  if (portButton) portButton.show();
  serial.requestPort();
}

// open the selected port, and make the port
// button invisible:
function openPort() {
  // wait for the serial.open promise to return,
  // then call the initiateSerial function
  serial.open().then(initiateSerial);

  // once the port opens, let the user know:
  function initiateSerial() {
    console.log("port open");
  }
  // hide the port button once a port is chosen:
  if (portButton) portButton.hide();
}

// pop up an alert if there's a port error:
function portError(err) {
  alert("Serial port error: " + err);
}

// try to connect if a new serial port
// gets added (i.e. plugged in via USB):
function portConnect() {
  console.log("port connected");
  serial.getPorts();
}

// if a port is disconnected:
function portDisconnect() {
  serial.close();
  console.log("port disconnected");
}

function closePort() {
  serial.close();
}

function serialEvent() {
  let inString = serial.readStringUntil("\r\n");
  
  //READS AND ASSIGNS SOUNDS
  if (inString) {
    // split the string on the commas:
    var sensors = split(inString, ",");
    if (sensors.length > 2) {
      // if there are three elements
      // element 0 is the locH:
      seed1 = sensors[0];
      // element 1 is the locV:
      seed2 = sensors[1];
      // element 2 is the button:
      seed3 = sensors[2] ;
    }
  }
      //if the index is a number and if its between 0 - 4 when i finish and if the index is different from the audio state; if its acutally changing
      //storyState = index+1;
  if (seed1 ==1 && seed2 ==0 && seed3 ==0){
    playSound(0);
  }
    if (seed1 ==0 && seed2 ==1 && seed3 ==0){
    playSound(1);
  }
    if (seed1 ==0 && seed2 ==0 && seed3 ==1){
    playSound(2);
  }


    //console.log(storyState); //
    serial.write("x"); // Tell Arduino about the current state
  
}

// Function to play a sound and stop all others
function playSound(activeIndex) {
  sounds.forEach((sound, index) => {
    if (index === activeIndex) {
      if (!sound.isPlaying()) {
        sound.play();
      }
    } else {
      if (sound.isPlaying()) {
        sound.stop();
        /// play default
      }
    }
  });

  storyState = activeIndex; // Update the story state
}

/////////////////////////////////////////////
// UTILITY FUNCTIONS TO MAKE CONNECTIONS  ///
/////////////////////////////////////////////

// if there's no port selected,
// make a port select button appear:
function makePortButton() {
  // create and position a port chooser button:
  portButton = createButton("choose port");
  portButton.position(10, 10);
  // give the port button a mousepressed handler:
  portButton.mousePressed(choosePort);
}

// make the port selector window appear:
function choosePort() {
  serial.requestPort();
}

// open the selected port, and make the port
// button invisible:
function openPort() {
  // wait for the serial.open promise to return,
  // then call the initiateSerial function
  serial.open().then(initiateSerial);

  // once the port opens, let the user know:
  function initiateSerial() {
    console.log("port open");
    serial.write("x"); // insertSongv
  }
  // hide the port button once a port is chosen:
  if (portButton) portButton.hide();
}

// pop up an alert if there's a port error:
function portError(err) {
  alert("Serial port error: " + err);
}

// try to connect if a new serial port
// gets added (i.e. plugged in via USB):
function portConnect() {
  console.log("port connected");
  serial.getPorts();
}

// if a port is disconnected:
function portDisconnect() {
  serial.close();
  console.log("port disconnected");
}
