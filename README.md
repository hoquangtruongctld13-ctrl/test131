# Ditch Speechify 🎙️

**Stop paying $139/year for Speechify. This does the same thing for FREE.**

A completely free, open-source text-to-speech reader that runs locally on your computer. Upload PDFs, Word documents, or paste any text—and have it read aloud with natural voices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

---

## ✨ Features

- **🆓 100% Free** — No subscriptions, no hidden costs, no ads
- **🔒 Privacy First** — Runs entirely offline, your data never leaves your computer
- **📄 Multiple Formats** — Upload PDFs, Word docs (.docx), or plain text files
- **🎙️ Natural Voices** — Uses your system's built-in high-quality voices
- **⏯️ Pause & Resume** — Pick up right where you left off
- **🖱️ Click to Start** — Double-click anywhere in the text to start reading from that point
- **🎛️ Adjustable** — Control speed and pitch to your preference
- **💾 Auto-Save** — Your text is saved automatically between sessions

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nihal-5/ditch-speechify.git
   cd ditch-speechify
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app**
   ```bash
   python main.py
   ```

4. **Open in browser**
   ```
   http://localhost:8888
   ```

That's it! Start pasting text or uploading documents. 🎉

---

## 📖 Usage

### Basic Usage
1. Paste any text into the text area (or upload a file)
2. Select a voice from the dropdown (⭐ = premium quality)
3. Adjust speed and pitch if desired
4. Click **Play** to start listening

### Pro Tips
- **Double-click** anywhere in the text to start reading from that sentence
- **Pause** saves your position — click **Resume** to continue
- **Stop** resets to the beginning
- Your text is **automatically saved** — come back anytime!

### Keyboard Shortcuts (coming soon)
- `Space` — Play/Pause
- `Escape` — Stop

---

## 🎙️ Getting the Best Voice Quality

The app uses your browser's built-in text-to-speech voices. For the best experience:

### macOS Users
1. Go to **System Settings → Accessibility → Spoken Content**
2. Click the **(i)** next to "System voice"
3. Select **"Manage Voices..."**
4. Download any voice marked "Enhanced" or "Siri" (e.g., "Samantha Enhanced")
5. Restart your browser and refresh the app

### Windows Users
- High-quality voices are built into Windows 10/11
- "Microsoft Zira" and "Microsoft David" work great

### Chrome/Brave Users
- "Google US English" and "Google UK English" are excellent choices

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Python FastAPI
- **TTS Engine**: Browser's native Web Speech API
- **PDF Parsing**: PyPDF2
- **Word Parsing**: python-docx

No frameworks, no complexity. Just clean, simple code.

---

## 📁 Project Structure

```
ditch-speechify/
├── index.html      # Main application HTML
├── style.css       # Glassmorphic UI styles
├── script.js       # TTS player logic
├── main.py         # FastAPI backend server
├── requirements.txt
├── README.md
└── LICENSE
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 💡 Why I Built This

I was tired of paying $139/year for Speechify when all I needed was a simple way to listen to articles and PDFs. The browser already has great text-to-speech built in — so I built a nice interface around it.

**Save your money. Use this instead.** 💰

---

## ⭐ Star This Repo

If you find this useful, consider giving it a star! It helps others discover this free alternative.

[![Star on GitHub](https://img.shields.io/github/stars/yourusername/ditch-speechify.svg?style=social)](https://github.com/yourusername/ditch-speechify)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yourusername">Nihal Veeramalla</a>
</p>
