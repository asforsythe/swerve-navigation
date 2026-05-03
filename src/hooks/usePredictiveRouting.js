import { useCallback, useState } from "react";
import { calculateRouteSafety } from "../utils/safetyEngine";

const OFFSETS = [
  { hours: 0, label: "Now" },
  { hours: 0.5, label: "+30m" },
  { hours: 1, label: "+1h" },
  { hours: 2, label: "+2h" },
  { hours: 4, label: "+4h" },
  { hours: 6, label: "+6h" },
  { hours: 12, label: "+12h" },
  { hours: 24, label: "+24h" },
];

function ssiColor(ssi) {
  if (ssi >= 85) return "#34d399";
  if (ssi >= 70) return "#3b82f6";
  if (ssi >= 55) return "#fbbf24";
  if (ssi >= 30) return "#f97316";
  return "#ef4444";
}

export function usePredictiveRouting() {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOffset, setSelectedOffset] = useState(0);

  const run = useCallback(async (centerLat, centerLng) => {
    if (!centerLat || !centerLng) return;
    setIsLoading(true);
    setError("");
    try {
      const url = [
        "https://api.open-meteo.com/v1/forecast",
        `?latitude=${centerLat}&longitude=${centerLng}`,
        "&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code,visibility,relative_humidity_2m",
        "&forecast_days=2&timezone=auto",
        "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch",
      ].join("");

      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("Forecast unavailable");
      const data = await res.json();
      const h = data.hourly;
      const now = new Date();

      const computed = OFFSETS.map(({ hours, label }) => {
        const target = new Date(now.getTime() + hours * 3_600_000);

        // Find nearest hourly slot
        let bestIdx = 0, bestDiff = Infinity;
        for (let i = 0; i < h.time.length; i++) {
          const diff = Math.abs(new Date(h.time[i]) - target);
          if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
        }

        const precipInches = h.precipitation?.[bestIdx] ?? 0;
        const windGust = h.wind_gusts_10m?.[bestIdx] ?? 0;
        const windSpeed = h.wind_speed_10m?.[bestIdx] ?? 0;
        const weatherCode = h.weather_code?.[bestIdx] ?? 0;
        const visibility = h.visibility?.[bestIdx] ?? 10000;
        const humidity = h.relative_humidity_2m?.[bestIdx] ?? 50;
        const temp = h.temperature_2m?.[bestIdx] ?? 70;

        const point = {
          temperature_2m: temp,
          precipitationIntensity: precipInches,
          windGust: windGust,
          wind_speed_10m: windSpeed,
          weatherCode: weatherCode,
          visibility: visibility / 1000, // convert m to km
          relativeHumidity: humidity,
          lat: centerLat,
          lng: centerLng,
        };

        // Use a dummy route for single-point safety calc
        const safety = calculateRouteSafety({ duration: 600, distance: 5000 }, [point]);
        const isGolden = safety.ssi >= 85;

        return {
          hours,
          label,
          ssi: safety.ssi,
          category: safety.category,
          color: ssiColor(safety.ssi),
          isGolden,
          temp: Math.round(temp),
          precip: precipInches.toFixed(2), // inches, not mm
          precipMm: (precipInches * 25.4).toFixed(1),
          weatherCode,
          windGust,
          visibility: (visibility / 1000).toFixed(1),
        };
      });

      setResults(computed);
      // Auto-select the best golden window, else current
      const bestIdx = computed.reduce((best, r, i) => (r.ssi > computed[best].ssi ? i : best), 0);
      setSelectedOffset(bestIdx);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError("");
    setSelectedOffset(0);
  }, []);

  return { results, isLoading, error, selectedOffset, setSelectedOffset, run, reset };
}
