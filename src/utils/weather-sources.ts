import type {
  AggregatedSignals,
  AirQualityReading,
  EventContext,
  NormalizedWeather,
} from "../types.js";

const SUPPORTED_LOCATIONS = [
  "pune",
  "mumbai",
  "delhi",
  "bangalore",
  "hyderabad",
  "goa",
];

export function isSupportedLocation(location: string): boolean {
  const key = location.trim().toLowerCase();
  return SUPPORTED_LOCATIONS.includes(key);
}

export function normalizeLocation(location: string): string {
  return location.trim().toLowerCase();
}

/** Mock Source A — OpenWeather-style */
export async function fetchWeatherSourceA(
  location: string,
  simulateFailure = false
): Promise<NormalizedWeather> {
  if (simulateFailure) {
    throw new Error("Source A unavailable");
  }
  await delay(50);
  const loc = normalizeLocation(location);
  const seed = hash(loc + "a");
  return {
    source: "mock-openweather",
    timestamp: new Date().toISOString(),
    location: loc,
    temperatureC: 28 + (seed % 5),
    humidity: 55 + (seed % 20),
    rainProbability: loc === "pune" ? 72 : 30 + (seed % 40),
    windKph: 8 + (seed % 12),
    condition: seed % 2 === 0 ? "partly cloudy" : "light rain likely",
    confidence: 0.85,
  };
}

/** Mock Source B — WeatherAPI-style */
export async function fetchWeatherSourceB(
  location: string,
  simulateFailure = false
): Promise<NormalizedWeather> {
  if (simulateFailure) {
    throw new Error("Source B unavailable");
  }
  await delay(60);
  const loc = normalizeLocation(location);
  const seed = hash(loc + "b");
  return {
    source: "mock-weatherapi",
    timestamp: new Date().toISOString(),
    location: loc,
    temperatureC: 27 + (seed % 6),
    humidity: 60 + (seed % 15),
    rainProbability: loc === "pune" ? 68 : 25 + (seed % 45),
    windKph: 10 + (seed % 10),
    condition: "humid with evening showers possible",
    confidence: 0.82,
  };
}

export async function fetchAirQuality(
  location: string
): Promise<AirQualityReading> {
  await delay(40);
  const loc = normalizeLocation(location);
  const seed = hash(loc + "aqi");
  const aqi = 40 + (seed % 80);
  return {
    source: "mock-aqi-service",
    timestamp: new Date().toISOString(),
    location: loc,
    aqi,
    category: aqi > 100 ? "unhealthy" : aqi > 50 ? "moderate" : "good",
    confidence: 0.78,
  };
}

export async function fetchEventContext(
  location: string
): Promise<EventContext> {
  await delay(30);
  const loc = normalizeLocation(location);
  const eventsByCity: Record<string, string[]> = {
    pune: ["Shaniwar Wada evening walk", "Koregaon Park food festival"],
    mumbai: ["Marine Drive sunset", "Colaba art walk"],
    goa: ["Baga beach live music", "Anjuna flea market"],
  };
  return {
    source: "mock-events-api",
    timestamp: new Date().toISOString(),
    location: loc,
    events: eventsByCity[loc] ?? ["Local market fair"],
    crowdLevel: loc === "pune" ? "medium" : "low",
  };
}

export function compareSources(
  a: NormalizedWeather,
  b: NormalizedWeather
): { agreement: "high" | "medium" | "low"; notes: string[] } {
  const tempDiff = Math.abs(a.temperatureC - b.temperatureC);
  const rainDiff = Math.abs(a.rainProbability - b.rainProbability);
  const notes: string[] = [];
  if (tempDiff > 3) notes.push(`Temperature differs by ${tempDiff}°C`);
  if (rainDiff > 15) notes.push(`Rain probability differs by ${rainDiff}%`);
  const agreement =
    tempDiff <= 2 && rainDiff <= 10
      ? "high"
      : tempDiff <= 5 && rainDiff <= 20
        ? "medium"
        : "low";
  return { agreement, notes };
}

export function aggregateWeatherAndContext(
  weatherReadings: NormalizedWeather[],
  aqi: AirQualityReading,
  events: EventContext
): AggregatedSignals {
  const avg = (vals: number[]) =>
    vals.reduce((s, v) => s + v, 0) / vals.length;

  const rainVals = weatherReadings.map((w) => w.rainProbability);
  const tempVals = weatherReadings.map((w) => w.temperatureC);
  const agreement =
    weatherReadings.length >= 2
      ? compareSources(weatherReadings[0], weatherReadings[1]).agreement
      : "medium";

  return {
    location: weatherReadings[0]?.location ?? events.location,
    timestamp: new Date().toISOString(),
    sources: [
      ...weatherReadings.map((w) => w.source),
      aqi.source,
      events.source,
    ],
    temperatureC: Math.round(avg(tempVals) * 10) / 10,
    rainProbability: Math.round(avg(rainVals)),
    humidity: Math.round(avg(weatherReadings.map((w) => w.humidity))),
    windKph: Math.round(avg(weatherReadings.map((w) => w.windKph))),
    aqi: aqi.aqi,
    events: events.events,
    sourceAgreement: agreement,
    confidence:
      weatherReadings.length >= 2
        ? (weatherReadings[0].confidence + weatherReadings[1].confidence) / 2
        : 0.7,
    disagreements:
      weatherReadings.length >= 2
        ? compareSources(weatherReadings[0], weatherReadings[1]).notes
        : [],
  };
}

export const TOURIST_SPOTS: Record<string, string[]> = {
  pune: ["Sinhagad Fort", "Osho Garden", "Pashan Lake"],
  mumbai: ["Gateway of India", "Elephanta Caves", "Juhu Beach"],
  goa: ["Dudhsagar Falls", "Fort Aguada", "Palolem Beach"],
  bangalore: ["Lalbagh", "Nandi Hills", "Cubbon Park"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export { SUPPORTED_LOCATIONS };
