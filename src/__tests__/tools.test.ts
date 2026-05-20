import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleCompareSources,
  handleGenerateRecommendation,
  handleGetAirQuality,
  handleGetWeather,
} from "../handlers.js";
import {
  aggregateWeatherAndContext,
  compareSources,
  fetchAirQuality,
  fetchEventContext,
  fetchWeatherSourceA,
  fetchWeatherSourceB,
  isSupportedLocation,
} from "../utils/weather-sources.js";
import { getResourceContent } from "../tools.js";

describe("location validation", () => {
  it("supports pune", () => assert.equal(isSupportedLocation("Pune"), true));
  it("rejects unknown city", () => assert.equal(isSupportedLocation("atlantis"), false));
});

describe("get_weather handler", () => {
  it("returns aggregated readings for pune", async () => {
    const res = await handleGetWeather({ location: "pune" });
    assert.equal(res.success, true);
    assert.ok(res.data);
  });
  it("handles invalid location", async () => {
    const res = await handleGetWeather({ location: "xyz" });
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /Invalid|unsupported/i);
  });
  it("handles partial source failure", async () => {
    const res = await handleGetWeather({ location: "pune", simulateSourceFailure: true });
    assert.equal(res.success, true);
    const data = res.data as { partialFailures?: string[] };
    assert.ok((data.partialFailures?.length ?? 0) > 0);
  });
});

describe("compare_sources", () => {
  it("reports agreement", async () => {
    const res = await handleCompareSources({ location: "mumbai" });
    assert.equal(res.success, true);
    const data = res.data as { agreement: string };
    assert.ok(["high", "medium", "low"].includes(data.agreement));
  });
});

describe("aggregation", () => {
  it("combines signals", async () => {
    const [a, b, aqi, events] = await Promise.all([
      fetchWeatherSourceA("pune"),
      fetchWeatherSourceB("pune"),
      fetchAirQuality("pune"),
      fetchEventContext("pune"),
    ]);
    const agg = aggregateWeatherAndContext([a, b], aqi, events);
    assert.ok(agg.sources.length >= 3);
    assert.ok(agg.rainProbability > 0);
  });
  it("detects rain differences", () => {
    const a = { source: "a", timestamp: "", location: "pune", temperatureC: 30, humidity: 50, rainProbability: 80, windKph: 10, condition: "rain", confidence: 0.9 };
    const b = { ...a, rainProbability: 40, source: "b" };
    assert.ok(compareSources(a, b).notes.length > 0);
  });
});

describe("generate_recommendation", () => {
  it("fallback without grok key", async () => {
    const prev = process.env.GROK_API_KEY;
    delete process.env.GROK_API_KEY;
    const res = await handleGenerateRecommendation({ location: "pune", question: "Should I go out?" });
    if (prev) process.env.GROK_API_KEY = prev;
    assert.equal(res.success, true);
    const data = res.data as { recommendation: { recommendation: string; usedGrok: boolean } };
    assert.ok(data.recommendation.recommendation);
    assert.equal(data.recommendation.usedGrok, false);
  });
});

describe("resources", () => {
  it("supported_locations", () => {
    const json = JSON.parse(getResourceContent("recommendation://supported_locations"));
    assert.ok(json.locations.includes("pune"));
  });
  it("air quality handler", async () => {
    const res = await handleGetAirQuality({ location: "goa" });
    assert.equal(res.success, true);
  });
});