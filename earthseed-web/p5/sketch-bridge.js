const STORY_TRACKS = {
  seed1: ["seed1_collage.mp3", "jimmy1.mp3"],
  seed2: ["seed2_dre.mp3", "nina1.mp3"],
  seed3: ["seed3_ximena.mp3", "sherri1.mp3"]
};
const MAX_QUEUE_LENGTH = 12;

let sounds = {};
let storyQueue = [];
let activeStory = null;
let statusMessage;
let queueMessage;
let socket = null;
let reconnectTimer = null;
let defaultSound;
let audioButton;
let audioStarted = false;
let previousSensorState = { seed1: 0, seed2: 0, seed3: 0 };
let storyIndexes = { seed1: 0, seed2: 0, seed3: 0 };

function preload() {
  Object.values(STORY_TRACKS).flat().forEach((file) => {
    sounds[file] = loadSound(file);
  });
  defaultSound = loadSound("crickets.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  attachStoryEndHandlers();
  createBridgeStatus();
  createAudioButton();
  connectBridge();
  startAudio();
}

function draw() {
}

function attachStoryEndHandlers() {
  Object.entries(sounds).forEach(([file, sound]) => {
    sound.onended(() => finishActiveStory(file));
  });
}

function createBridgeStatus() {
  statusMessage = createDiv("");
  statusMessage.position(10, 10);
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

function createAudioButton() {
  audioButton = createButton("Start Audio");
  audioButton.position(10, 42);
  audioButton.mousePressed(startAudio);
}

function setBridgeStatus(message, error) {
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

async function startAudio() {
  try {
    await userStartAudio();
    audioStarted = getAudioContext().state === "running";

    if (audioStarted) {
      if (defaultSound && !defaultSound.isPlaying()) {
        defaultSound.loop();
      }
      if (audioButton) {
        audioButton.hide();
      }
      playNextQueuedStory();
      setBridgeStatus(socket && socket.readyState === WebSocket.OPEN ? "Connected to local serial bridge" : "Audio ready");
    } else {
      showAudioButton();
    }
  } catch (err) {
    setBridgeStatus("Audio blocked; click Start Audio", err);
    showAudioButton();
  }
}

function showAudioButton() {
  if (audioButton) {
    audioButton.show();
  }
}

function connectBridge() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  setBridgeStatus("Connecting to local serial bridge");

  socket.addEventListener("open", () => {
    setBridgeStatus("Connected to local serial bridge");
  });

  socket.addEventListener("message", (event) => {
    try {
      handleSensorState(JSON.parse(event.data));
    } catch (err) {
      setBridgeStatus("Invalid bridge message", err);
    }
  });

  socket.addEventListener("close", () => {
    setBridgeStatus("Local serial bridge disconnected; reconnecting...");
    scheduleBridgeReconnect();
  });

  socket.addEventListener("error", (err) => {
    setBridgeStatus("Local serial bridge error", err);
  });
}

function scheduleBridgeReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectBridge();
  }, 3000);
}

function handleSensorState(state) {
  let sensorState = {
    seed1: int(state.seed1),
    seed2: int(state.seed2),
    seed3: int(state.seed3)
  };

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
  if (storyQueue.length >= MAX_QUEUE_LENGTH) {
    console.log(`Story queue full; ignoring ${seedKey}`);
    return;
  }

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
  audioStarted = getAudioContext().state === "running";
  if (!audioStarted) {
    setBridgeStatus("Audio blocked; click Start Audio");
    showAudioButton();
    updateQueueStatus();
    return;
  }

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

function mousePressed() {
  startAudio();
}

function touchStarted() {
  startAudio();
}
