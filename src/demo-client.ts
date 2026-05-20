import "dotenv/config";
import {
  handleCompareSources,
  handleGenerateRecommendation,
  handleGetAirQuality,
  handleGetWeather,
} from "./handlers.js";
import { getResourceContent } from "./tools.js";

async function runDemo() {
  const location = "pune";
  const question = "Should I go for an outing in Pune this evening?";

  console.log("=== its-giving-weather demo ===\n");
  console.log("1. supported_locations");
  console.log(getResourceContent("recommendation://supported_locations"));
  console.log("\n2. get_weather");
  console.log(JSON.stringify(await handleGetWeather({ location }), null, 2));
  console.log("\n3. get_air_quality");
  console.log(JSON.stringify(await handleGetAirQuality({ location }), null, 2));
  console.log("\n4. compare_sources");
  console.log(JSON.stringify(await handleCompareSources({ location }), null, 2));
  console.log("\n5. generate_recommendation");
  console.log(
    JSON.stringify(
      await handleGenerateRecommendation({ location, question }),
      null,
      2
    )
  );
  console.log("\n6. source failure");
  console.log(
    JSON.stringify(
      await handleGetWeather({ location, simulateSourceFailure: true }),
      null,
      2
    )
  );
  console.log("\n7. invalid location");
  console.log(JSON.stringify(await handleGetWeather({ location: "atlantis" }), null, 2));
}

runDemo().catch(console.error);
