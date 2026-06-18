const SERIAL_OPTIONS = { baudRate: 9600 };

const serial = new p5.WebSerial();
let sounds = [];
let portButton;
let statusMessage;
let storyState = 0; // which one should be playing
let defaultSound;
let seed1 = 0;
let seed2 = 0;
let seed3 = 0;
let serialOpening = false;
let serialConnected = false;

function preload() {
  let soundFiles = ["seed1_collage.mp3", "seed2_dre.mp3", "seed3_ximena.mp3"];
  soundFiles.forEach((file) => {
    sounds.push(loadSound(file));
  });
  defaultSound = loadSound("crickets.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  createSerialStatus();

  if (!navigator.serial) {
    setSerialStatus("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
    alert("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
    makePortButton();
    return;
  }

  setSerialStatus("Serial supported");
  navigator.serial.addEventListener("connect", portConnect);
  navigator.serial.addEventListener("disconnect", portDisconnect);

  serial.on("portavailable", () => openSelectedPort("manual selection"));
  serial.on("requesterror", portError);
  serial.on("openerror", portError);
  serial.on("readerror", portError);
  serial.on("writeerror", portError);
  serial.on("data", serialEvent);
  serial.on("close", handleSerialClose);

  makePortButton();
  attemptAutoConnect();

  defaultSound.loop();
}

function draw() {
}

function createSerialStatus() {
  statusMessage = createDiv("");
  statusMessage.position(10, 42);
  statusMessage.style("font-size", "12px");
  statusMessage.style("color", "whitesmoke");
  statusMessage.style("font-family", "Times New Roman, Times, serif");
  statusMessage.style("background", "black");
  statusMessage.style("padding", "4px 6px");
  statusMessage.style("border", "1px solid rgba(245, 245, 245, 0.4)");
  statusMessage.style("z-index", "10");
}

function setSerialStatus(message, error) {
  console.log(message);
  if (error) {
    console.error(error);
  }
  if (statusMessage) {
    statusMessage.html(message);
  }
}

async function attemptAutoConnect() {
  if (!navigator.serial || serialConnected || serialOpening) {
    return;
  }

  try {
    const approvedPorts = await navigator.serial.getPorts();
    if (approvedPorts.length === 0) {
      setSerialStatus("No approved serial port yet; use Choose Port");
      showPortButton();
      return;
    }

    setSerialStatus("Previously approved port found");
    serial.port = approvedPorts[0];
    serial.portInfo = serial.port.getInfo();
    openSelectedPort("previously approved port");
  } catch (err) {
    setSerialStatus("Serial connection failed", err);
    showPortButton();
  }
}

function makePortButton() {
  if (portButton) {
    return;
  }

  portButton = createButton("Choose Port");
  portButton.position(10, 10);
  portButton.mousePressed(choosePort);
}

function showPortButton() {
  makePortButton();
  if (portButton) {
    portButton.show();
  }
}

function hidePortButton() {
  if (portButton) {
    portButton.hide();
  }
}

function choosePort() {
  if (!navigator.serial) {
    setSerialStatus("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
    return;
  }

  if (serialConnected || serialOpening || serial.portOpen) {
    setSerialStatus("Arduino is already connected");
    hidePortButton();
    return;
  }

  serial.requestPort();
}

async function openSelectedPort(source) {
  if (serialConnected || serialOpening || serial.portOpen) {
    setSerialStatus("Arduino is already connected");
    hidePortButton();
    return;
  }

  serialOpening = true;
  setSerialStatus(`Opening serial port from ${source}`);

  try {
    await serial.open(SERIAL_OPTIONS);
    if (!serial.portOpen) {
      throw new Error("Serial port did not open");
    }
    serialConnected = true;
    setSerialStatus(source === "previously approved port" ? "Auto-connected to Arduino" : "Connected to Arduino");
    hidePortButton();
    serial.write("x");
  } catch (err) {
    setSerialStatus("Serial connection failed", err);
    showPortButton();
  } finally {
    serialOpening = false;
  }
}

function portError(err) {
  setSerialStatus("Serial connection failed", err);
  serialConnected = false;
  serialOpening = false;
  showPortButton();
}

function portConnect() {
  setSerialStatus("Serial device connected");
  attemptAutoConnect();
}

function portDisconnect() {
  setSerialStatus("Arduino disconnected");
  serialConnected = false;
  serialOpening = false;
  showPortButton();
}

function handleSerialClose() {
  setSerialStatus("Serial port closed");
  serialConnected = false;
  serialOpening = false;
  showPortButton();
}

function serialEvent() {
  let inString = serial.readStringUntil("\r\n");

  if (inString) {
    let sensors = split(inString, ",");
    if (sensors.length > 2) {
      seed1 = int(trim(sensors[0]));
      seed2 = int(trim(sensors[1]));
      seed3 = int(trim(sensors[2]));
    }
  }

  if (seed1 === 1 && seed2 === 0 && seed3 === 0) {
    playSound(0);
  }
  if (seed1 === 0 && seed2 === 1 && seed3 === 0) {
    playSound(1);
  }
  if (seed1 === 0 && seed2 === 0 && seed3 === 1) {
    playSound(2);
  }

  if (serialConnected || serial.portOpen) {
    serial.write("x");
  }
}

function playSound(activeIndex) {
  sounds.forEach((sound, index) => {
    if (index === activeIndex) {
      if (!sound.isPlaying()) {
        sound.play();
      }
    } else {
      if (sound.isPlaying()) {
        sound.stop();
      }
    }
  });

  storyState = activeIndex;
}
