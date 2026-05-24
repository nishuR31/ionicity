// Robust vibration / haptics helper with Capacitor plugin + web fallback
export async function isHapticsAvailable() {
  try {
    const mod = await import("@capacitor/haptics");
    return !!mod && !!mod.Haptics;
  } catch (e) {
    return false;
  }
}

async function tryHapticsImpact(style) {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    if (Haptics && typeof Haptics.impact === "function") {
      // If caller passed the literal ImpactStyle, preserve it; otherwise map strings
      const payload = { style: ImpactStyle?.[style] || style };
      await Haptics.impact(payload);
      return true;
    }
  } catch (e) {
    console.debug("Haptics impact failed:", e?.message || e);
  }
  return false;
}

async function tryHapticsVibrate(durationOrPattern) {
  try {
    const { Haptics } = await import("@capacitor/haptics");
    if (Haptics && typeof Haptics.vibrate === "function") {
      // Capacitor Haptics.vibrate accepts no args in some versions; emulate by impact otherwise
      await Haptics.vibrate();
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function tryNavigatorVibrate(durationOrPattern) {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(durationOrPattern || 50);
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export async function vibrateLight() {
  // prefer Haptics impact light, then generic vibrate
  const ok = await tryHapticsImpact("Light");
  if (ok) return { ok: true, method: "haptics.impact:Light" };
  if (await tryHapticsVibrate(30))
    return { ok: true, method: "haptics.vibrate" };
  if (tryNavigatorVibrate(30)) return { ok: true, method: "navigator.vibrate" };
  return { ok: false, reason: "unsupported" };
}

export async function vibrateHeavy() {
  const ok = await tryHapticsImpact("Heavy");
  if (ok) return { ok: true, method: "haptics.impact:Heavy" };
  if (await tryHapticsVibrate(80))
    return { ok: true, method: "haptics.vibrate" };
  if (tryNavigatorVibrate([80, 40, 80]))
    return { ok: true, method: "navigator.vibrate" };
  return { ok: false, reason: "unsupported" };
}

export async function vibratePattern(pattern) {
  // pattern: number or array
  if (Array.isArray(pattern)) {
    if (tryNavigatorVibrate(pattern))
      return { ok: true, method: "navigator.vibrate" };
  } else if (typeof pattern === "number") {
    if (tryNavigatorVibrate(pattern))
      return { ok: true, method: "navigator.vibrate" };
  }

  if (await tryHapticsVibrate(pattern))
    return { ok: true, method: "haptics.vibrate" };

  return { ok: false, reason: "unsupported" };
}

export async function getVibrationDiagnostics() {
  const hasHaptics = await isHapticsAvailable();
  const hasNavigator =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  return {
    hapticsPlugin: hasHaptics,
    navigatorVibrate: !!hasNavigator,
  };
}
