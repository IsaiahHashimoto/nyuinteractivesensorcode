#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer with sudo:"
  echo "  sudo ./scripts/install-pi-autostart.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_DIR/earthseed-web"
RUN_USER="${SUDO_USER:-pi}"
USER_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
NPM_BIN="$(command -v npm || true)"

if [ ! -d "$APP_DIR" ]; then
  echo "Could not find app directory: $APP_DIR"
  exit 1
fi

if [ -z "$USER_HOME" ] || [ ! -d "$USER_HOME" ]; then
  echo "Could not find home directory for user: $RUN_USER"
  exit 1
fi

if [ -z "$NPM_BIN" ]; then
  echo "npm was not found. Install Node.js/npm before running this installer."
  exit 1
fi

usermod -a -G dialout "$RUN_USER"

if [ ! -d "$APP_DIR/node_modules" ]; then
  sudo -u "$RUN_USER" "$NPM_BIN" install --prefix "$APP_DIR"
fi

cat >/etc/systemd/system/earthseed-web.service <<SERVICE
[Unit]
Description=Earthseed local serial bridge and web server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=$NPM_BIN start
Restart=always
RestartSec=3
Environment=PORT=3001
Environment=BAUD_RATE=9600

[Install]
WantedBy=multi-user.target
SERVICE

install -d -m 0755 -o "$RUN_USER" -g "$RUN_USER" "$USER_HOME/.config/autostart"

cat >"$USER_HOME/.config/autostart/earthseed-kiosk.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Earthseed Kiosk
Comment=Open the Earthseed browser UI after desktop login
Exec=$SCRIPT_DIR/start-kiosk.sh
Terminal=false
X-GNOME-Autostart-enabled=true
DESKTOP

chown "$RUN_USER:$RUN_USER" "$USER_HOME/.config/autostart/earthseed-kiosk.desktop"
chmod 0644 "$USER_HOME/.config/autostart/earthseed-kiosk.desktop"

systemctl daemon-reload
systemctl enable earthseed-web.service
systemctl restart earthseed-web.service

echo "Installed Earthseed autostart."
echo "Server service: systemctl status earthseed-web.service"
echo "Server logs:    journalctl -u earthseed-web.service -f"
echo "Kiosk browser:  $USER_HOME/.config/autostart/earthseed-kiosk.desktop"
echo "Reboot once so the dialout group change and kiosk autostart both apply."
