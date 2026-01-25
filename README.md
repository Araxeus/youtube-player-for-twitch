# Twitch Chat for YouTube

A Chrome Extension that merges YouTube and Twitch livestream chats into a unified viewing experience.

## Features

- 🔄 **Merged Chat View** - See YouTube and Twitch chats side-by-side
- 🎯 **Auto-Detection** - Automatically attempts to match YouTube channels to Twitch
- ✏️ **Manual Override** - Enter any Twitch channel manually if auto-detection fails
- 🌙 **Dark Mode** - Twitch-inspired dark theme
- 📺 **Toggle Original** - Switch back to YouTube's native chat anytime

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select this project folder
5. Navigate to any YouTube livestream

## Usage

1. Open a YouTube livestream
2. The extension will automatically replace YouTube's chat with the merged view
3. If the Twitch channel isn't auto-detected, enter it manually and click "Connect"
4. Use the tabs to switch between Both, YouTube-only, or Twitch-only views
5. Click "Show Original Chat" to toggle back to YouTube's native chat

## Project Structure

```
├── manifest.json    # Extension manifest (Manifest V3)
├── content.js       # Main content script
├── styles.css       # UI styles
├── icons/           # Extension icons
└── README.md        # This file
```

## How It Works

1. Content script injects on YouTube watch pages
2. Detects if the page is a livestream (checks for live chat)
3. Extracts channel name from page DOM
4. Creates merged chat UI with YouTube chat iframe + Twitch embed
5. Twitch chat is embedded using their official iframe embed API

## Permissions

- `activeTab` - Access to the current tab when extension is active
- `storage` - Save Twitch channel preferences locally
- `https://www.youtube.com/*` - Run on YouTube pages

## License

MIT
