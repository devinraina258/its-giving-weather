import { SUPPORTED_LOCATIONS } from "./utils/weather-sources.js";

export const TOOL_NAMES = [
  "get_weather",
  "get_air_quality",
  "get_event_context",
  "compare_sources",
  "generate_recommendation",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const ALLOWED_TOOLS = new Set<string>(TOOL_NAMES);

export const toolDefinitions = [
  {
    name: "get_weather",
    description:
      "Fetch and aggregate weather from multiple mock sources for a location",
    inputSchema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City name e.g. Pune" },
        simulateSourceFailure: {
          type: "boolean",
          description: "Simulate one source failing for demo",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "get_air_quality",
    description: "Get air quality index for a location",
    inputSchema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
      },
      required: ["location"],
    },
  },
  {
    name: "get_event_context",
    description: "Get local events and crowd context",
    inputSchema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
      },
      required: ["location"],
    },
  },
  {
    name: "compare_sources",
    description: "Compare weather readings from two sources",
    inputSchema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
      },
      required: ["location"],
    },
  },
  {
    name: "generate_recommendation",
    description:
      "Aggregate multi-source data and generate AI recommendation via Grok",
    inputSchema: {
      type: "object" as const,
      properties: {
        location: { type: "string" },
        question: {
          type: "string",
          description: "User question e.g. Should I go out in Pune this evening?",
        },
        simulateSourceFailure: { type: "boolean" },
      },
      required: ["location", "question"],
    },
  },
];

export const resourceDefinitions = [
  {
    uri: "recommendation://supported_locations",
    name: "supported_locations",
    description: "List of supported cities",
    mimeType: "application/json",
  },
  {
    uri: "recommendation://recommendation_rules",
    name: "recommendation_rules",
    description: "Rules used for fallback recommendations",
    mimeType: "application/json",
  },
  {
    uri: "recommendation://source_metadata",
    name: "source_metadata",
    description: "Metadata about mock data sources",
    mimeType: "application/json",
  },
];

export const RECOMMENDATION_PROMPT = {
  name: "weather_outing_recommendation",
  description:
    "Template for generating a recommendation from retrieved weather data",
  arguments: [
    {
      name: "location",
      description: "City name",
      required: true,
    },
    {
      name: "aggregated_data",
      description: "JSON string of aggregated signals",
      required: true,
    },
    {
      name: "user_question",
      description: "Natural language user question",
      required: true,
    },
  ],
};

export function getResourceContent(uri: string): string {
  switch (uri) {
    case "recommendation://supported_locations":
      return JSON.stringify({ locations: SUPPORTED_LOCATIONS }, null, 2);
    case "recommendation://recommendation_rules":
      return JSON.stringify(
        {
          rules: [
            { if: "rainProbability >= 60", then: "Carry umbrella; consider delaying" },
            { if: "aqi > 100", then: "Avoid outdoor activity" },
            { if: "sourceAgreement === low", then: "State medium confidence" },
          ],
        },
        null,
        2
      );
    case "recommendation://source_metadata":
      return JSON.stringify(
        {
          sources: [
            { id: "mock-openweather", type: "weather", timeoutMs: 5000 },
            { id: "mock-weatherapi", type: "weather", timeoutMs: 5000 },
            { id: "mock-aqi-service", type: "air_quality", timeoutMs: 3000 },
            { id: "mock-events-api", type: "events", timeoutMs: 3000 },
          ],
        },
        null,
        2
      );
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

export function buildRecommendationPrompt(args: {
  location?: string;
  aggregated_data?: string;
  user_question?: string;
}): string {
  return `Given this weather data for ${args.location ?? "unknown"}:
${args.aggregated_data ?? "{}"}

User question: ${args.user_question ?? "Should I go out this evening?"}

Recommend whether to go out, carry an umbrella, postpone travel, or take health precautions. Suggest best tourist locations nearby based on weather. Be concise and actionable.`;
}
