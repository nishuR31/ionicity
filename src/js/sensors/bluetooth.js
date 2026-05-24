// Bluetooth helper: tries Web Bluetooth API first, falls back to Capacitor community plugin if present
export async function requestBluetoothDevice(
  filters = [{ acceptAllDevices: true }],
) {
  // Web Bluetooth
  try {
    const nav = globalThis.navigator;
    if (
      nav &&
      nav.bluetooth &&
      typeof nav.bluetooth.requestDevice === "function"
    ) {
      const requestOptions =
        (
          Array.isArray(filters) &&
          filters.length > 0 &&
          !filters[0]?.acceptAllDevices
        ) ?
          { filters }
        : { acceptAllDevices: true };
      const device = await nav.bluetooth.requestDevice({
        ...requestOptions,
        optionalServices: [],
      });
      return { ok: true, method: "web", device };
    }
  } catch (e) {
    console.debug("Web Bluetooth request failed", e?.message || e);
  }

  // Try Capacitor Community Bluetooth LE plugin if available
  try {
    const mod = await import("@capacitor-community/bluetooth-le");
    if (
      mod &&
      mod.BluetoothLe &&
      typeof mod.BluetoothLe.initialize === "function"
    ) {
      await mod.BluetoothLe.initialize();
      return { ok: true, method: "capacitor-plugin", plugin: "bluetooth-le" };
    }
  } catch (e) {
    console.debug(
      "Capacitor BluetoothLE plugin not available",
      e?.message || e,
    );
  }

  return { ok: false, reason: "unsupported" };
}

export async function getBluetoothDiagnostics() {
  const nav = globalThis.navigator;
  const web = !!(
    nav &&
    nav.bluetooth &&
    typeof nav.bluetooth.requestDevice === "function"
  );
  let cap = false;
  try {
    const mod = await import("@capacitor-community/bluetooth-le");
    cap = !!(mod && mod.BluetoothLe);
  } catch (e) {
    cap = false;
  }
  return { web, capacitorPlugin: cap };
}
