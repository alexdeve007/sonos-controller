# Sonos Controller

A lightweight macOS menu bar app to control Sonos speakers on your local network. Also works on your phone via the browser.

![Electron](https://img.shields.io/badge/Electron-React-blue) ![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## Features

- Auto-discovers Sonos speakers on your network (SSDP + subnet scan fallback)
- Volume control per speaker and per group
- Play / Pause / Stop
- Mute/unmute
- Group and ungroup speakers
- TuneIn radio search & playback with recently played stations
- Play any custom audio stream URL
- Lives in your macOS menu bar
- Mobile-friendly UI — control from your phone on the same network
- Handles stereo pairs, subs, and surround setups cleanly

## Requirements

- **macOS** (tested on macOS 13+)
- **Node.js** 18 or later — [download here](https://nodejs.org/)
- Sonos speakers on the same Wi-Fi network

## Getting Started

```bash
# Clone the repo
git clone https://github.com/alexdeve007/sonos-controller.git
cd sonos-controller

# Install dependencies
npm install
cd client && npm install && cd ..

# Run the app
npm run dev
```

The app will appear as a speaker icon in your macOS menu bar. Click it to open the controller panel.

## Mobile Access

Once the app is running on your Mac, open this URL on any phone or tablet on the same Wi-Fi:

```
http://<your-mac-ip>:3000
```

The IP is printed in the terminal when the app starts (look for "Mobile access: ...").

**Tip:** On iPhone, tap the share button in Safari and select "Add to Home Screen" to use it like a native app.

## Troubleshooting

**Speakers not showing up?**

1. Make sure your Mac and Sonos speakers are on the same Wi-Fi network
2. Click "Discover" to trigger a fresh scan
3. If auto-discovery fails, you can add a speaker manually by IP address (find the IP in the Sonos app under Settings > System > About My System)

**Port 3000 already in use?**

Kill the old process and try again:

```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

## Tech Stack

- **Electron** — macOS tray app shell
- **React + Vite** — UI
- **Tailwind CSS** — Styling
- **Express** — Local API server
- **SSDP** — Sonos speaker discovery
- **UPnP/SOAP** — Sonos device control

## License

MIT
