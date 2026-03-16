# Sonos Controller

A lightweight macOS menu bar app to control Sonos speakers on your local network.

![Electron](https://img.shields.io/badge/Electron-React-blue) ![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## Features

- 🔍 Auto-discovers Sonos speakers on your network
- 🔊 Volume control per speaker
- ⏯️ Play / Pause / Next / Previous
- 🔇 Mute/unmute
- 🔗 Group and ungroup speakers
- 📻 TuneIn radio search & playback
- 🌐 Play any custom audio stream URL
- 🖥️ Lives in your macOS menu bar

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

## Tech Stack

- **Electron** — macOS tray app shell
- **React + Vite** — UI
- **Tailwind CSS** — Styling
- **Express** — Local API server
- **SSDP** — Sonos speaker discovery
- **UPnP/SOAP** — Sonos device control

## License

MIT
