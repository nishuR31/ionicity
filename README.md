# ionicity

A clean Capacitor/Vite app that renders a responsive device dashboard with browser-based sensor, network, battery, vibration, GPS, and camera fallbacks.

## What it does

- Shows online/offline status
- Reads battery state when the browser supports it
- Tracks gyroscope and motion sensors with permission-aware fallbacks
- Tries the Gravity Sensor API when available
- Tracks GPS location through the Geolocation API
- Triggers vibration using `navigator.vibrate()`
- Opens the camera or file picker for image capture fallback
- Uses a responsive fixed sidebar and scrollable content area

## Project Files

- `src/index.html` is the app entry page
- `src/app.js` renders the dashboard and wires the interactions
- `src/css/style.css` contains the base styling and typography
- `capacitor.config.json` is ready for native wrapping if you later run Capacitor sync

## Run It

Install dependencies and start the Vite dev server:

```bash
npm install
npm start
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Notes

- Tailwind is loaded from the CDN during development
- The app is browser-first, so it works as a runnable web app immediately
- Native Capacitor plugins are not required for the current UI

## If you want native Android/iOS

The next step is to keep this Vite app, then add platform folders and sync with Capacitor so you can package the same UI for mobile.
