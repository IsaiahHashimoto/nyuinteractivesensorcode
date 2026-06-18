const path = require("path");
const express = require("express");
const http = require("http");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { WebSocket, WebSocketServer } = require("ws");

const HTTP_PORT = Number(process.env.PORT || 3001);
const SERIAL_PATH = process.env.SERIAL_PATH || "/dev/ttyACM0";
const BAUD_RATE = Number(process.env.BAUD_RATE || 9600);
const RECONNECT_DELAY_MS = Number(process.env.RECONNECT_DELAY_MS || 3000);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let serialPort = null;
let reconnectTimer = null;
let latestSensorState = null;

app.use(express.static(path.join(__dirname)));

server.listen(HTTP_PORT, () => {
  console.log(`Web server listening at http://localhost:${HTTP_PORT}`);
  connectSerial();
});

wss.on("connection", (socket) => {
  console.log("Browser connected");

  if (latestSensorState) {
    socket.send(JSON.stringify(latestSensorState));
  }

  socket.on("close", () => {
    console.log("Browser disconnected");
  });
});

function connectSerial() {
  if (serialPort && serialPort.isOpen) {
    return;
  }

  clearReconnectTimer();
  console.log(`Opening serial port ${SERIAL_PATH} at ${BAUD_RATE} baud`);

  serialPort = new SerialPort({
    path: SERIAL_PATH,
    baudRate: BAUD_RATE,
    autoOpen: false
  });

  const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  serialPort.open((err) => {
    if (err) {
      console.log(`Serial connection failed: ${err.message}`);
      scheduleReconnect();
      return;
    }

    console.log("Serial port opened");
    requestArduinoState();
  });

  parser.on("data", (line) => {
    console.log(`Serial data received: ${line}`);
    const sensorState = parseSensorLine(line);
    if (!sensorState) {
      return;
    }

    latestSensorState = sensorState;
    broadcast(sensorState);
    requestArduinoState();
  });

  serialPort.on("error", (err) => {
    console.log(`Serial error: ${err.message}`);
  });

  serialPort.on("close", () => {
    console.log("Arduino disconnected");
    scheduleReconnect();
  });
}

function parseSensorLine(line) {
  const values = line.split(",").map((value) => Number(value.trim()));
  if (values.length < 3 || values.some((value) => Number.isNaN(value))) {
    console.log(`Ignoring invalid serial line: ${line}`);
    return null;
  }

  return {
    seed1: values[0],
    seed2: values[1],
    seed3: values[2]
  };
}

function requestArduinoState() {
  if (!serialPort || !serialPort.isOpen) {
    return;
  }

  serialPort.write("x", (err) => {
    if (err) {
      console.log(`Serial write failed: ${err.message}`);
    }
  });
}

function broadcast(message) {
  const payload = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  console.log("Reconnecting...");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSerial();
  }, RECONNECT_DELAY_MS);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}
