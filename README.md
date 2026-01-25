# YouTube on Twitch

**Watch YouTube livestreams with Twitch chat** – the best of both worlds.

Ever wanted to watch a YouTube stream but prefer Twitch's chat experience? This Chrome extension lets you replace the Twitch player with a YouTube livestream while keeping Twitch's chat visible.

## ✨ Features

- **YouTube in Twitch** – Replace the Twitch player with any YouTube livestream
- **Keep Twitch Chat** – Watch YouTube with Twitch's superior chat experience
- **Auto-Sync** – Automatically speed up playback every 10 minutes to catch up with the live stream
- **Per-Channel Memory** – Remembers your last YouTube URL for each Twitch channel
- **Native Integration** – Button appears in Twitch's navigation bar
- **One-Click Restore** – Instantly switch back to Twitch

## 📦 Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the extension folder

### From Chrome Web Store

*Coming soon*

## 🚀 Usage

1. Go to any Twitch channel page
2. Click the **▶ YouTube** button in the top navigation bar
3. Paste a YouTube livestream URL
4. Click **Go**

### Auto-Sync

YouTube streams are sometimes a few seconds behind. Enable **Auto-sync** to automatically speed up playback (2x) every 10 minutes until the stream catches up.

- Check the "Auto-sync" box in the dropdown
- Click "⚡ Sync Now" to manually sync anytime

### Keyboard Shortcuts

- `Escape` – Close the dropdown menu

## 🔧 How It Works

1. The extension injects a button into Twitch's navigation bar
2. When you enter a YouTube URL, it overlays a YouTube embed iframe on top of the Twitch player
3. Twitch's video is paused and muted (but chat continues)
4. The YouTube iframe uses YouTube's embed API with autoplay enabled

## 📁 Files

```
├── manifest.json        # Chrome extension manifest
├── twitch-content.js    # Main content script
├── twitch-styles.css    # Styles for the UI
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 🛠 Development

```bash
# Clone the repo
git clone https://github.com/yourusername/youtube-on-twitch.git

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select the folder
```

## 📝 License

MIT License - feel free to use, modify, and distribute.

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss major changes.

---

Made with 💜 for the Twitch community
