# Raspberry Pi Installation Design

## Summary

This project should run as a self-contained installation on a Raspberry Pi instead
of a laptop. The recommended design keeps the Arduino responsible for the
physical sensor and LED layer, while the Raspberry Pi replaces the laptop as the
web/audio computer.

The Pi will run a local web app in Chromium kiosk mode. A small Node server will
read sensor states from the Arduino over USB serial and send those states to the
p5.js sketch over WebSocket. The browser will play the existing story audio files
when visitors touch one of the three seed sensors.

## Goals

- Boot into the experience without needing a laptop.
- Keep the existing Arduino wiring and sensor behavior as stable as possible.
- Avoid the browser WebSerial permission prompt during normal operation.
- Preserve the current web flow: intro, passcode, success page, story playback.
- Make the installation easy to restart after power loss.

## Non-Goals

- Replacing the Arduino with Raspberry Pi GPIO in the first version.
- Rebuilding the visual design of the web pages.
- Adding remote deployment, analytics, or internet-dependent behavior.
- Supporting multiple browsers during installation playback.

## Current System

The current project has two main runtimes:

- `earthseed-arduino.ino`
  - Reads three capacitive/touch sensor pins.
  - Controls three LED pins.
  - Sends three sensor states over serial in the form `1, 0, 0`.

- `earthseed-web/p5/sketch.js`
  - Loads three story audio files and a background cricket sound.
  - Uses `p5.WebSerial()` to connect directly to the Arduino from the browser.
  - Plays one story when exactly one seed sensor is active.

The current browser serial approach is fine for laptop testing, but it is not
ideal for unattended installation use because WebSerial usually requires a user
gesture to select a serial port.

## Recommended Architecture

```text
Touch sensors + LEDs
        |
        v
Arduino
        |
        | USB serial
        v
Raspberry Pi
        |
        | Node serial bridge
        v
Local WebSocket server
        |
        v
p5.js page in Chromium kiosk mode
        |
        v
Speakers / audio output
```

## Component Responsibilities

### Arduino

The Arduino should remain the hardware controller.

Responsibilities:

- Read the three touch sensors.
- Drive the three LEDs.
- Report the current sensor state over USB serial.

Expected serial message format:

```text
seed1, seed2, seed3
```

Example:

```text
1, 0, 0
```

The existing request/response behavior can work, where the Pi sends a byte and
the Arduino replies with the current state. A slightly cleaner installation
version would have the Arduino stream sensor state every 50-100ms.

### Raspberry Pi Node Server

The Node server should replace browser WebSerial.

Responsibilities:

- Serve the static web files.
- Open the Arduino serial device, likely `/dev/ttyACM0` or `/dev/ttyUSB0`.
- Parse incoming Arduino lines into structured sensor states.
- Broadcast sensor states to the browser over WebSocket.
- Reconnect if the Arduino is unplugged and reconnected.

Suggested packages:

- `express` for the local web server.
- `serialport` for Arduino communication.
- `ws` for WebSocket communication.

### Browser / p5.js App

The p5.js sketch should become responsible only for browser-side playback.

Responsibilities:

- Load audio files.
- Open a WebSocket connection to the local Node server.
- Receive sensor state messages.
- Play the matching story audio.
- Stop other story audio when a new seed is touched.
- Continue background ambience as desired.

The browser should no longer call `p5.WebSerial()` in the production Pi version.

## Runtime Flow

1. Raspberry Pi powers on.
2. Raspberry Pi OS boots into the desktop session.
3. A startup service launches the Node server.
4. Chromium opens in kiosk mode to the local app URL.
5. The web app loads the intro or success page.
6. The Node server connects to the Arduino over USB serial.
7. When a visitor touches a seed sensor, the Arduino reports the state.
8. The Node server broadcasts the state to the browser.
9. The p5.js sketch plays the corresponding story audio.

## Proposed File Changes

### New or Updated Server

Replace or expand `earthseed-web/p5/server.js`.

Expected behavior:

- Serve the `earthseed-web` directory as the web root.
- Expose pages like:
  - `http://localhost:3000/p5/index.html`
  - `http://localhost:3000/p5/passcode.html`
  - `http://localhost:3000/p5/yes.html`
- Start a WebSocket server on the same HTTP server.
- Read from the Arduino serial port.

### New Browser Script Path

Update `earthseed-web/p5/sketch.js`.

Expected behavior:

- Remove direct use of `p5.WebSerial()` for the Pi version.
- Connect to the local WebSocket server.
- Handle messages shaped like:

```json
{
  "seed1": 1,
  "seed2": 0,
  "seed3": 0
}
```

### Optional Arduino Cleanup

Update `earthseed-arduino.ino`.

Possible improvements:

- Make `defaultBrightness` lower than `touchBrightness` so touches are visible.
- Stream serial state on an interval instead of waiting for browser requests.
- Print compact CSV without spaces: `1,0,0`.
- Remove old commented-out experiments once the Pi path is working.

## Raspberry Pi Setup

Recommended base:

- Raspberry Pi 4 or Raspberry Pi 5.
- Raspberry Pi OS with desktop.
- 32GB or larger microSD card.
- USB connection from Arduino to Pi.
- HDMI, USB, or analog audio output for speakers.

Installation setup:

1. Install Raspberry Pi OS with desktop using Raspberry Pi Imager.
2. Copy this project onto the Pi.
3. Install Node.js and project dependencies.
4. Confirm the Arduino appears as `/dev/ttyACM0` or `/dev/ttyUSB0`.
5. Confirm the Pi user can access serial devices.
6. Run the local server manually.
7. Open the local app in Chromium and test audio.
8. Add startup automation after manual testing succeeds.

## Startup Automation

The production Pi should start the piece after boot.

Recommended approach:

- Use a `systemd` service for the Node server.
- Use desktop autostart or a browser launch service for Chromium kiosk mode.

Example browser target:

```text
http://localhost:3000/p5/yes.html
```

For a public-facing installation, the target might be the intro page instead:

```text
http://localhost:3000/p5/index.html
```

## Audio Behavior

Current behavior:

- `crickets.mp3` loops as background ambience.
- Touching seed 1 plays `seed1_collage.mp3`.
- Touching seed 2 plays `seed2_dre.mp3`.
- Touching seed 3 plays `seed3_ximena.mp3`.
- Starting one story stops the other story tracks.

Open behavior choices:

- Should the background crickets continue underneath stories?
- Should a story restart every time the same seed is touched?
- Should silence or crickets return when no seed is touched?
- Should simultaneous touches be ignored, mixed, or prioritized?

Recommended first version:

- Keep crickets looping.
- Play only one story at a time.
- Ignore simultaneous touches.
- Do not restart a story if the same seed remains touched.

## Reliability Considerations

### Serial Device Names

The Arduino may appear as `/dev/ttyACM0` or `/dev/ttyUSB0`. The server should
either support configuration or scan likely device names.

### Reconnection

If the Arduino disconnects, the server should:

- Log the error.
- Notify the browser that hardware is disconnected.
- Attempt to reconnect every few seconds.

### Browser Autoplay

Browsers may block audio until the user interacts with the page. Since this
project has a passcode/entry interaction, audio should usually be unlocked by
the time visitors reach `yes.html`. If launching directly into `yes.html`, add a
first-click start screen or test Chromium kiosk flags carefully.

### Power Loss

The Pi should tolerate unplug/replug cycles.

The important pieces are:

- Node server starts on boot.
- Browser opens on boot.
- Arduino reconnects automatically.
- The web app can recover if the server restarts.

## Implementation Phases

### Phase 1: Local Laptop Prototype

- Build the Node serial/WebSocket bridge locally.
- Keep Arduino connected over USB.
- Confirm the p5 sketch can play audio from WebSocket messages.
- Confirm browser WebSerial is no longer needed.

### Phase 2: Raspberry Pi Manual Run

- Copy project to the Pi.
- Install dependencies.
- Run the server manually from terminal.
- Open Chromium manually.
- Test serial input and audio output.

### Phase 3: Startup Automation

- Add a `systemd` service for the server.
- Add Chromium kiosk launch on desktop startup.
- Reboot repeatedly and confirm the piece returns automatically.

### Phase 4: Installation Hardening

- Add reconnect handling.
- Add clear logs.
- Add a configurable serial port.
- Tune audio behavior.
- Clean up duplicated browser code and unused scripts.

## Open Questions

- Should the Pi launch to `index.html` or directly to `yes.html`?
- Will visitors enter the passcode every time, or will facilitators open the
  story page before visitors arrive?
- What exact Raspberry Pi model will be used?
- What audio output will be used: HDMI, USB interface, or analog adapter?
- Should LEDs dim when untouched, or stay at full brightness?
- Should the Arduino stream continuously, or only reply when the Pi requests a
  state update?

## Decision

Use the Raspberry Pi as the installation computer and keep the Arduino as the
sensor/LED controller. Replace browser WebSerial with a Node serial bridge so
the piece can run unattended after boot.
