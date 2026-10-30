/**
 * Where the walk was filmed. The phone reports a GPS fix; a site's first
 * located visit becomes its pin, and later visits are measured against it.
 * The fix comes from the phone, so this catches the lazy fake (an old video
 * from somewhere else), not a spoofed GPS.
 */

export type GeoFix = { lat: number; lng: number; accuracy: number };

export type LocationCheck = {
  status: "passed" | "pinned" | "review" | "missing";
  distanceM: number | null;
  accuracyM: number | null;
  note: string;
};

/** A fix rougher than this can't pin a site. */
export const PIN_MAX_ACCURACY_M = 150;
/** How far from the pin a visit may be, on top of both fixes' accuracy. */
export const SITE_RADIUS_M = 150;

export function parseFix(raw: unknown): GeoFix | null {
  const r = raw as Partial<GeoFix> | null;
  if (!r || typeof r !== "object") return null;
  const { lat, lng, accuracy } = r;
  if (typeof lat !== "number" || typeof lng !== "number" || typeof accuracy !== "number") return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || !(accuracy > 0) || accuracy > 50_000) return null;
  return { lat, lng, accuracy };
}

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export function checkLocation(fix: GeoFix | null, pin: GeoFix | null): LocationCheck {
  if (!fix) return { status: "missing", distanceM: null, accuracyM: null, note: "The phone didn't share its location" };
  const acc = Math.round(fix.accuracy);
  if (!pin) {
    if (fix.accuracy > PIN_MAX_ACCURACY_M) {
      return { status: "review", distanceM: null, accuracyM: acc, note: `Location too rough to pin the site (±${formatDistance(fix.accuracy)})` };
    }
    return { status: "pinned", distanceM: 0, accuracyM: acc, note: `First located visit: this spot is now the site pin (GPS ±${acc} m)` };
  }
  const d = distanceM(fix, pin);
  if (d <= SITE_RADIUS_M + fix.accuracy + pin.accuracy) {
    return { status: "passed", distanceM: Math.round(d), accuracyM: acc, note: `${formatDistance(d)} from the site pin (GPS ±${acc} m)` };
  }
  return { status: "review", distanceM: Math.round(d), accuracyM: acc, note: `Filmed ${formatDistance(d)} from the site pin` };
}
