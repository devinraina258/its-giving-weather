# Challenge 8: MCP Server for Multi-Source Recommendation Agent

TalentServ technical challenge — MCP server exposing weather tools, resources, and prompts; multi-source aggregation; Grok-powered recommendations; authenticated demo web client.

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/challenge8-mcp-recommendation.git
cd challenge8-mcp-recommendation
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
gh repo create challenge8-mcp-recommendation --public --source=. --remote=origin --push
```

## License

MIT