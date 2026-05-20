import axios from "axios";
import type { AggregatedSignals, RecommendationResult } from "../types.js";
import { TOURIST_SPOTS } from "./weather-sources.js";

const GROK_URL =
  process.env.GROK_API_URL ?? "https://api.x.ai/v1";
const GROK_MODEL = process.env.GROK_MODEL ?? "grok-2-1212";

export async function generateRecommendationWithGrok(
  signals: AggregatedSignals,
  userQuestion: string
): Promise<RecommendationResult> {
  const apiKey = process.env.GROK_API_KEY;
  const spots =
    TOURIST_SPOTS[signals.location] ?? ["Explore local landmarks"];

  if (!apiKey || apiKey === "your_grok_api_key_here") {
    return generateFallbackRecommendation(signals, userQuestion, spots);
  }

  const prompt = `You are a travel and weather advisor for India.
User question: ${userQuestion}
Aggregated data: ${JSON.stringify(signals, null, 2)}
Nearby tourist spots to consider: ${spots.join(", ")}

Respond in JSON only with keys: recommendation, explanation, confidence (high|medium|low), precautions (array of strings), touristSpots (array). Be concise and actionable.`;

  try {
    const response = await axios.post(
      `${GROK_URL}/chat/completions`,
      {
        model: GROK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 30000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonFromContent(content);
    const conf = parsed.confidence as string | undefined;
    return {
      recommendation: String(parsed.recommendation ?? content.slice(0, 200)),
      explanation: String(parsed.explanation ?? "AI-generated from aggregated signals."),
      confidence: (conf === "high" || conf === "low" ? conf : "medium") as "high" | "medium" | "low",
      precautions: Array.isArray(parsed.precautions) ? (parsed.precautions as string[]) : defaultPrecautions(signals),
      touristSpots: Array.isArray(parsed.touristSpots) ? (parsed.touristSpots as string[]) : spots,
      source: "grok-api",
      timestamp: new Date().toISOString(),
      usedGrok: true,
    };
  } catch {
    return generateFallbackRecommendation(signals, userQuestion, spots);
  }
}

function generateFallbackRecommendation(
  signals: AggregatedSignals,
  userQuestion: string,
  spots: string[]
): RecommendationResult {
  const rain = signals.rainProbability;
  const aqi = signals.aqi;
  let recommendation: string;
  const precautions: string[] = [];

  if (aqi > 100) {
    recommendation =
      "Avoid prolonged outdoor activity due to poor air quality.";
    precautions.push("Wear a mask if you must go out");
  } else if (rain >= 60) {
    recommendation =
      "You can go out after 6 PM, but carry an umbrella — rain probability is high.";
    precautions.push("Carry umbrella", "Prefer covered venues");
  } else if (rain >= 35) {
    recommendation =
      "Outdoor outing is feasible; keep rain gear handy and check updates.";
    precautions.push("Light rain gear recommended");
  } else {
    recommendation =
      "Good conditions for an outing this evening. Safe to go out.";
  }

  return {
    recommendation,
    explanation: `Rule-based advice from ${signals.sources.length} sources (Grok API key not set or call failed). Question: "${userQuestion}". Avg temp ${signals.temperatureC}°C, rain ${rain}%, AQI ${aqi}, source agreement: ${signals.sourceAgreement}.`,
    confidence:
      signals.sourceAgreement === "high"
        ? "high"
        : signals.sourceAgreement === "medium"
          ? "medium"
          : "low",
    precautions: precautions.length ? precautions : defaultPrecautions(signals),
    touristSpots: spots.filter((_, i) => signals.aqi < 100 || i === 0),
    source: "fallback-rules",
    timestamp: new Date().toISOString(),
    usedGrok: false,
  };
}

function defaultPrecautions(signals: AggregatedSignals): string[] {
  const p: string[] = [];
  if (signals.rainProbability >= 50) p.push("Carry umbrella");
  if (signals.aqi > 100) p.push("Limit outdoor time — poor AQI");
  if (signals.windKph > 25) p.push("Strong wind — secure loose items");
  return p;
}

function parseJsonFromContent(content: string): Record<string, unknown> {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}
