const app = document.getElementById('app');

const state = {
  online: navigator.onLine,
  battery: {
    supported: 'getBattery' in navigator,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
    status: 'Checking battery...',
  },
  orientation: {
    supported: 'DeviceOrientationEvent' in window,
    active: false,
    permission: 'Not enabled',
    alpha: '--',
    beta: '--',
    gamma: '--',
  },
  motion: {
    supported: 'DeviceMotionEvent' in window,
    active: false,
    permission: 'Not enabled',
    x: '--',
    y: '--',
    z: '--',
  },
  gravity: {
    supported: 'GravitySensor' in window,
    active: false,
    status: 'Unavailable',
    x: '--',
    y: '--',
    z: '--',
  },
  gps: {
    supported: 'geolocation' in navigator,
    active: false,
    status: 'Idle',
    lat: '--',
    lng: '--',
    speed: '--',
    accuracy: '--',
  },
  vibration: {
    supported: 'vibrate' in navigator,
    lastAction: 'Ready',
  },
  camera: {
    preview: null,
    name: 'No image selected',
  },
};

const refs = {};
let batteryManager = null;
let gravitySensor = null;
let gpsWatchId = null;
let sidebarCollapsed = window.innerWidth < 1024;
const desktopMediaQuery = window.matchMedia('(min-width: 1024px)');

function template() {
  return `
    <div class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.10),_transparent_24%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,1))]"></div>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"></div>

      <div class="relative mx-auto min-h-screen max-w-screen lg:pl-80">
        <aside class="fixed inset-x-0 top-0 z-40 max-h-[calc(100vh-0.5rem)] overflow-hidden border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl lg:inset-y-0 lg:left-0 lg:max-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-5 lg:overflow-y-auto">
          <div class="flex items-center justify-between gap-4 lg:block">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Ionic Dashboard</p>
              <h1 class="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-3xl">Device Console</h1>
              <p class="mt-2 max-w-sm text-sm leading-6 text-slate-300 lg:mt-3">
                Browser-native sensors, battery, network, vibration, camera, and location checks in one responsive shell.
              </p>
            </div>

            <button id="sidebarToggle" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 lg:hidden" aria-expanded="${!sidebarCollapsed}">
              <span id="sidebarToggleLabel">${sidebarCollapsed ? 'Open' : 'Close'}</span>
            </button>
          </div>

          <div id="sidebarBody" class="${sidebarCollapsed ? 'hidden lg:block' : 'block'} max-h-[calc(100vh-5rem)] overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
            <div class="mt-4 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 lg:mt-6">
              <span id="onlineDot" class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></span>
              <span id="onlineState">Online</span>
            </div>

            <nav class="mt-6 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              <button class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10" data-scroll-to="summary">Overview</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10" data-scroll-to="sensors">Sensors</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10" data-scroll-to="gpsCard">Location</button>
              <button class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10" data-scroll-to="cameraCard">Camera</button>
            </nav>

            <div class="mt-6 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Quick Actions</p>
              <button id="enableSensorsBtn" class="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                Enable motion sensors
              </button>
              <button id="enableGpsBtn" class="w-full rounded-2xl border border-cyan-300/30 bg-slate-900 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-slate-800">
                Enable GPS tracking
              </button>
              <button id="openCameraBtn" class="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-slate-800">
                Open camera / picker
              </button>
            </div>

            <div class="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Orientation</p>
                <p id="orientationStatus" class="mt-2 text-sm text-slate-200">Not enabled</p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Battery</p>
                <p id="batteryStatus" class="mt-2 text-sm text-slate-200">Checking battery...</p>
              </div>
            </div>
          </div>
        </aside>

        <main class="min-h-screen overflow-y-auto px-4 pb-24 pt-28 sm:px-6 lg:h-screen lg:px-8 lg:py-8 lg:pl-8 lg:pb-8 lg:pt-8">
          <section id="summary" class="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-2xl">
                <p class="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Live Device Snapshot</p>
                <h2 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Responsive sensor and system status panel.</h2>
                <p class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                  This version works directly in the browser with graceful fallbacks for unsupported APIs.
                  Motion sensors, battery, connectivity, vibration, GPS, and camera access are all isolated so one failure does not break the dashboard.
                </p>
              </div>

              <div class="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:min-w-[26rem] lg:grid-cols-3">
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
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Browser fallback</span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-300">Uses the native file picker with capture hints so it works without native Capacitor plugins.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="cameraBtn" class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Choose image</button>
                <input id="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" />
              </div>
              <div class="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                <div class="aspect-[4/3] w-full bg-slate-950">
                  <img id="cameraPreview" alt="Selected preview" class="hidden h-full w-full object-cover" />
                  <div id="cameraPlaceholder" class="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
                    No image selected yet.
                  </div>
                </div>
              </div>
              <p id="cameraName" class="mt-3 text-sm text-slate-300">No image selected</p>
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
  return Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return `${Math.round(value * 100)}%`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds === Infinity || seconds < 0) {
    return 'Unknown';
  }

  if (seconds === 0) {
    return 'Now';
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function cacheRefs() {
  [
    'sidebarToggle',
    'sidebarToggleLabel',
    'sidebarBody',
    'onlineDot',
    'onlineState',
    'enableSensorsBtn',
    'enableGpsBtn',
    'openCameraBtn',
    'orientationStatus',
    'batteryStatus',
    'networkValue',
    'batteryValue',
    'gpsValue',
    'orientationBadge',
    'gyroAlpha',
    'gyroBeta',
    'gyroGamma',
    'motionBadge',
    'motionX',
    'motionY',
    'motionZ',
    'gravityBadge',
    'gravityX',
    'gravityY',
    'gravityZ',
    'vibrationBadge',
    'lightVibrateBtn',
    'heavyVibrateBtn',
    'gpsStatus',
    'startGpsBtn',
    'stopGpsBtn',
    'gpsLat',
    'gpsLng',
    'gpsSpeed',
    'gpsAccuracy',
    'cameraBtn',
    'cameraInput',
    'cameraPreview',
    'cameraPlaceholder',
    'cameraName',
  ].forEach((id) => {
    refs[id] = document.getElementById(id);
  });
}

function updateSidebarUI() {
  const isDesktop = desktopMediaQuery.matches;
  const body = $('sidebarBody');
  const toggle = $('sidebarToggle');
  const label = $('sidebarToggleLabel');

  if (isDesktop) {
    body.classList.remove('hidden');
    body.classList.add('block');
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Open';
    return;
  }

  body.classList.toggle('hidden', sidebarCollapsed);
  body.classList.toggle('block', !sidebarCollapsed);
  toggle.setAttribute('aria-expanded', String(!sidebarCollapsed));
  label.textContent = sidebarCollapsed ? 'Open' : 'Close';
}

function toggleSidebar() {
  if (desktopMediaQuery.matches) {
    return;
  }

  sidebarCollapsed = !sidebarCollapsed;
  updateSidebarUI();
}

function renderNetwork() {
  const online = state.online;

  $("onlineDot").className = online
    ? 'h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
    : 'h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]';

  $("onlineState").textContent = online ? 'Online' : 'Offline';
  $("networkValue").textContent = online ? 'Online' : 'Offline';
}

function renderBattery() {
  if (!state.battery.supported) {
    state.battery.status = 'Battery API unsupported';
    $("batteryValue").textContent = 'N/A';
    $("batteryStatus").textContent = state.battery.status;
    return;
  }

  const percent = formatPercent(state.battery.level);
  const charging = state.battery.charging ? 'Charging' : 'Discharging';
  const remaining = state.battery.charging
    ? `Full in ${formatTime(state.battery.chargingTime)}`
    : `Remaining ${formatTime(state.battery.dischargingTime)}`;

  $("batteryValue").textContent = percent;
  $("batteryStatus").textContent = `${charging} · ${remaining}`;
}

function renderOrientation() {
  $("orientationStatus").textContent = state.orientation.permission;
  $("orientationBadge").textContent = state.orientation.active ? 'Active' : state.orientation.permission;
  $("gyroAlpha").textContent = formatNumber(state.orientation.alpha, 1);
  $("gyroBeta").textContent = formatNumber(state.orientation.beta, 1);
  $("gyroGamma").textContent = formatNumber(state.orientation.gamma, 1);
}

function renderMotion() {
  $("motionBadge").textContent = state.motion.active ? 'Active' : state.motion.permission;
  $("motionX").textContent = formatNumber(state.motion.x, 2);
  $("motionY").textContent = formatNumber(state.motion.y, 2);
  $("motionZ").textContent = formatNumber(state.motion.z, 2);
}

function renderGravity() {
  $("gravityBadge").textContent = state.gravity.active ? 'Active' : state.gravity.status;
  $("gravityX").textContent = formatNumber(state.gravity.x, 2);
  $("gravityY").textContent = formatNumber(state.gravity.y, 2);
  $("gravityZ").textContent = formatNumber(state.gravity.z, 2);
}

function renderVibration() {
  $("vibrationBadge").textContent = state.vibration.supported ? state.vibration.lastAction : 'Unsupported';
}

function renderGps() {
  $("gpsStatus").textContent = state.gps.status;
  $("gpsValue").textContent = state.gps.active ? 'Tracking' : 'Idle';
  $("gpsLat").textContent = state.gps.lat;
  $("gpsLng").textContent = state.gps.lng;
  $("gpsSpeed").textContent = state.gps.speed;
  $("gpsAccuracy").textContent = state.gps.accuracy;
}

function renderCamera() {
  $("cameraName").textContent = state.camera.name;

  if (state.camera.preview) {
    $("cameraPreview").src = state.camera.preview;
    $("cameraPreview").classList.remove('hidden');
    $("cameraPlaceholder").classList.add('hidden');
  } else {
    $("cameraPreview").removeAttribute('src');
    $("cameraPreview").classList.add('hidden');
    $("cameraPlaceholder").classList.remove('hidden');
  }
}

function renderAll() {
  renderNetwork();
  renderBattery();
  renderOrientation();
  renderMotion();
  renderGravity();
  renderVibration();
  renderGps();
  renderCamera();
}

function wireNavigation() {
  document.querySelectorAll('[data-scroll-to]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scrollTo);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function handleBattery() {
  if (!state.battery.supported) {
    renderBattery();
    return;
  }

  navigator.getBattery().then((battery) => {
    batteryManager = battery;

    const update = () => {
      state.battery.level = battery.level;
      state.battery.charging = battery.charging;
      state.battery.chargingTime = battery.chargingTime;
      state.battery.dischargingTime = battery.dischargingTime;
      state.battery.status = battery.charging ? 'Charging' : 'Discharging';
      renderBattery();
    };

    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
    battery.addEventListener('chargingtimechange', update);
    battery.addEventListener('dischargingtimechange', update);
    update();
  }).catch(() => {
    state.battery.status = 'Battery access blocked';
    renderBattery();
  });
}

function requestPermissionIfNeeded(sensorType) {
  const permissionApi = sensorType === 'orientation'
    ? DeviceOrientationEvent.requestPermission
    : DeviceMotionEvent.requestPermission;

  if (typeof permissionApi !== 'function') {
    return Promise.resolve('granted');
  }

  return permissionApi.call(sensorType === 'orientation' ? DeviceOrientationEvent : DeviceMotionEvent);
}

function startOrientation() {
  if (!state.orientation.supported || state.orientation.active) {
    return;
  }

  const handler = (event) => {
    state.orientation.alpha = event.alpha;
    state.orientation.beta = event.beta;
    state.orientation.gamma = event.gamma;
    renderOrientation();
  };

  window.addEventListener('deviceorientation', handler, true);
  state.orientation.active = true;
  state.orientation.permission = 'Active';
  renderOrientation();
}

function startMotion() {
  if (!state.motion.supported || state.motion.active) {
    return;
  }

  const handler = (event) => {
    const acceleration = event.accelerationIncludingGravity || event.acceleration || {};
    state.motion.x = acceleration.x ?? null;
    state.motion.y = acceleration.y ?? null;
    state.motion.z = acceleration.z ?? null;
    renderMotion();
  };

  window.addEventListener('devicemotion', handler, true);
  state.motion.active = true;
  state.motion.permission = 'Active';
  renderMotion();
}

async function enableMotionSensors() {
  try {
    if (state.orientation.supported) {
      const orientationPermission = await requestPermissionIfNeeded('orientation');
      if (orientationPermission === 'granted') {
        startOrientation();
      } else {
        state.orientation.permission = 'Orientation permission denied';
      }
    } else {
      state.orientation.permission = 'Not supported';
    }
  } catch (error) {
    state.orientation.permission = 'Orientation blocked';
  }

  try {
    if (state.motion.supported) {
      const motionPermission = await requestPermissionIfNeeded('motion');
      if (motionPermission === 'granted') {
        startMotion();
      } else {
        state.motion.permission = 'Motion permission denied';
      }
    } else {
      state.motion.permission = 'Not supported';
    }
  } catch (error) {
    state.motion.permission = 'Motion blocked';
  }

  if (!state.gravity.supported) {
    state.gravity.status = 'Generic sensor unavailable';
    renderAll();
    return;
  }

  try {
    gravitySensor = new GravitySensor({ frequency: 60 });
    gravitySensor.addEventListener('reading', () => {
      state.gravity.x = gravitySensor.x;
      state.gravity.y = gravitySensor.y;
      state.gravity.z = gravitySensor.z;
      state.gravity.status = 'Reading';
      state.gravity.active = true;
      renderGravity();
    });
    gravitySensor.addEventListener('error', () => {
      state.gravity.status = 'Sensor error';
      state.gravity.active = false;
      renderGravity();
    });
    gravitySensor.start();
    state.gravity.status = 'Starting';
  } catch (error) {
    state.gravity.status = 'Blocked or unsupported';
    state.gravity.active = false;
  }

  renderAll();
}

function startGps() {
  if (!state.gps.supported) {
    state.gps.status = 'Geolocation unsupported';
    renderGps();
    return;
  }

  stopGps();
  state.gps.status = 'Requesting location permission...';
  renderGps();

  gpsWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed, accuracy } = position.coords;
      state.gps.lat = latitude.toFixed(6);
      state.gps.lng = longitude.toFixed(6);
      state.gps.speed = speed == null ? 'n/a' : `${speed.toFixed(2)} m/s`;
      state.gps.accuracy = `${Math.round(accuracy)} m`;
      state.gps.status = 'Tracking live position';
      state.gps.active = true;
      renderGps();
    },
    (error) => {
      state.gps.status = error.message || 'Location access blocked';
      state.gps.active = false;
      renderGps();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    }
  );
}

function stopGps() {
  if (gpsWatchId != null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }

  if (state.gps.active) {
    state.gps.status = 'Stopped';
  }

  state.gps.active = false;
  renderGps();
}

function vibrate(pattern, label) {
  if (!state.vibration.supported) {
    state.vibration.lastAction = 'Unsupported';
    renderVibration();
    return;
  }

  const success = navigator.vibrate(pattern);
  state.vibration.lastAction = success ? label : 'Vibration blocked';
  renderVibration();
}

function openCameraPicker() {
  $("cameraInput").click();
}

function bindEvents() {
  $('sidebarToggle').addEventListener('click', toggleSidebar);
  $("enableSensorsBtn").addEventListener('click', enableMotionSensors);
  $("enableGpsBtn").addEventListener('click', startGps);
  $("openCameraBtn").addEventListener('click', openCameraPicker);
  $("startGpsBtn").addEventListener('click', startGps);
  $("stopGpsBtn").addEventListener('click', stopGps);
  $("lightVibrateBtn").addEventListener('click', () => vibrate(40, 'Light vibration sent'));
  $("heavyVibrateBtn").addEventListener('click', () => vibrate([60, 30, 60], 'Heavy vibration sent'));
  $("cameraBtn").addEventListener('click', openCameraPicker);

  $("cameraInput").addEventListener('change', () => {
    const file = $("cameraInput").files && $("cameraInput").files[0];

    if (!file) {
      return;
    }

    if (state.camera.preview) {
      URL.revokeObjectURL(state.camera.preview);
    }

    state.camera.preview = URL.createObjectURL(file);
    state.camera.name = `${file.name} · ${Math.round(file.size / 1024)} KB`;
    renderCamera();
  });

  window.addEventListener('online', () => {
    state.online = true;
    renderNetwork();
  });

  window.addEventListener('offline', () => {
    state.online = false;
    renderNetwork();
  });

  desktopMediaQuery.addEventListener('change', () => {
    sidebarCollapsed = !desktopMediaQuery.matches;
    updateSidebarUI();
  });
}

function init() {
  app.innerHTML = template();
  cacheRefs();
  wireNavigation();
  bindEvents();
  updateSidebarUI();
  renderAll();
  handleBattery();
}

window.addEventListener('DOMContentLoaded', init);