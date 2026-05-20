#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handlers } from "./handlers.js";
import {
  ALLOWED_TOOLS,
  buildRecommendationPrompt,
  getResourceContent,
  RECOMMENDATION_PROMPT,
  resourceDefinitions,
  toolDefinitions,
} from "./tools.js";

const server = new Server(
  {
    name: "recommendation-agent",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!ALLOWED_TOOLS.has(name)) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: `Tool not allowlisted: ${name}`,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
      isError: true,
    };
  }

  const handler = handlers[name as keyof typeof handlers];
  const result = await handler(
    (args ?? {}) as Parameters<typeof handler>[0]
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    isError: !result.success,
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: resourceDefinitions.map((r) => ({
    uri: r.uri,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    const text = getResourceContent(uri);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text,
        },
      ],
    };
  } catch (e) {
    throw new Error((e as Error).message);
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: RECOMMENDATION_PROMPT.name,
      description: RECOMMENDATION_PROMPT.description,
      arguments: RECOMMENDATION_PROMPT.arguments,
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name !== RECOMMENDATION_PROMPT.name) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  const argMap: Record<string, string> = {};
  if (args && typeof args === "object") {
    if (Array.isArray(args)) {
      for (const a of args) {
        argMap[a.name] = a.value ?? "";
      }
    } else {
      Object.assign(argMap, args as Record<string, string>);
    }
  }
  const text = buildRecommendationPrompt({
    location: argMap.location,
    aggregated_data: argMap.aggregated_data,
    user_question: argMap.user_question,
  });
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
