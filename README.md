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

## Audio file names

### As of June 24th, 2026 the audio files are saved under different names than the following. You must upload the new files or change the existing ones to match the following structure. Put all audio files in `earthseed-web/p5/`. Their names must match exactly:

| Sensor | Required file names |
| --- | --- |
| Seed 1 | `storyaudio1.mp3`, `storyaudio2.mp3`, `storyaudio3.mp3` |
| Seed 2 | `storyaudio4.mp3`, `storyaudio5.mp3`, `storyaudio6.mp3` |
| Seed 3 | `storyaudio7.mp3`, `storyaudio8.mp3`, `storyaudio9.mp3` |

Each sensor cycles through its three files. Touching a sensor while a story is playing now stops the playing storyaudio and immediately starts the newly selected sensor's next file; stories are not queued in the same snese in which they were in the previous update (the edited code is primairly in sketch and sketch prodge [both .js]). 

The background audio must be named `crickets.mp3` and stored in the same `/earthseed-web/p5` folder. Use lowercase `.mp3` extensions for changing and renaming audio files.

After all 9 of these files are put into `/earthseed-web/p5`, you will need to open the local file `cd /path/to/nyuinteractivesensorcode` on the pi and do `git pull`, `cd earthseed-web`, `npm install`, `npm start`, and then lastly once everything is setup, do `sudo reboot` or if you want to turn off the pi and unplug it do `sudo poweroff`.

