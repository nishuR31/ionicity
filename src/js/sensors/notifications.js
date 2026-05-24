// Notifications helper: uses Capacitor Local Notifications on native, Notification API on web
export async function requestNotificationPermission() {
  try {
    // Prefer Capacitor plugin when available
    const mod = await import("@capacitor/local-notifications");
    if (
      mod &&
      mod.LocalNotifications &&
      mod.LocalNotifications.requestPermissions
    ) {
      const res = await mod.LocalNotifications.requestPermissions();
      return res.granted || res.display === "granted" || false;
    }
  } catch (e) {
    // fallthrough to web API
  }

  if (typeof Notification !== "undefined" && Notification.requestPermission) {
    const p = await Notification.requestPermission();
    return p === "granted";
  }
  return false;
}

export async function scheduleNotification({
  id = 1,
  title = "Note",
  body = "",
  scheduleAt = null,
} = {}) {
  try {
    const mod = await import("@capacitor/local-notifications");
    if (mod && mod.LocalNotifications && mod.LocalNotifications.schedule) {
      const notification = { id, title, body };
      if (scheduleAt instanceof Date)
        notification.schedule = { at: scheduleAt };
      await mod.LocalNotifications.schedule({ notifications: [notification] });
      return { ok: true, method: "capacitor" };
    }
  } catch (e) {
    console.debug("LocalNotifications schedule failed", e?.message || e);
  }

  // Web fallback: show an in-page Notification if permitted
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body });
      return { ok: true, method: "web" };
    }
  } catch (e) {
    console.debug("Web Notification failed", e?.message || e);
  }
  return { ok: false };
}

export async function getNotificationDiagnostics() {
  let hasCapacitor = false;
  try {
    const mod = await import("@capacitor/local-notifications");
    hasCapacitor = !!(
      mod &&
      mod.LocalNotifications &&
      mod.LocalNotifications.schedule
    );
  } catch (e) {
    hasCapacitor = false;
  }
  const webSupported = typeof Notification !== "undefined";
  return { capacitorPlugin: hasCapacitor, webSupported };
}
