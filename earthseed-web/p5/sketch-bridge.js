let sounds = [];
let statusMessage;
let socket = null;
let reconnectTimer = null;
let storyState = 0;
let defaultSound;
let seed1 = 0;
let seed2 = 0;
let seed3 = 0;

function preload() {
  let soundFiles = ["seed1_collage.mp3", "seed2_dre.mp3", "seed3_ximena.mp3"];
  soundFiles.forEach((file) => {
    sounds.push(loadSound(file));
  });
  defaultSound = loadSound("crickets.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  createBridgeStatus();
  connectBridge();
  defaultSound.loop();
}

function draw() {
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
  seed1 = int(state.seed1);
  seed2 = int(state.seed2);
  seed3 = int(state.seed3);

  if (seed1 === 1 && seed2 === 0 && seed3 === 0) {
    playSound(0);
  }
  if (seed1 === 0 && seed2 === 1 && seed3 === 0) {
    playSound(1);
  }
  if (seed1 === 0 && seed2 === 0 && seed3 === 1) {
    playSound(2);
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
