export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function bboxToString(bbox: [number, number, number, number]): string {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  return `${lonMin},${latMin},${lonMax},${latMax}`;
}

export function clampHorizon(days: number): number {
  return Math.max(1, Math.min(14, Math.round(days)));
}

export async function fetchForecast(bbox: [number, number, number, number], horizon = 7) {
  const res = await fetch(`${API_URL}/forecast?bbox=${bboxToString(bbox)}&horizon=${clampHorizon(horizon)}`);
  if (!res.ok) throw new Error(`forecast failed: ${res.status}`);
  return res.json();
}
