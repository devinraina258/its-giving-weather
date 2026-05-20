# its-giving-weather

TalentServ technical challenge — MCP server exposing weather tools, resources, and prompts; multi-source aggregation; Grok-powered recommendations; authenticated demo web client.

## Quick start

```bash
git clone https://github.com/devinraina258/its-giving-weather.git
cd its-giving-weather
cp env.example .env
npm install
npm test
npm run demo
npm run web
```

## MCP tools

| Tool | Description |
|------|-------------|
| get_weather | Fetch from 2 mock weather sources |
| get_air_quality | AQI for location |
| get_event_context | Local events |
| compare_sources | Cross-source agreement |
| generate_recommendation | Aggregate + Grok recommendation |

## Environment

Copy `env.example` to `.env`. Set `GROK_API_KEY` from https://console.x.ai for live AI recommendations.

## Publish to GitHub

```bash
gh auth login
gh repo create its-giving-weather --public --source=. --remote=origin --push
```

## License

MIT
