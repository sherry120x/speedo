# 🏎️ Turbo 2D Racing - Apex Velocity Speedway

> Production-ready, modular **HTML5 Canvas 2D Top-Down Car Racing Game** engineered for 60/120Hz desktop browsers, Progressive Web App (PWA) installation, and native **Android APK** packaging via Capacitor.

---

## 🌟 Highlights & Features

### 🕹️ Phase 1: Core Engine & Dual Input
- **Delta-Time Game Loop**: Physics and kinematics run at identical speeds on 60Hz and 120Hz displays.
- **Dynamic Procedural Graphics**: High-detail vector graphics drawn entirely in Canvas 2D without any external image assets.
- **Dual Controls**:
  - **Desktop Keyboard**: `W`/`Up` = Accelerate, `S`/`Down` = Brake/Reverse, `A`/`Left` & `D`/`Right` = Steer, `Space` = Nitro, `P`/`Esc` = Pause.
  - **Mobile Touch UI**: Multi-touch on-screen steer paddles and gas/brake/nitro pedals with touch vibration feedback.

### 🚗 Phase 2: 10-Car Garage & Upgrade System
1. **Rusty Hatchback** (Starter - Balanced, nimble starter ride)
2. **City Sedan** (High handling & tight turning radius)
3. **Street Tuner** (Quick acceleration & drift control)
4. **Classic Muscle** (Monstrous top speed & raw power)
5. **Off-Road 4x4 Pickup** (Heavy duty, massive armor & shock absorption)
6. **Police Interceptor** (Flashing emergency sirens & pursuit speed)
7. **Cyber Neon Coupe** (High nitro capacity & futuristic aerodynamic flow)
8. **Apex Supercar** (Elite top speed & razor-sharp response)
9. **Formula 2D Open-Wheel** (Extreme downforce & maximum cornering grip)
10. **Hyper-Jet Prototype** (Supersonic prototype with twin nitro exhausts)

*Includes interactive garage showcase, live stat radars, coin purchasing, and `localStorage` persistence.*

### 🏁 Phase 3: 10 Progressive Tracks & Fair Traffic AI
- **Track 1–2 (Easy - Sunny Suburbs)**: Wide 3-lane road, slow civilian traffic, generous coin drops.
- **Track 3–4 (Medium - Highway Rush)**: 4 lanes, lane-changing traffic with dynamic blinkers.
- **Track 5–6 (Hard - Night City Neon)**: High-contrast night drive, dynamic headlight beam projection, roadblocks & oil slicks.
- **Track 7–8 (Expert - Desert Sandstorm / Heavy Rain)**: Slippery road physics, rain streaks, oncoming traffic, and rival racers.
- **Track 9–10 (Master - Cyber Expressway & Boss Run)**: High-speed chaos, barricades, pursuit hazards, tight timers, and maximum traffic density.
- **Guaranteed Passable Path**: Spawning algorithms ensure at least one open gap is always clear.

### ✨ Phase 4: Audio Synthesizer, Hitboxes & Visual Polish
- **Zero-Asset Web Audio API**: Procedural sound synthesis for RPM engine humming, tire screeching, coin chimes, near-miss fanfares, crash impacts, and victory fanfare.
- **Forgiving 82% AABB Hitboxes**: Collision boxes use 82% of visual dimensions with a near-miss rewarding system (+10 coins).
- **Particle System**: Dual-tone supersonic nitro flames, tire drift smoke, side-swipe friction sparks, and multi-piece vehicle explosion debris.
- **Complete UI State Flow**: Main Menu -> 10-Car Garage -> Mission Track Selector -> In-Game HUD -> Pause Modal -> Victory / Game Over.

### 📱 Phase 5: Android APK & PWA Offline Pipeline
- **PWA Offline Ready**: `manifest.json` configured for portrait orientation, fullscreen mode, and `sw.js` service worker caching.
- **Capacitor Integration**: Native Android configuration with app ID `com.prodev.car2d` and app name `Turbo 2D Racing`.
- **Hardware Back Button**: Back key pauses active gameplay and navigates menus smoothly instead of quitting the app.
- **GitHub Actions Automated APK Builder**: Compiles `app-debug.apk` in the cloud on every git push or manual trigger.

---

## 🚀 How to Play

### 1. Direct Browser Play (Zero Installation)
Simply open `index.html` in any modern desktop or mobile browser (Chrome, Edge, Firefox, Safari):
```bash
# You can open it directly or serve it locally
npx serve .
# Or open directly in your browser:
start index.html
```

### 2. Install as PWA (Android / iPhone / Desktop)
1. Serve the folder over HTTP/HTTPS (e.g., using GitHub Pages or a local server).
2. On Android (Chrome): Tap the **three dots menu** -> **Add to Home screen** / **Install App**.
3. On iOS (Safari): Tap the **Share button** -> **Add to Home Screen**.
4. Play offline in fullscreen with zero address bar!

---

## 📦 How to Build the Android .APK File

### Option A: The Fastest Way (No Local Android Studio Needed!)
You do **not** need to install Android Studio or the Android SDK on your PC!

1. Push this project folder to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Turbo 2D Racing initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository, click on the **Actions** tab.
3. Select the **Build Android APK** workflow and click **Run workflow**.
4. In under 3 minutes, the build completes and provides **`Turbo-2D-Racing-v1.0-debug-apk`** under the **Artifacts** section!
5. Download the `.zip`, extract `Turbo-2D-Racing-debug.apk`, transfer it to your Android phone, and install.

---

### Option B: Local One-Click Build Script

#### On Windows:
Double-click `build-apk.bat` or run:
```cmd
build-apk.bat
```

#### On macOS / Linux:
Run:
```bash
chmod +x build-apk.sh
./build-apk.sh
```

---

### Option C: Using Capacitor CLI Manually
```bash
# 1. Install dependencies
npm install

# 2. Add Android platform
npx cap add android

# 3. Sync web assets
npx cap sync android

# 4. Open Android Studio
npx cap open android

# 5. In Android Studio, select:
#    Build -> Build Bundle(s) / APK(s) -> Build APK(s)
```

The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📁 Project Architecture

```
game/
├── .github/
│   └── workflows/
│       └── android-apk.yml     # Automated CI/CD GitHub Actions APK build pipeline
├── build-apk.bat               # 1-click Windows APK compilation script
├── build-apk.sh                # 1-click Unix/macOS APK compilation script
├── capacitor.config.json       # Native Capacitor configuration (app ID com.prodev.car2d)
├── package.json                # Project dependencies and Capacitor plugins
├── manifest.json               # Offline PWA manifest (portrait fullscreen mode)
├── sw.js                       # Offline Service Worker cache engine
├── icon-192.png                # 192x192 PWA & Android app icon
├── icon-512.png                # 512x512 High-res app icon
├── index.html                  # Responsive 9:16 canvas container & multi-screen UI
├── style.css                   # Neon cyber aesthetic, animations, and touch controls
├── game.js                     # Complete game engine, physics, Web Audio, cars & levels
└── README.md                   # Full documentation and build manual
```

---

## 🎮 Game Controls Summary

| Action | Desktop Keyboard | Android Touch Control |
| :--- | :--- | :--- |
| **Accelerate** | `W` or `Up Arrow` | Right side `GAS` pedal |
| **Brake / Reverse** | `S` or `Down Arrow` | Right side `BRAKE` pedal |
| **Steer Left** | `A` or `Left Arrow` | Left side `◄` paddle |
| **Steer Right** | `D` or `Right Arrow` | Left side `►` paddle |
| **Nitro Boost** | `Spacebar` | Right side `NITRO` pedal |
| **Pause Game** | `P` or `Escape` | Top HUD `⏸` button or Back Key |
| **Garage** | `G` key | Top HUD `🏎️` button |
| **Track Select** | `L` key | Top HUD `TRACK` badge |
| **Toggle Audio** | `M` key | Top HUD `🔊` button |
| **Fullscreen** | `F` key | Top HUD `⛶` button |

---

## 🏆 License
MIT License. Built with ❤️ for speed enthusiasts and mobile gamers.
