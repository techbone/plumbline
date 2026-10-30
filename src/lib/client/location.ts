/** A GPS fix from the phone, kept to the fields the server checks. */
export type Fix = { lat: number; lng: number; accuracy: number };

/**
 * Watch the phone's position and report each fix that beats the last one.
 * Fixes sharpen over the first seconds, and a walk gives them time. Returns a
 * stop function; a refusal or a phone without GPS simply never reports.
 */
export function watchLocation(onFix: (fix: Fix) => void): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return () => {};
  let best = Infinity;
  const id = navigator.geolocation.watchPosition(
    (p) => {
      if (p.coords.accuracy >= best) return;
      best = p.coords.accuracy;
      onFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 0, timeout: 60_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
