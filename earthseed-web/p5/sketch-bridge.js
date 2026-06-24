const STORY_TRACKS = {
  seed1: ["storyaudio1.mp3", "storyaudio2.mp3", "storyaudio3.mp3"],
  seed2: ["storyaudio4.mp3", "storyaudio5.mp3", "storyaudio6.mp3"],
  seed3: ["storyaudio7.mp3", "storyaudio8.mp3", "storyaudio9.mp3"]
};

let sounds = {};
let activeStory = null;
let pendingStory = null;
let statusMessage;
let playbackMessage;
let socket = null;
let reconnectTimer = null;
let defaultSound;
let audioButton;
let testButton;
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
  createTestButton();
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
  playbackMessage = createDiv("");
  playbackMessage.position(10, 74);
  playbackMessage.style("font-size", "12px");
  playbackMessage.style("color", "whitesmoke");
  playbackMessage.style("font-family", "Times New Roman, Times, serif");
  playbackMessage.style("background", "black");
  playbackMessage.style("padding", "4px 6px");
  playbackMessage.style("border", "1px solid rgba(245, 245, 245, 0.4)");
  playbackMessage.style("z-index", "10");
  updatePlaybackStatus();
}

function createAudioButton() {
  audioButton = createButton("Start Audio");
  audioButton.position(10, 42);
  audioButton.mousePressed(startAudio);
}

function createTestButton() {
  testButton = createButton("Test Story");
  testButton.position(110, 42);
  testButton.mousePressed(() => switchStory("seed1"));
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

function updatePlaybackStatus() {
  if (!playbackMessage) {
    return;
  }

  let playbackText = activeStory ? `playing ${activeStory.file}` : "no story playing";
  if (pendingStory) {
    playbackText = `waiting to play ${pendingStory.file}`;
  }
  playbackMessage.html(playbackText);
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
      playPendingStory();
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

  switchOnSensorAdvances(sensorState);
  previousSensorState = sensorState;
}

function switchOnSensorAdvances(sensorState) {
  Object.keys(STORY_TRACKS).forEach((seedKey) => {
    if (previousSensorState[seedKey] === 0 && sensorState[seedKey] === 1) {
      switchStory(seedKey);
    }
  });
}

function switchStory(seedKey) {
  let file = nextStoryFile(seedKey);
  playStory({ seed: seedKey, file });
}

function nextStoryFile(seedKey) {
  let files = STORY_TRACKS[seedKey];
  let index = storyIndexes[seedKey] % files.length;
  storyIndexes[seedKey] += 1;
  return files[index];
}

function playStory(story) {
  audioStarted = getAudioContext().state === "running";
  if (!audioStarted) {
    pendingStory = story;
    setBridgeStatus("Audio blocked; click Start Audio");
    showAudioButton();
    updatePlaybackStatus();
    return;
  }

  pendingStory = null;
  stopActiveStory();
  let sound = sounds[story.file];
  if (!sound) {
    console.error(`Missing sound file: ${story.file}`);
    updatePlaybackStatus();
    return;
  }

  activeStory = story;
  console.log(`Playing ${story.file} from ${story.seed}`);
  updatePlaybackStatus();
  sound.play();
}

function playPendingStory() {
  if (pendingStory) {
    playStory(pendingStory);
  }
}

function stopActiveStory() {
  if (!activeStory) {
    return;
  }

  let previousStory = activeStory;
  activeStory = null;
  let sound = sounds[previousStory.file];
  if (sound && sound.isPlaying()) {
    console.log(`Stopping ${previousStory.file} for a new sensor selection`);
    sound.stop();
  }
}

function finishActiveStory(file) {
  if (!activeStory || activeStory.file !== file) {
    return;
  }

  console.log(`Finished ${file}`);
  activeStory = null;
  updatePlaybackStatus();
}

function mousePressed() {
  startAudio();
}

function touchStarted() {
  startAudio();
}
