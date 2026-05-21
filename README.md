# Sensor Platform

A responsive browser-based dashboard for live device signals, built with Tailwind CSS and vanilla JavaScript.

## Features

- Online and offline network status
- Battery status when the Battery Status API is available
- Gyroscope and motion sensor readouts with permission-aware fallbacks
- Gravity sensor support when available in the browser
- GPS tracking using the Geolocation API
- Vibration feedback using `navigator.vibrate()`
- Camera/image capture fallback using the native file picker
- Fully responsive sidebar and content layout for mobile and desktop

## Files

- `index.html` loads the app shell and Tailwind CDN
- `style.css` provides the base visual styling and typography
- `app.js` renders the dashboard and wires the sensor interactions

## Run Locally

Because this app uses ES modules, it should be served from a local web server instead of opening the file directly.

### Option 1: Python

```bash
cd E:/ionic
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

### Option 2: VS Code Live Server

- Install the Live Server extension
- Open `index.html`
- Start the server from the editor

## Browser Permissions

Some features require a secure context and/or user permission:

- Device orientation and motion sensors may require user interaction before they activate
- Geolocation requires location permission
- Battery, vibration, and sensor availability depend on browser support
- Camera capture uses the browser file picker fallback

## Notes

- The UI is intentionally mobile-first and scrollable on smaller screens
- Tailwind is loaded from the CDN for simplicity during development
- Native Ionic or Capacitor plugins are not required for the current version

## Suggested Next Step

If you want this to become a true Ionic + Capacitor app, the next step is to add a Capacitor project wrapper and swap the browser fallbacks for native plugins on Android and iOS.
