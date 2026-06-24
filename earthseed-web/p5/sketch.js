const SERIAL_OPTIONS = { baudRate: 9600 };
const STORY_TRACKS = {
  seed1: ["storyaudio1.mp3", "storyaudio2.mp3", "storyaudio3.mp3"],
  seed2: ["storyaudio4.mp3", "storyaudio5.mp3", "storyaudio6.mp3"],
  seed3: ["storyaudio7.mp3", "storyaudio8.mp3", "storyaudio9.mp3"]
};

const serial = new p5.WebSerial();
let sounds = {};
let storyQueue = [];
let activeStory = null;
let portButton;
let statusMessage;
let queueMessage;
let defaultSound;
let previousSensorState = { seed1: 0, seed2: 0, seed3: 0 };
let storyIndexes = { seed1: 0, seed2: 0, seed3: 0 };
let serialOpening = false;
let serialConnected = false;

function preload() {
  Object.values(STORY_TRACKS).flat().forEach((file) => {
    sounds[file] = loadSound(file);
  });
  defaultSound = loadSound("crickets.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  attachStoryEndHandlers();
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

function attachStoryEndHandlers() {
  Object.entries(sounds).forEach(([file, sound]) => {
    sound.onended(() => finishActiveStory(file));
  });
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

  queueMessage = createDiv("");
  queueMessage.position(10, 74);
  queueMessage.style("font-size", "12px");
  queueMessage.style("color", "whitesmoke");
  queueMessage.style("font-family", "Times New Roman, Times, serif");
  queueMessage.style("background", "black");
  queueMessage.style("padding", "4px 6px");
  queueMessage.style("border", "1px solid rgba(245, 245, 245, 0.4)");
  queueMessage.style("z-index", "10");
  updateQueueStatus();
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

function updateQueueStatus() {
  if (!queueMessage) {
    return;
  }

  let activeText = activeStory ? `playing ${activeStory.file}` : "no story playing";
  queueMessage.html(`${activeText}; queue ${storyQueue.length}`);
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
      handleSensorState({
        seed1: int(trim(sensors[0])),
        seed2: int(trim(sensors[1])),
        seed3: int(trim(sensors[2]))
      });
    }
  }

  if (serialConnected || serial.portOpen) {
    serial.write("x");
  }
}

function handleSensorState(sensorState) {
  enqueueSensorAdvances(sensorState);
  previousSensorState = sensorState;
}

function enqueueSensorAdvances(sensorState) {
  Object.keys(STORY_TRACKS).forEach((seedKey) => {
    if (previousSensorState[seedKey] === 0 && sensorState[seedKey] === 1) {
      enqueueStory(seedKey);
    }
  });
}

function enqueueStory(seedKey) {
  let file = nextStoryFile(seedKey);
  storyQueue.push({ seed: seedKey, file });
  console.log(`Queued ${file} from ${seedKey}`);
  updateQueueStatus();
  playNextQueuedStory();
}

function nextStoryFile(seedKey) {
  let files = STORY_TRACKS[seedKey];
  let index = storyIndexes[seedKey] % files.length;
  storyIndexes[seedKey] += 1;
  return files[index];
}

function playNextQueuedStory() {
  if (activeStory || storyQueue.length === 0) {
    updateQueueStatus();
    return;
  }

  activeStory = storyQueue.shift();
  let sound = sounds[activeStory.file];
  if (!sound) {
    console.error(`Missing sound file: ${activeStory.file}`);
    activeStory = null;
    playNextQueuedStory();
    return;
  }

  console.log(`Playing ${activeStory.file} from ${activeStory.seed}`);
  updateQueueStatus();
  sound.play();
}

function finishActiveStory(file) {
  if (!activeStory || activeStory.file !== file) {
    return;
  }

  console.log(`Finished ${file}`);
  activeStory = null;
  updateQueueStatus();
  playNextQueuedStory();
}
