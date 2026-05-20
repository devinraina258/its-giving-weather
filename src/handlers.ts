import type { ToolResponse } from "./types.js";
import { generateRecommendationWithGrok } from "./utils/grok-client.js";
import {
  aggregateWeatherAndContext,
  compareSources,
  fetchAirQuality,
  fetchEventContext,
  fetchWeatherSourceA,
  fetchWeatherSourceB,
  isSupportedLocation,
  normalizeLocation,
} from "./utils/weather-sources.js";

function ok<T>(data: T): ToolResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

function fail(error: string): ToolResponse<never> {
  return { success: false, error, timestamp: new Date().toISOString() };
}

function validateLocation(location: unknown): string | null {
  if (typeof location !== "string" || !location.trim()) {
    return null;
  }
  if (!isSupportedLocation(location)) {
    return null;
  }
  return normalizeLocation(location);
}

export async function handleGetWeather(args: {
  location?: string;
  simulateSourceFailure?: boolean;
}): Promise<ToolResponse<unknown>> {
  const loc = validateLocation(args.location);
  if (!loc) {
    return fail(
      "Invalid or unsupported location. Supported: pune, mumbai, delhi, bangalore, hyderabad, goa"
    );
  }

  const readings = [];
  const errors: string[] = [];

  try {
    readings.push(
      await fetchWeatherSourceA(loc, args.simulateSourceFailure ?? false)
    );
  } catch (e) {
    errors.push(`Source A: ${(e as Error).message}`);
  }

  try {
    readings.push(await fetchWeatherSourceB(loc, false));
  } catch (e) {
    errors.push(`Source B: ${(e as Error).message}`);
  }

  if (readings.length === 0) {
    return fail(errors.join("; ") || "All weather sources unavailable");
  }

  return ok({
    location: loc,
    readings,
    partialFailures: errors.length ? errors : undefined,
    confidence:
      readings.length >= 2
        ? "high"
        : readings.length === 1
          ? "medium"
          : "low",
  });
}

export async function handleGetAirQuality(args: {
  location?: string;
}): Promise<ToolResponse<unknown>> {
  const loc = validateLocation(args.location);
  if (!loc) return fail("Invalid or unsupported location");

  try {
    const data = await fetchAirQuality(loc);
    return ok(data);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function handleGetEventContext(args: {
  location?: string;
}): Promise<ToolResponse<unknown>> {
  const loc = validateLocation(args.location);
  if (!loc) return fail("Invalid or unsupported location");

  try {
    const data = await fetchEventContext(loc);
    return ok(data);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function handleCompareSources(args: {
  location?: string;
}): Promise<ToolResponse<unknown>> {
  const loc = validateLocation(args.location);
  if (!loc) return fail("Invalid or unsupported location");

  try {
    const [a, b] = await Promise.all([
      fetchWeatherSourceA(loc),
      fetchWeatherSourceB(loc),
    ]);
    const comparison = compareSources(a, b);
    return ok({
      sourceA: a,
      sourceB: b,
      agreement: comparison.agreement,
      notes: comparison.notes,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function handleGenerateRecommendation(args: {
  location?: string;
  question?: string;
  simulateSourceFailure?: boolean;
}): Promise<ToolResponse<unknown>> {
  const loc = validateLocation(args.location);
  if (!loc) return fail("Invalid or unsupported location");
  const question =
    typeof args.question === "string" && args.question.trim()
      ? args.question.trim()
      : `Should I go out in ${loc} this evening?`;

  const weatherReadings = [];
  const errors: string[] = [];

  try {
    weatherReadings.push(
      await fetchWeatherSourceA(loc, args.simulateSourceFailure ?? false)
    );
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    weatherReadings.push(await fetchWeatherSourceB(loc, false));
  } catch (e) {
    errors.push((e as Error).message);
  }

  if (weatherReadings.length === 0) {
    return fail("Cannot generate recommendation: no weather data");
  }

  let aqi;
  let events;
  try {
    [aqi, events] = await Promise.all([
      fetchAirQuality(loc),
      fetchEventContext(loc),
    ]);
  } catch (e) {
    return fail((e as Error).message);
  }

  const aggregated = aggregateWeatherAndContext(
    weatherReadings,
    aqi,
    events
  );
  const recommendation = await generateRecommendationWithGrok(
    aggregated,
    question
  );

  return ok({
    aggregated,
    recommendation,
    sourceFailures: errors.length ? errors : undefined,
  });
}

export type HandlerMap = {
  get_weather: typeof handleGetWeather;
  get_air_quality: typeof handleGetAirQuality;
  get_event_context: typeof handleGetEventContext;
  compare_sources: typeof handleCompareSources;
  generate_recommendation: typeof handleGenerateRecommendation;
};

export const handlers: HandlerMap = {
  get_weather: handleGetWeather,
  get_air_quality: handleGetAirQuality,
  get_event_context: handleGetEventContext,
  compare_sources: handleCompareSources,
  generate_recommendation: handleGenerateRecommendation,
};
