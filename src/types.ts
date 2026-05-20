export interface NormalizedWeather {
  source: string;
  timestamp: string;
  location: string;
  temperatureC: number;
  humidity: number;
  rainProbability: number;
  windKph: number;
  condition: string;
  confidence: number;
}

export interface AirQualityReading {
  source: string;
  timestamp: string;
  location: string;
  aqi: number;
  category: string;
  confidence: number;
}

export interface EventContext {
  source: string;
  timestamp: string;
  location: string;
  events: string[];
  crowdLevel: "low" | "medium" | "high";
}

export interface AggregatedSignals {
  location: string;
  timestamp: string;
  sources: string[];
  temperatureC: number;
  rainProbability: number;
  humidity: number;
  windKph: number;
  aqi: number;
  events: string[];
  sourceAgreement: "high" | "medium" | "low";
  confidence: number;
  disagreements: string[];
}

export interface RecommendationResult {
  recommendation: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
  precautions: string[];
  touristSpots?: string[];
  source: string;
  timestamp: string;
  usedGrok: boolean;
}

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
