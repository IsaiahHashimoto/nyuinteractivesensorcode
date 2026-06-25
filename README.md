## Setup and run

### If this is for the Jun 30th, 2026 show it should already be connected and you can ignore this section.

1. Upload `earthseed-arduino.ino` to the Arduino and connect it by USB.
2. Install [Node.js](https://nodejs.org/), then run:

   ```sh
   cd earthseed-web
   npm install
   npm start
   ```

3. Open `http://localhost:3001/p5/yes-bridge.html` in a browser.
4. If shown, click **Start Audio**. Use **Test Story** to check playback without touching a sensor.

The server uses `/dev/ttyACM0` by default and also checks `/dev/ttyACM0-9` and `/dev/ttyUSB0-9`. To specify another port, start it with `SERIAL_PATH=/your/port npm start`.

## Raspberry Pi reboot/autostart setup

Running `npm start` manually only works until the terminal closes or the Pi reboots. To make the project come back after `sudo reboot`, install the included Pi autostart setup once:

```sh
cd /path/to/nyuinteractivesensorcode
sudo ./scripts/install-pi-autostart.sh
sudo reboot
```

That installer does two things:

- Creates a systemd service named `earthseed-web.service` that starts the Node serial bridge/web server on boot.
- Creates a desktop autostart entry that opens Chromium to `http://localhost:3001/p5/yes-bridge.html` after the Pi desktop logs in.

Useful checks on the Pi:

```sh
systemctl status earthseed-web.service
journalctl -u earthseed-web.service -f
```

If the browser opens but audio does not start, click **Start Audio** once. Browser autoplay rules can block sound until there has been a click/touch.

## Audio file names

### As of June 24th, 2026 the audio files are saved under different names than the following. You must upload the new files or change the existing ones to match the following structure. Put all audio files in `earthseed-web/p5/`. Their names must match exactly:

| Sensor | Required file names |
| --- | --- |
| Seed 1 | `seedaudio1.mp3`, `seedaudio2.mp3`, `seedaudio3.mp3` |
| Seed 2 | `seedaudio4.mp3`, `seedaudio5.mp3`, `seedaudio6.mp3` |
| Seed 3 | `seedaudio7.mp3`, `seedaudio8.mp3`, `seedaudio9.mp3` |

Each sensor cycles through its three files. Touching a sensor while a story is playing stops the current story audio and immediately starts the newly selected sensor's next file; stories are not queued.

The background audio must be named `crickets.mp3` and stored in the same `/earthseed-web/p5` folder. Use lowercase `.mp3` extensions for changing and renaming audio files.

After all 9 of these files are put into `/earthseed-web/p5`, you will need to open the local folder on the Pi and run `git pull`, `cd earthseed-web`, and `npm install`. Use `npm start` for a manual test. Use the Raspberry Pi reboot/autostart setup above when the project needs to load automatically after `sudo reboot`.

A diagram of the following sensors can be seen at:

![image](sensorinteractiondiagram.png)
