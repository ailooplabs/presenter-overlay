# Presenter Overlay 🎭

<p align="center">
  <strong>The Presenter's Secret Superpower: Invisible Teleprompter & Live AI Co-Pilot for Presentations</strong>
</p>

<p align="center">
  <a href="https://ailooplabs.com"><img src="https://img.shields.io/badge/AILoopLabs-Product-8b5cf6?style=flat-square" alt="AILoopLabs"></a>
  <img src="https://img.shields.io/badge/Tauri-v2-blue?style=flat-square&logo=tauri" alt="Tauri v2">
  <img src="https://img.shields.io/badge/Rust-Native-orange?style=flat-square&logo=rust" alt="Rust Native">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/Privacy-100%25_Local-emerald?style=flat-square" alt="Privacy First">
  <img src="https://img.shields.io/badge/Platform-macOS-lightgrey?style=flat-square&logo=apple" alt="macOS">
</p>

---

## 🌟 Overview

**Presenter Overlay** is a lightweight, ultra-secure desktop companion application built with Rust and React using Tauri. It floats right in front of your eyes on screen during live demos, webinars, keynotes, or virtual meetings—providing an invisible teleprompter and a context-aware AI co-pilot.

### ⚡ Key Features

- 🫥 **Zero-Leak Screen-Share Hiding (macOS Native)**: Uses native Cocoa window attributes (`NSWindowSharingNone`) so the overlay is completely invisible to Zoom, Google Meet, Microsoft Teams, Loom, and OBS, while remaining 100% visible and interactive for you.
- 🤖 **Context-Aware AI Co-Pilot**: Ambiently transcribes your presentation in real-time. When tough audience questions arise, simply type or voice the question to receive instant, contextually tailored answers based on what you just presented.
- 📝 **Smart Teleprompter & Notes**: Keep speaking notes, slide cues, and critical code snippets right next to your camera lens, maintaining perfect eye contact with your audience. Auto-saves locally with zero latency.
- ⚡ **Rust-Powered Ultra-Light Performance**: Consumes < 30MB RAM and near-zero CPU. No sluggishness or stuttering while sharing your screen with heavy IDEs, Docker, or slides running.
- 🔒 **100% Privacy by Design**: Zero telemetry, zero external trackers. Your API keys and transcripts stay strictly on your local machine.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust toolchain](https://www.rust-lang.org/) (`cargo`, `rustc`)
- macOS (for native Cocoa window sharing exclusion features)

### Setup & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ailooplabs/presenter-overlay.git
   cd presenter-overlay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Add your Google Gemini API key to .env
   ```

4. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

5. **Build for production:**
   ```bash
   npm run tauri build
   ```

---

## 🧪 Testing

Run frontend tests:
```bash
npm test
```

---

## 🛠️ Architecture

```
presenter-overlay/
├── src/                      # React frontend
│   ├── components/           # UI Components (LiveAssistant, Notes, Settings, etc.)
│   ├── hooks/                # Audio & Speech Recognition Hooks
│   ├── services/             # Gemini API & AI services
│   └── App.tsx               # Main application layout & floating controls
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── main.rs           # Application entrypoint
│   │   └── lib.rs            # Cocoa window flags & Tauri bridge
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri window & security configurations
```

---

## 🛡️ Privacy & Security

- **No Remote Telemetry**: Presenter Overlay never collects personal data, behavioral analytics, or keystrokes.
- **Direct API Invocations**: AI queries communicate directly with your configured AI provider (Google Gemini) using your own client-side key.
- **Local Storage**: Notes and settings are stored locally in the application's sandboxed storage.

---

## 📄 License

Part of the **[AILoopLabs](https://ailooplabs.com)** developer tool suite. All rights reserved.
