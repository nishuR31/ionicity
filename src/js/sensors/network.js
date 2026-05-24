// Network / Wi‑Fi status helper: uses Capacitor Network plugin when available, otherwise navigator.connection
export async function getNetworkStatus() {
  try {
    const mod = await import("@capacitor/network");
    if (mod && mod.Network && typeof mod.Network.getStatus === "function") {
      const s = await mod.Network.getStatus();
      return { ok: true, method: "capacitor", status: s };
    }
  } catch (e) {
    // fallback
  }

  // Browser fallback
  try {
    const nav = globalThis.navigator || {};
    const conn = nav.connection || nav.webkitConnection || null;
    const type = conn ? conn.effectiveType || conn.type : undefined;
    const online = typeof nav.onLine === "boolean" ? nav.onLine : true;
    return {
      ok: true,
      method: "browser",
      status: { connected: online, connectionType: type },
    };
  } catch (e) {
    return { ok: false, reason: "unknown" };
  }
}

export async function watchNetwork(callback) {
  try {
    const mod = await import("@capacitor/network");
    if (mod && mod.Network && typeof mod.Network.addListener === "function") {
      const listener = await mod.Network.addListener(
        "networkStatusChange",
        (status) => callback(status),
      );
      return { ok: true, unsubscribe: () => listener.remove() };
    }
  } catch (e) {
    // fallback to browser events
  }

  function handler() {
    callback({ connected: globalThis.navigator?.onLine });
  }
  globalThis.addEventListener("online", handler);
  globalThis.addEventListener("offline", handler);
  return {
    ok: true,
    unsubscribe: () => {
      globalThis.removeEventListener("online", handler);
      globalThis.removeEventListener("offline", handler);
    },
  };
}
