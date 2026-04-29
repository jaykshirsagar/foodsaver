function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadius = 6371;
  const latDiff = toRadians(bLat - aLat);
  const lngDiff = toRadians(bLng - aLng);
  const p1 = toRadians(aLat);
  const p2 = toRadians(bLat);
  const haversineBase =
    Math.sin(latDiff / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversineBase), Math.sqrt(1 - haversineBase));
}
