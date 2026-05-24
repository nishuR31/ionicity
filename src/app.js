import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import * as Vibration from "./js/sensors/vibration.js";
import * as Notifications from "./js/sensors/notifications.js";
import * as Bluetooth from "./js/sensors/bluetooth.js";
import * as NetworkSensor from "./js/sensors/network.js";
import { Geolocation } from "@capacitor/geolocation";
import { SplashScreen } from "@capacitor/splash-screen";

const app = document.getElementById("app");
const isNative = Capacitor.isNativePlatform();

const state = {
  online: navigator.onLine,
  platform: `${Capacitor.getPlatform()}${Capacitor.isNativePlatform() ? " native" : " browser"}`,
  battery: {
    supported: "getBattery" in navigator,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
    status: "Checking battery...",
  },
  orientation: {
    supported:
      (isNative || globalThis.isSecureContext !== false) &&
      ("Gyroscope" in globalThis ||
        "DeviceOrientationEvent" in globalThis ||
        "AbsoluteOrientationSensor" in globalThis),
    active: false,
    permission: "Not enabled",
    alpha: "--",
    beta: "--",
    gamma: "--",
  },
  motion: {
    supported:
      (isNative || globalThis.isSecureContext !== false) &&
      ("Accelerometer" in globalThis ||
        "LinearAccelerationSensor" in globalThis ||
        "DeviceMotionEvent" in globalThis),
    active: false,
    permission: "Not enabled",
    x: "--",
    y: "--",
    z: "--",
  },
  gravity: {
    supported:
      (isNative || globalThis.isSecureContext !== false) &&
      "GravitySensor" in globalThis,
    active: false,
    status: "Unavailable",
    x: "--",
    y: "--",
    z: "--",
  },
  gps: {
    supported:
      isNative ||
      (globalThis.isSecureContext !== false && "geolocation" in navigator),
    active: false,
    status: "Idle",
    lat: "--",
    lng: "--",
    speed: "--",
    accuracy: "--",
  },
  vibration: {
    supported:
      isNative ||
      (globalThis.isSecureContext !== false && "vibrate" in navigator),
    lastAction: "Ready",
  },
  network: {
    supported: true,
    connected: navigator.onLine,
    type: "unknown",
    source: "browser",
    status: "Unknown",
  },
  notifications: {
    supported: "Notification" in globalThis || isNative,
    permission:
      typeof Notification !== "undefined" ? Notification.permission : "default",
    lastAction: "Ready",
    diagnostics: "",
  },
  bluetooth: {
    supported: false,
    status: "Idle",
    device: "No device selected",
    diagnostics: "",
  },
  camera: {
    preview: null,
    name: "No image selected",
    source: "Ready",
  },
  video: {
    preview: null,
    name: "No video selected",
    source: "Ready",
  },
  voice: {
    supported: "mediaDevices" in navigator && "MediaRecorder" in globalThis,
    recording: false,
    preview: null,
    name: "No recording yet",
    status: "Ready",
  },
  gesture: {
    supported: "PointerEvent" in globalThis || "ontouchstart" in globalThis,
    count: 0,
    last: "Swipe or tap the pad",
  },
};

const refs = {};
let batteryManager = null;
let gravitySensor = null;
let orientationSensor = null;
let motionSensor = null;
let gpsWatchId = null;
let networkWatcher = null;
let voiceRecorder = null;
let voiceStream = null;
let gestureStart = null;
let sidebarCollapsed = false;
const desktopMediaQuery = globalThis.matchMedia("(min-width: 1024px)");

function template() {
  return `
    <div class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,1))]"></div>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/70 to-transparent"></div>

      <div class="relative mx-auto min-h-screen max-w-screen lg:pl-80">
        <aside class="fixed inset-x-0 top-0 z-40 max-h-[calc(100vh-0.5rem)] overflow-hidden border-b border-white/10 bg-slate-950/90 px-3 py-3 backdrop-blur-xl sm:px-4 sm:py-4 lg:inset-y-0 lg:left-0 lg:max-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-5 lg:overflow-y-auto">
          <div class="flex items-start justify-between gap-3 lg:block lg:items-center">
            <div>
              <p class="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 sm:text-xs sm:tracking-[0.35em]">Ionic Dashboard</p>
              <h1 class="mt-1 text-xl font-bold tracking-tight text-white sm:mt-2 sm:text-3xl lg:text-3xl">Device Console</h1>
              <p class="mt-1 max-w-sm text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6 lg:mt-3">
                Browser-native sensors, battery, network, vibration, media capture, and location checks in one responsive shell.
              </p>
            </div>

            <button id="sidebarToggle" class="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-3 sm:text-xs lg:hidden" aria-expanded="${!sidebarCollapsed}">
              <span id="sidebarToggleLabel">${sidebarCollapsed ? "Open" : "Close"}</span>
            </button>
          </div>

          <div id="sidebarBody" class="${sidebarCollapsed ? "hidden lg:block" : "block"} max-h-[calc(100vh-5rem)] overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
            <div class="mt-3 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-xs text-emerald-200 sm:mt-4 sm:px-3 sm:py-2 sm:text-sm lg:mt-6">
              <span id="onlineDot" class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></span>
              <span id="onlineState">Online</span>
            </div>

            <nav class="mt-4 grid gap-2 grid-cols-2 sm:mt-6 sm:grid-cols-2 lg:grid-cols-1">
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="summary">Overview</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="sensors">Sensors</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="media">Media</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="connectivity">Connectivity</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="gpsCard">Location</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:px-4 sm:py-3 sm:text-sm" data-scroll-to="cameraCard">Camera</button>
            </nav>

            <div class="mt-4 space-y-2 rounded-3xl border border-white/10 bg-white/5 p-3 sm:mt-6 sm:space-y-3 sm:p-4">
              <p class="text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:text-xs sm:tracking-[0.3em]">Quick Actions</p>
              <button id="enableSensorsBtn" class="w-full rounded-2xl bg-cyan-400 px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 sm:px-4 sm:py-3 sm:text-sm">
                Enable motion sensors
              </button>
              <button id="enableGpsBtn" class="w-full rounded-2xl border border-cyan-300/30 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm">
                Enable GPS tracking
              </button>
              <button id="openCameraBtn" class="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-white/25 hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm">
                Take photo
              </button>
            </div>

            <div class="mt-4 grid gap-2 grid-cols-1 sm:mt-6 sm:grid-cols-2 lg:grid-cols-1">
              <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-3 sm:p-4">
                <p class="text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">Orientation</p>
                <p id="orientationStatus" class="mt-1.5 text-xs text-slate-200 sm:mt-2 sm:text-sm">Not enabled</p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-3 sm:p-4">
                <p class="text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">Battery</p>
                <p id="batteryStatus" class="mt-1.5 text-xs text-slate-200 sm:mt-2 sm:text-sm">Checking battery...</p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-3 sm:p-4">
                <p class="text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">Platform</p>
                <p id="platformStatus" class="mt-1.5 text-xs text-slate-200 sm:mt-2 sm:text-sm">Web</p>
              </div>
            </div>
          </div>
        </aside>

        <main class="min-h-screen overflow-y-auto px-4 pb-24 pt-28 sm:px-6 lg:h-screen lg:px-8 lg:py-8 lg:pl-8 lg:pb-8 lg:pt-8">
          <section id="summary" class="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-2xl">
                <p class="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Live Device Snapshot</p>
                <h2 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Responsive sensor and system status panel.</h2>
                <p class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                  This version works directly in the browser with graceful fallbacks for unsupported APIs.
                  Motion sensors, battery, connectivity, vibration, GPS, and camera access are all isolated so one failure does not break the dashboard.
                </p>
                <div id="connectionBanner" class="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></span>
                  <span>Online with live updates and cached fallback support.</span>
                </div>
              </div>

              <div class="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:min-w-104 lg:grid-cols-3">
                <div class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Network</p>
                  <p id="networkValue" class="mt-2 text-2xl font-semibold text-white">Online</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Battery</p>
                  <p id="batteryValue" class="mt-2 text-2xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-400">GPS</p>
                  <p id="gpsValue" class="mt-2 text-2xl font-semibold text-white">Idle</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:col-span-3 lg:col-span-3">
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Platform</p>
                  <p id="platformValue" class="mt-2 text-2xl font-semibold text-white">Web</p>
                </div>
              </div>
            </div>
          </section>

          <section id="sensors" class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5" id="gyroCard">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Gyroscope</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Device orientation</h3>
                </div>
                <span id="orientationBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Not enabled</span>
              </div>
              <div class="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Alpha</p>
                  <p id="gyroAlpha" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Beta</p>
                  <p id="gyroBeta" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Gamma</p>
                  <p id="gyroGamma" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
              </div>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Motion</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Acceleration</h3>
                </div>
                <span id="motionBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Not enabled</span>
              </div>
              <div class="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">X</p>
                  <p id="motionX" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Y</p>
                  <p id="motionY" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Z</p>
                  <p id="motionZ" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
              </div>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Gravity</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Generic sensor API</h3>
                </div>
                <span id="gravityBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Unavailable</span>
              </div>
              <div class="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">X</p>
                  <p id="gravityX" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Y</p>
                  <p id="gravityY" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Z</p>
                  <p id="gravityZ" class="mt-2 text-xl font-semibold text-white">--</p>
                </div>
              </div>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Vibration</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Haptics</h3>
                </div>
                <span id="vibrationBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Ready</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">Use browser vibration feedback when supported.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="lightVibrateBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Light vibration</button>
                <button id="heavyVibrateBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Heavy vibration</button>
              </div>
            </article>

            <article id="gpsCard" class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 sm:col-span-2 xl:col-span-2">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">GPS</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Geolocation tracking</h3>
                  <p id="gpsStatus" class="mt-2 text-sm text-slate-300">Idle</p>
                </div>
                <div class="flex flex-wrap gap-3">
                  <button id="startGpsBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Start tracking</button>
                  <button id="stopGpsBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Stop tracking</button>
                </div>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Latitude</p>
                  <p id="gpsLat" class="mt-2 text-lg font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Longitude</p>
                  <p id="gpsLng" class="mt-2 text-lg font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Speed</p>
                  <p id="gpsSpeed" class="mt-2 text-lg font-semibold text-white">--</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-slate-400">Accuracy</p>
                  <p id="gpsAccuracy" class="mt-2 text-lg font-semibold text-white">--</p>
                </div>
              </div>
            </article>

            <article id="cameraCard" class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 sm:col-span-2 xl:col-span-1">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Camera</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Photo capture</h3>
                </div>
                <span id="cameraSourceBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Ready</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">Uses Capacitor camera on mobile when available, then falls back to the file picker.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="cameraBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Take / choose photo</button>
                <input id="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" />
              </div>
              <div class="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                <div class="aspect-4/3 w-full bg-slate-950">
                  <img id="cameraPreview" alt="Selected preview" class="hidden h-full w-full object-cover" />
                  <div id="cameraPlaceholder" class="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
                    No image selected yet.
                  </div>
                </div>
              </div>
              <p id="cameraName" class="mt-3 text-sm text-slate-300">No image selected</p>
            </article>
          </section>

          <section id="media" class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Video</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Clips</h3>
                </div>
                <span id="videoSourceBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Ready</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">On phones this opens the camera picker with video capture support when the platform allows it.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="videoBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Choose video</button>
                <input id="videoInput" type="file" accept="video/*" capture="environment" class="hidden" />
              </div>
              <div class="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                <div class="aspect-4/3 w-full bg-slate-950">
                  <video id="videoPreview" controls playsinline class="hidden h-full w-full object-cover"></video>
                  <div id="videoPlaceholder" class="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
                    No video selected yet.
                  </div>
                </div>
              </div>
              <p id="videoName" class="mt-3 text-sm text-slate-300">No video selected</p>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Voice</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Audio notes</h3>
                </div>
                <span id="voiceStatusBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Ready</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">Records audio with MediaRecorder when the browser supports it, otherwise the UI explains the limitation.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="voiceStartBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Start recording</button>
                <button id="voiceStopBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Stop</button>
              </div>
              <div class="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                <div class="flex min-h-40 items-center justify-center p-6">
                  <audio id="voicePreview" controls class="hidden w-full"></audio>
                  <div id="voicePlaceholder" class="text-center text-sm text-slate-400">
                    No recording yet.
                  </div>
                </div>
              </div>
              <p id="voiceName" class="mt-3 text-sm text-slate-300">No recording yet</p>
            </article>

            <article id="connectivity" class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 sm:col-span-2 xl:col-span-3">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Connectivity</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Network, notifications, and Bluetooth</h3>
                  <p class="mt-2 text-sm text-slate-300">These controls use native plugins on Android and browser APIs on the web, with fallback status shown directly in the panel.</p>
                </div>
                <button id="refreshNetworkBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Refresh status</button>
              </div>

              <div class="mt-5 grid gap-4 lg:grid-cols-3">
                <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Network</p>
                      <h4 class="mt-2 text-lg font-semibold text-white">Link status</h4>
                    </div>
                    <span id="networkBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Unknown</span>
                  </div>
                  <p id="networkSummary" class="mt-4 text-sm leading-6 text-slate-300">Checking connection status.</p>
                  <div class="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div class="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
                      <p class="text-[11px] uppercase tracking-[0.22em] text-slate-500">Type</p>
                      <p id="networkType" class="mt-1 font-semibold text-white">unknown</p>
                    </div>
                    <div class="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
                      <p class="text-[11px] uppercase tracking-[0.22em] text-slate-500">Source</p>
                      <p id="networkSource" class="mt-1 font-semibold text-white">browser</p>
                    </div>
                  </div>
                </div>

                <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Notifications</p>
                      <h4 class="mt-2 text-lg font-semibold text-white">Local alerts</h4>
                    </div>
                    <span id="notificationBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Default</span>
                  </div>
                  <p id="notificationSummary" class="mt-4 text-sm leading-6 text-slate-300">Permission not requested yet.</p>
                  <div class="mt-4 flex flex-wrap gap-3">
                    <button id="requestNotificationBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Request permission</button>
                    <button id="testNotificationBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Test notification</button>
                  </div>
                </div>

                <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Bluetooth</p>
                      <h4 class="mt-2 text-lg font-semibold text-white">Web Bluetooth / plugin</h4>
                    </div>
                    <span id="bluetoothBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Idle</span>
                  </div>
                  <p id="bluetoothSummary" class="mt-4 text-sm leading-6 text-slate-300">No device selected.</p>
                  <div class="mt-4 flex flex-wrap gap-3">
                    <button id="scanBluetoothBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Scan Bluetooth</button>
                    <button id="bluetoothDiagnosticsBtn" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Check support</button>
                  </div>
                </div>
              </div>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 sm:col-span-2 xl:col-span-1">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Gesture</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Swipe pad</h3>
                </div>
                <span id="gestureBadge" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Ready</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">Use the touch area to test taps and directional swipes on mobile and desktop pointer devices.</p>
              <div id="gesturePad" class="mt-5 flex min-h-48 items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-300/5 p-6 text-center text-sm text-slate-300">
                Swipe or tap inside this panel
              </div>
              <p id="gestureStatus" class="mt-3 text-sm text-slate-300">Swipe or tap the pad</p>
            </article>
          </section>
        </main>
      </div>
    </div>
  `;
}

function $(id) {
  return refs[id];
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds === Infinity || seconds < 0) {
    return "Unknown";
  }

  if (seconds === 0) {
    return "Now";
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "--";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanupObjectUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function isSecureSensorContext() {
  return isNative || globalThis.isSecureContext !== false;
}

function cacheRefs() {
  [
    "sidebarToggle",
    "sidebarToggleLabel",
    "sidebarBody",
    "onlineDot",
    "onlineState",
    "connectionBanner",
    "enableSensorsBtn",
    "enableGpsBtn",
    "openCameraBtn",
    "orientationStatus",
    "batteryStatus",
    "platformStatus",
    "networkValue",
    "networkBadge",
    "networkSummary",
    "networkType",
    "networkSource",
    "refreshNetworkBtn",
    "notificationBadge",
    "notificationSummary",
    "requestNotificationBtn",
    "testNotificationBtn",
    "bluetoothBadge",
    "bluetoothSummary",
    "scanBluetoothBtn",
    "bluetoothDiagnosticsBtn",
    "batteryValue",
    "gpsValue",
    "platformValue",
    "orientationBadge",
    "gyroAlpha",
    "gyroBeta",
    "gyroGamma",
    "motionBadge",
    "motionX",
    "motionY",
    "motionZ",
    "gravityBadge",
    "gravityX",
    "gravityY",
    "gravityZ",
    "vibrationBadge",
    "lightVibrateBtn",
    "heavyVibrateBtn",
    "gpsStatus",
    "startGpsBtn",
    "stopGpsBtn",
    "gpsLat",
    "gpsLng",
    "gpsSpeed",
    "gpsAccuracy",
    "cameraBtn",
    "cameraInput",
    "cameraPreview",
    "cameraPlaceholder",
    "cameraName",
    "cameraSourceBadge",
    "videoBtn",
    "videoInput",
    "videoPreview",
    "videoPlaceholder",
    "videoName",
    "videoSourceBadge",
    "voiceStartBtn",
    "voiceStopBtn",
    "voicePreview",
    "voicePlaceholder",
    "voiceName",
    "voiceStatusBadge",
    "gesturePad",
    "gestureStatus",
    "gestureBadge",
  ].forEach((id) => {
    refs[id] = document.getElementById(id);
  });
}

function updateSidebarUI() {
  const isDesktop = desktopMediaQuery.matches;
  const body = $("sidebarBody");
  const toggle = $("sidebarToggle");
  const label = $("sidebarToggleLabel");

  if (isDesktop) {
    body.classList.remove("hidden");
    body.classList.add("block");
    toggle.setAttribute("aria-expanded", "true");
    label.textContent = "Open";
    return;
  }

  body.classList.toggle("hidden", sidebarCollapsed);
  body.classList.toggle("block", !sidebarCollapsed);
  toggle.setAttribute("aria-expanded", String(!sidebarCollapsed));
  label.textContent = sidebarCollapsed ? "Open" : "Close";
}

function toggleSidebar() {
  if (desktopMediaQuery.matches) {
    return;
  }

  sidebarCollapsed = !sidebarCollapsed;
  updateSidebarUI();
}

function renderNetwork() {
  const online = state.network.connected;
  const type = state.network.type || "unknown";
  const source = state.network.source || "browser";
  const banner = $("connectionBanner");

  $("onlineDot").className =
    online ?
      "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
    : "h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]";

  $("onlineState").textContent = online ? "Online" : "Offline";
  $("networkValue").textContent = online ? "Online" : "Offline";
  $("networkBadge").textContent = online ? "Connected" : "Offline";
  $("networkSummary").textContent =
    online ?
      `Connected via ${type}. Status source: ${source}.`
    : `Offline state detected from ${source}. Local UI stays available.`;
  $("networkType").textContent = type;
  $("networkSource").textContent = source;

  if (banner) {
    banner.className =
      online ?
        "mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200"
      : "mt-5 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-200";

    banner.innerHTML =
      online ?
        '<span class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></span><span>Online with live updates and cached fallback support.</span>'
      : '<span class="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]"></span><span>Offline mode is active. Local UI stays usable and cached content is available.</span>';
  }
}

function renderNotifications() {
  const permission = state.notifications.permission || "default";

  $("notificationBadge").textContent = permission;
  $("notificationSummary").textContent =
    state.notifications.lastAction || "Permission not requested yet.";
}

function renderBluetooth() {
  $("bluetoothBadge").textContent = state.bluetooth.status || "Idle";
  $("bluetoothSummary").textContent =
    state.bluetooth.diagnostics ||
    state.bluetooth.device ||
    "No device selected.";
}

async function refreshConnectivityStatus() {
  try {
    const result = await NetworkSensor.getNetworkStatus();
    const status = result?.status || {};

    state.network.connected = !!status.connected;
    state.network.type = status.connectionType || status.type || "unknown";
    state.network.source = result?.method || "browser";
    state.network.status = state.network.connected ? "Online" : "Offline";
    state.online = state.network.connected;
    renderNetwork();
  } catch {
    state.network.connected = navigator.onLine;
    state.network.type = "unknown";
    state.network.source = "browser";
    state.network.status = state.network.connected ? "Online" : "Offline";
    state.online = state.network.connected;
    renderNetwork();
  }

  try {
    const notifications = await Notifications.getNotificationDiagnostics();
    state.notifications.supported =
      notifications.capacitorPlugin || notifications.webSupported;
    state.notifications.permission =
      typeof Notification !== "undefined" ?
        Notification.permission
      : state.notifications.permission;
    state.notifications.lastAction = state.notifications.lastAction || "Ready";
    state.notifications.diagnostics =
      notifications.capacitorPlugin ? "Capacitor local notifications available."
      : notifications.webSupported ? "Web notifications available."
      : "Notifications unavailable.";
    renderNotifications();
  } catch {
    state.notifications.diagnostics = "Notifications unavailable.";
    renderNotifications();
  }

  try {
    const bluetooth = await Bluetooth.getBluetoothDiagnostics();
    state.bluetooth.supported = !!(bluetooth.web || bluetooth.capacitorPlugin);
    state.bluetooth.status =
      state.bluetooth.supported ? "Ready" : "Unsupported";
    state.bluetooth.diagnostics =
      bluetooth.web ? "Web Bluetooth available."
      : bluetooth.capacitorPlugin ? "Bluetooth LE plugin available on Android."
      : "Bluetooth unavailable in this environment.";
    renderBluetooth();
  } catch {
    state.bluetooth.status = "Unsupported";
    state.bluetooth.diagnostics = "Bluetooth unavailable in this environment.";
    renderBluetooth();
  }
}

function renderBattery() {
  if (!state.battery.supported) {
    state.battery.status = "Battery API unsupported";
    $("batteryValue").textContent = "N/A";
    $("batteryStatus").textContent = state.battery.status;
    return;
  }

  const percent = formatPercent(state.battery.level);
  const charging = state.battery.charging ? "Charging" : "Discharging";
  const remaining =
    state.battery.charging ?
      `Full in ${formatTime(state.battery.chargingTime)}`
    : `Remaining ${formatTime(state.battery.dischargingTime)}`;

  $("batteryValue").textContent = percent;
  $("batteryStatus").textContent = `${charging} · ${remaining}`;
}

function renderPlatform() {
  $("platformStatus").textContent = state.platform;
  $("platformValue").textContent = state.platform;
}

function renderOrientation() {
  $("orientationStatus").textContent = state.orientation.permission;
  $("orientationBadge").textContent =
    state.orientation.active ? "Active" : state.orientation.permission;
  $("gyroAlpha").textContent = formatNumber(state.orientation.alpha, 1);
  $("gyroBeta").textContent = formatNumber(state.orientation.beta, 1);
  $("gyroGamma").textContent = formatNumber(state.orientation.gamma, 1);
}

function renderMotion() {
  $("motionBadge").textContent =
    state.motion.active ? "Active" : state.motion.permission;
  $("motionX").textContent = formatNumber(state.motion.x, 2);
  $("motionY").textContent = formatNumber(state.motion.y, 2);
  $("motionZ").textContent = formatNumber(state.motion.z, 2);
}

function renderGravity() {
  $("gravityBadge").textContent =
    state.gravity.active ? "Active" : state.gravity.status;
  $("gravityX").textContent = formatNumber(state.gravity.x, 2);
  $("gravityY").textContent = formatNumber(state.gravity.y, 2);
  $("gravityZ").textContent = formatNumber(state.gravity.z, 2);
}

function renderVibration() {
  $("vibrationBadge").textContent =
    state.vibration.supported ? state.vibration.lastAction : "Unsupported";
}

function renderGps() {
  $("gpsStatus").textContent = state.gps.status;
  $("gpsValue").textContent = state.gps.active ? "Tracking" : "Idle";
  $("gpsLat").textContent = state.gps.lat;
  $("gpsLng").textContent = state.gps.lng;
  $("gpsSpeed").textContent = state.gps.speed;
  $("gpsAccuracy").textContent = state.gps.accuracy;
}

function renderCamera() {
  $("cameraName").textContent = state.camera.name;
  $("cameraSourceBadge").textContent = state.camera.source;

  if (state.camera.preview) {
    $("cameraPreview").src = state.camera.preview;
    $("cameraPreview").classList.remove("hidden");
    $("cameraPlaceholder").classList.add("hidden");
  } else {
    $("cameraPreview").removeAttribute("src");
    $("cameraPreview").classList.add("hidden");
    $("cameraPlaceholder").classList.remove("hidden");
  }
}

function renderVideo() {
  $("videoName").textContent = state.video.name;
  $("videoSourceBadge").textContent = state.video.source;

  if (state.video.preview) {
    $("videoPreview").src = state.video.preview;
    $("videoPreview").classList.remove("hidden");
    $("videoPlaceholder").classList.add("hidden");
  } else {
    $("videoPreview").removeAttribute("src");
    $("videoPreview").classList.add("hidden");
    $("videoPlaceholder").classList.remove("hidden");
  }
}

function renderVoice() {
  $("voiceName").textContent = state.voice.name;
  $("voiceStatusBadge").textContent =
    state.voice.recording ? "Recording" : state.voice.status;
  $("voiceStartBtn").disabled = state.voice.recording || !state.voice.supported;
  $("voiceStopBtn").disabled = !state.voice.recording;
  $("voiceStartBtn").classList.toggle(
    "opacity-50",
    state.voice.recording || !state.voice.supported,
  );
  $("voiceStopBtn").classList.toggle("opacity-50", !state.voice.recording);

  if (state.voice.preview) {
    $("voicePreview").src = state.voice.preview;
    $("voicePreview").classList.remove("hidden");
    $("voicePlaceholder").classList.add("hidden");
  } else {
    $("voicePreview").removeAttribute("src");
    $("voicePreview").classList.add("hidden");
    $("voicePlaceholder").classList.remove("hidden");
  }

  if (!state.voice.supported && !state.voice.recording) {
    $("voiceStatusBadge").textContent = "Unsupported";
    $("voiceName").textContent =
      "Audio recording is not available in this browser.";
  }
}

function renderGesture() {
  $("gestureBadge").textContent =
    state.gesture.supported ? `${state.gesture.count} gestures` : "Unsupported";
  $("gestureStatus").textContent = state.gesture.last;
}

function renderAll() {
  renderNetwork();
  renderBattery();
  renderPlatform();
  renderOrientation();
  renderMotion();
  renderGravity();
  renderVibration();
  renderNotifications();
  renderBluetooth();
  renderGps();
  renderCamera();
  renderVideo();
  renderVoice();
  renderGesture();
}

function wireNavigation() {
  document.querySelectorAll("[data-scroll-to]").forEach((button) => {
    button.addEventListener("click", async () => {
      await tapHaptics("Navigation tap");
      const target = document.getElementById(button.dataset.scrollTo);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function handleBattery() {
  if (!state.battery.supported) {
    renderBattery();
    return;
  }

  navigator
    .getBattery()
    .then((battery) => {
      batteryManager = battery;

      const update = () => {
        state.battery.level = battery.level;
        state.battery.charging = battery.charging;
        state.battery.chargingTime = battery.chargingTime;
        state.battery.dischargingTime = battery.dischargingTime;
        state.battery.status = battery.charging ? "Charging" : "Discharging";
        renderBattery();
      };

      battery.addEventListener("levelchange", update);
      battery.addEventListener("chargingchange", update);
      battery.addEventListener("chargingtimechange", update);
      battery.addEventListener("dischargingtimechange", update);
      update();
    })
    .catch(() => {
      state.battery.status = "Battery access blocked";
      renderBattery();
    });
}

async function requestNativeLocationPermission() {
  try {
    const current = await Geolocation.checkPermissions();

    if (
      current.location === "granted" ||
      current.coarseLocation === "granted"
    ) {
      return true;
    }

    const requested = await Geolocation.requestPermissions();
    return (
      requested.location === "granted" || requested.coarseLocation === "granted"
    );
  } catch {
    return false;
  }
}

function requestPermissionIfNeeded(sensorType) {
  const orientationApi = globalThis.DeviceOrientationEvent?.requestPermission;
  const motionApi = globalThis.DeviceMotionEvent?.requestPermission;
  const permissionApi =
    sensorType === "orientation" ? orientationApi : motionApi;

  if (typeof permissionApi !== "function") {
    return Promise.resolve("granted");
  }

  return permissionApi.call(
    sensorType === "orientation" ?
      globalThis.DeviceOrientationEvent
    : globalThis.DeviceMotionEvent,
  );
}

function stopOrientationSensor() {
  if (orientationSensor && typeof orientationSensor.stop === "function") {
    try {
      orientationSensor.stop();
    } catch {
      // ignore
    }
  }

  orientationSensor = null;
}

function stopMotionSensor() {
  if (motionSensor && typeof motionSensor.stop === "function") {
    try {
      motionSensor.stop();
    } catch {
      // ignore
    }
  }

  motionSensor = null;
}

function startOrientation() {
  if (!state.orientation.supported || state.orientation.active) {
    return;
  }

  if (!isSecureSensorContext()) {
    state.orientation.permission = "Requires HTTPS";
    renderOrientation();
    return;
  }

  if ("Gyroscope" in globalThis) {
    try {
      stopOrientationSensor();

      orientationSensor = new Gyroscope({ frequency: 60 });
      orientationSensor.addEventListener("reading", () => {
        state.orientation.alpha = orientationSensor.x;
        state.orientation.beta = orientationSensor.y;
        state.orientation.gamma = orientationSensor.z;
        state.orientation.permission = "Reading";
        renderOrientation();
      });
      orientationSensor.addEventListener("error", () => {
        state.orientation.permission = "Gyroscope error";
        state.orientation.active = false;
        renderOrientation();
      });
      orientationSensor.start();
      state.orientation.active = true;
      state.orientation.permission = "Active";
      renderOrientation();
      return;
    } catch {
      state.orientation.permission = "Gyroscope blocked";
    }
  }

  const handler = (event) => {
    state.orientation.alpha = event.alpha;
    state.orientation.beta = event.beta;
    state.orientation.gamma = event.gamma;
    renderOrientation();
  };

  globalThis.addEventListener("deviceorientation", handler, true);
  state.orientation.active = true;
  state.orientation.permission = "Active";
  renderOrientation();
}

function startMotion() {
  if (!state.motion.supported || state.motion.active) {
    return;
  }

  if (!isSecureSensorContext()) {
    state.motion.permission = "Requires HTTPS";
    renderMotion();
    return;
  }

  if (
    "Accelerometer" in globalThis ||
    "LinearAccelerationSensor" in globalThis
  ) {
    try {
      stopMotionSensor();

      const SensorClass =
        globalThis.LinearAccelerationSensor || globalThis.Accelerometer;
      motionSensor = new SensorClass({ frequency: 60 });

      motionSensor.addEventListener("reading", () => {
        state.motion.x = motionSensor.x;
        state.motion.y = motionSensor.y;
        state.motion.z = motionSensor.z;
        renderMotion();
      });
      motionSensor.addEventListener("error", () => {
        state.motion.permission = "Motion sensor error";
        state.motion.active = false;
        renderMotion();
      });
      motionSensor.start();
      state.motion.active = true;
      state.motion.permission = "Active";
      renderMotion();
      return;
    } catch {
      state.motion.permission = "Accelerometer blocked";
    }
  }

  const handler = (event) => {
    const acceleration =
      event.accelerationIncludingGravity || event.acceleration || {};
    state.motion.x = acceleration.x ?? null;
    state.motion.y = acceleration.y ?? null;
    state.motion.z = acceleration.z ?? null;
    renderMotion();
  };

  globalThis.addEventListener("devicemotion", handler, true);
  state.motion.active = true;
  state.motion.permission = "Active";
  renderMotion();
}

async function enableMotionSensors() {
  if (!isSecureSensorContext()) {
    state.orientation.permission = "Requires HTTPS";
    state.motion.permission = "Requires HTTPS";
    state.gravity.status = "Requires HTTPS";
    renderAll();
    return;
  }

  try {
    if (state.orientation.supported) {
      const orientationPermission =
        await requestPermissionIfNeeded("orientation");
      if (orientationPermission === "granted") {
        startOrientation();
      } else {
        state.orientation.permission = "Orientation permission denied";
      }
    } else {
      state.orientation.permission = "Not supported";
    }
  } catch {
    state.orientation.permission = "Orientation blocked";
  }

  try {
    if (state.motion.supported) {
      const motionPermission = await requestPermissionIfNeeded("motion");
      if (motionPermission === "granted") {
        startMotion();
      } else {
        state.motion.permission = "Motion permission denied";
      }
    } else {
      state.motion.permission = "Not supported";
    }
  } catch {
    state.motion.permission = "Motion blocked";
  }

  if (!state.gravity.supported) {
    state.gravity.status = "Generic sensor unavailable";
    renderAll();
    return;
  }

  try {
    gravitySensor = new GravitySensor({ frequency: 60 });
    gravitySensor.addEventListener("reading", () => {
      state.gravity.x = gravitySensor.x;
      state.gravity.y = gravitySensor.y;
      state.gravity.z = gravitySensor.z;
      state.gravity.status = "Reading";
      state.gravity.active = true;
      renderGravity();
    });
    gravitySensor.addEventListener("error", () => {
      state.gravity.status = "Sensor error";
      state.gravity.active = false;
      renderGravity();
    });
    gravitySensor.start();
    state.gravity.status = "Starting";
  } catch {
    state.gravity.status = "Blocked or unsupported";
    state.gravity.active = false;
  }

  renderAll();
}

function wireAutoSensorStart() {
  const retry = () => {
    enableMotionSensors().catch(() => {});
  };

  globalThis.addEventListener("pointerdown", retry, { once: true });
  globalThis.addEventListener("touchstart", retry, { once: true });
}

async function startGps() {
  if (!state.gps.supported) {
    state.gps.status = "Geolocation unsupported";
    renderGps();
    return;
  }

  stopGps();
  state.gps.status = "Requesting location permission...";
  renderGps();

  if (Capacitor.isNativePlatform()) {
    const hasPermission = await requestNativeLocationPermission();

    if (!hasPermission) {
      state.gps.status = "Location permission denied";
      state.gps.active = false;
      renderGps();
      return;
    }

    try {
      gpsWatchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          minimumUpdateInterval: 3000,
        },
        (position, error) => {
          if (error || !position) {
            state.gps.status = error?.message || "Location access blocked";
            state.gps.active = false;
            renderGps();
            return;
          }

          const { latitude, longitude, speed, accuracy } = position.coords;
          state.gps.lat = latitude.toFixed(6);
          state.gps.lng = longitude.toFixed(6);
          state.gps.speed = speed == null ? "n/a" : `${speed.toFixed(2)} m/s`;
          state.gps.accuracy = `${Math.round(accuracy)} m`;
          state.gps.status = "Tracking live position";
          state.gps.active = true;
          renderGps();
        },
      );

      state.gps.status = "Watching location";
      renderGps();
      return;
    } catch (error) {
      state.gps.status = error?.message || "Location access blocked";
      state.gps.active = false;
      renderGps();
      return;
    }
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed, accuracy } = position.coords;
      state.gps.lat = latitude.toFixed(6);
      state.gps.lng = longitude.toFixed(6);
      state.gps.speed = speed == null ? "n/a" : `${speed.toFixed(2)} m/s`;
      state.gps.accuracy = `${Math.round(accuracy)} m`;
      state.gps.status = "Tracking live position";
      state.gps.active = true;
      renderGps();
    },
    (error) => {
      state.gps.status = error.message || "Location access blocked";
      state.gps.active = false;
      renderGps();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    },
  );
}

function stopGps() {
  if (gpsWatchId != null) {
    if (Capacitor.isNativePlatform()) {
      Geolocation.clearWatch({ id: gpsWatchId }).catch(() => {});
    } else {
      navigator.geolocation.clearWatch(gpsWatchId);
    }
    gpsWatchId = null;
  }

  if (state.gps.active) {
    state.gps.status = "Stopped";
  }

  state.gps.active = false;
  renderGps();
}

async function tapHaptics(label = "Tap feedback") {
  try {
    const res = await Vibration.vibrateLight();
    state.vibration.lastAction = res.ok ? label : res.reason || "Blocked";
  } catch (e) {
    state.vibration.lastAction = "Haptics error";
  }
  renderVibration();
}

async function openCameraPicker() {
  try {
    const photo = await Camera.takePhoto({
      quality: 90,
      editable: "no",
      includeMetadata: true,
      webUseInput: true,
    });

    if (photo.webPath) {
      cleanupObjectUrl(state.camera.preview);
      state.camera.preview = photo.webPath;
      state.camera.name = "Captured photo";
      state.camera.source = "Capacitor camera";
      renderCamera();
      return;
    }
  } catch (error) {
    state.camera.source =
      error?.message ? `Camera error` : "File picker fallback";
    renderCamera();
  }

  $("cameraInput").click();
}

function openVideoPicker() {
  $("videoInput").click();
}

function startVoiceRecording() {
  if (!state.voice.supported || state.voice.recording) {
    state.voice.status = "Audio recording unsupported";
    renderVoice();
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanupObjectUrl(state.voice.preview);
        state.voice.preview = URL.createObjectURL(blob);
        state.voice.name = `Voice note · ${formatBytes(blob.size)}`;
        state.voice.status = "Recorded";
        state.voice.recording = false;
        renderVoice();
        stream.getTracks().forEach((track) => track.stop());
        voiceRecorder = null;
        voiceStream = null;
      });

      voiceRecorder = recorder;
      voiceStream = stream;
      state.voice.recording = true;
      state.voice.status = "Recording";
      state.voice.name = "Recording in progress";
      renderVoice();
      recorder.start();
    })
    .catch(() => {
      state.voice.status = "Microphone blocked";
      renderVoice();
    });
}

function stopVoiceRecording() {
  if (!voiceRecorder || !state.voice.recording) {
    return;
  }

  state.voice.status = "Saving recording...";
  renderVoice();
  voiceRecorder.stop();
}

function handleGestureStart(event) {
  gestureStart = {
    x: event.clientX,
    y: event.clientY,
    time: Date.now(),
  };
  state.gesture.last = "Gesture started";
  renderGesture();
}

function handleGestureEnd(event) {
  if (!gestureStart) {
    return;
  }

  const dx = event.clientX - gestureStart.x;
  const dy = event.clientY - gestureStart.y;
  const distance = Math.hypot(dx, dy);
  const elapsed = Date.now() - gestureStart.time;

  gestureStart = null;

  if (distance < 12 && elapsed < 400) {
    state.gesture.last = "Tap detected";
  } else if (Math.abs(dx) > Math.abs(dy)) {
    state.gesture.last = dx > 0 ? "Swipe right" : "Swipe left";
  } else {
    state.gesture.last = dy > 0 ? "Swipe down" : "Swipe up";
  }

  state.gesture.count += 1;
  renderGesture();
}

function bindEvents() {
  $("sidebarToggle").addEventListener("click", async () => {
    await tapHaptics("Sidebar toggled");
    toggleSidebar();
  });
  $("enableSensorsBtn").addEventListener("click", async () => {
    await tapHaptics("Sensors requested");
    enableMotionSensors();
  });
  $("enableGpsBtn").addEventListener("click", async () => {
    await tapHaptics("GPS requested");
    startGps();
  });
  $("openCameraBtn").addEventListener("click", async () => {
    await tapHaptics("Camera opened");
    openCameraPicker();
  });
  $("refreshNetworkBtn").addEventListener("click", async () => {
    await tapHaptics("Connectivity refreshed");
    await refreshConnectivityStatus();
  });
  $("requestNotificationBtn").addEventListener("click", async () => {
    await tapHaptics("Notification permission");
    const granted = await Notifications.requestNotificationPermission();
    state.notifications.permission =
      typeof Notification !== "undefined" ? Notification.permission
      : granted ? "granted"
      : "denied";
    state.notifications.lastAction =
      granted ?
        "Notification permission granted"
      : "Notification permission denied";
    renderNotifications();
  });
  $("testNotificationBtn").addEventListener("click", async () => {
    await tapHaptics("Notification test");
    const result = await Notifications.scheduleNotification({
      title: "Ionicity test notification",
      body: "This notification was triggered from the dashboard.",
      scheduleAt: new Date(),
    });
    state.notifications.lastAction =
      result.ok ?
        `Notification sent via ${result.method}`
      : "Notification blocked";
    renderNotifications();
  });
  $("scanBluetoothBtn").addEventListener("click", async () => {
    await tapHaptics("Bluetooth scan");
    const result = await Bluetooth.requestBluetoothDevice();
    if (result.ok) {
      state.bluetooth.status = "Ready";
      state.bluetooth.device =
        result.device?.name || result.method || "Bluetooth initialized";
      state.bluetooth.diagnostics =
        result.device?.gatt ? "Web Bluetooth device selected."
        : result.plugin ? "Bluetooth LE plugin initialized."
        : `Bluetooth method: ${result.method}`;
    } else {
      state.bluetooth.status = "Unsupported";
      state.bluetooth.diagnostics = result.reason || "Bluetooth unsupported";
    }
    renderBluetooth();
  });
  $("bluetoothDiagnosticsBtn").addEventListener("click", async () => {
    await tapHaptics("Bluetooth support check");
    const diag = await Bluetooth.getBluetoothDiagnostics();
    state.bluetooth.supported = !!(diag.web || diag.capacitorPlugin);
    state.bluetooth.status =
      state.bluetooth.supported ? "Ready" : "Unsupported";
    state.bluetooth.diagnostics =
      diag.web ? "Web Bluetooth available."
      : diag.capacitorPlugin ? "Bluetooth LE plugin available on Android."
      : "Bluetooth unavailable in this environment.";
    renderBluetooth();
  });
  $("startGpsBtn").addEventListener("click", async () => {
    await tapHaptics("GPS tracking");
    startGps();
  });
  $("stopGpsBtn").addEventListener("click", async () => {
    await tapHaptics("GPS stopped");
    stopGps();
  });
  $("lightVibrateBtn").addEventListener("click", async () => {
    try {
      const res = await Vibration.vibrateLight();
      state.vibration.lastAction =
        res.ok ? "Light vibration sent" : res.reason || "Blocked";
    } catch (e) {
      state.vibration.lastAction = "Haptics error";
    }
    renderVibration();
  });
  $("heavyVibrateBtn").addEventListener("click", async () => {
    try {
      const res = await Vibration.vibrateHeavy();
      state.vibration.lastAction =
        res.ok ? "Heavy vibration sent" : res.reason || "Blocked";
    } catch (e) {
      state.vibration.lastAction = "Haptics error";
    }
    renderVibration();
  });
  $("cameraBtn").addEventListener("click", async () => {
    await tapHaptics("Camera button");
    openCameraPicker();
  });
  $("videoBtn").addEventListener("click", async () => {
    await tapHaptics("Video picker");
    openVideoPicker();
  });
  $("voiceStartBtn").addEventListener("click", async () => {
    await tapHaptics("Recording started");
    startVoiceRecording();
  });
  $("voiceStopBtn").addEventListener("click", async () => {
    await tapHaptics("Recording stopped");
    stopVoiceRecording();
  });

  $("cameraInput").addEventListener("change", () => {
    const file = $("cameraInput").files?.[0];

    if (!file) {
      return;
    }

    cleanupObjectUrl(state.camera.preview);
    state.camera.preview = URL.createObjectURL(file);
    state.camera.name = `${file.name} · ${formatBytes(file.size)}`;
    state.camera.source = "File picker";
    renderCamera();
  });

  $("videoInput").addEventListener("change", () => {
    const file = $("videoInput").files?.[0];

    if (!file) {
      return;
    }

    cleanupObjectUrl(state.video.preview);
    state.video.preview = URL.createObjectURL(file);
    state.video.name = `${file.name} · ${formatBytes(file.size)}`;
    state.video.source = "File picker";
    renderVideo();
  });

  $("gesturePad").addEventListener("pointerdown", handleGestureStart);
  $("gesturePad").addEventListener("pointerup", handleGestureEnd);
  $("gesturePad").addEventListener("pointercancel", () => {
    gestureStart = null;
    state.gesture.last = "Gesture cancelled";
    renderGesture();
  });

  globalThis.addEventListener("online", () => {
    state.network.connected = true;
    state.online = true;
    state.network.status = "Online";
    renderNetwork();
  });

  globalThis.addEventListener("offline", () => {
    state.network.connected = false;
    state.online = false;
    state.network.status = "Offline";
    renderNetwork();
  });

  desktopMediaQuery.addEventListener("change", () => {
    sidebarCollapsed = !desktopMediaQuery.matches;
    updateSidebarUI();
  });
}

async function init() {
  app.innerHTML = template();
  cacheRefs();
  wireNavigation();
  bindEvents();
  updateSidebarUI();
  renderAll();
  handleBattery();
  refreshConnectivityStatus().catch(() => {});
  networkWatcher = await NetworkSensor.watchNetwork((status) => {
    state.network.connected = !!status?.connected;
    state.network.type = status?.connectionType || status?.type || "unknown";
    state.network.source = "watcher";
    state.network.status = state.network.connected ? "Online" : "Offline";
    state.online = state.network.connected;
    renderNetwork();
  }).catch(() => null);
  wireAutoSensorStart();
  enableMotionSensors().catch(() => {});

  // Probe vibration/haptics capabilities and update UI
  try {
    const diag = await Vibration.getVibrationDiagnostics();
    state.vibration.supported =
      diag.hapticsPlugin || diag.navigatorVibrate || state.vibration.supported;
    if (!state.vibration.supported) state.vibration.lastAction = "Unsupported";
    renderVibration();
  } catch (e) {
    // ignore
  }

  if (
    import.meta.env.PROD &&
    !Capacitor.isNativePlatform() &&
    "serviceWorker" in navigator
  ) {
    globalThis.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  // On native platforms, hide the splash screen once the UI is ready.
  try {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
  } catch {
    // ignore if SplashScreen isn't available
  }
}

globalThis.addEventListener("DOMContentLoaded", init);
