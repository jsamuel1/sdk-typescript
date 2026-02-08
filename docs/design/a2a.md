# A2A Protocol Support — Design Document

GitHub Issue: [#394](https://github.com/strands-agents/sdk-typescript/issues/394)

## Overview

Add Agent-to-Agent (A2A) protocol support to the Strands TypeScript SDK, enabling agents to be exposed as A2A servers and to communicate with remote A2A agents as clients.

The design mirrors the Python SDK's architecture: a thin adapter layer over the official `@a2a-js/sdk` package, converting between Strands SDK types and A2A protocol types.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@a2a-js/sdk` | Official A2A protocol types, client factory, server primitives |
| `express` (optional peer) | HTTP framework for A2A server |

The `@a2a-js/sdk` package provides: `AgentCard`, `Message`, `Task`, `Part` types, `ClientFactory` for client creation, `AgentExecutor`/`RequestContext`/`ExecutionEventBus`/`DefaultRequestHandler`/`InMemoryTaskStore` for server creation, and Express middleware (`agentCardHandler`, `jsonRpcHandler`).

These are optional peer dependencies — users install them only when using A2A features, matching the Python SDK's `pip install 'strands-agents[a2a]'` pattern.

## File Structure

```
src/
├── a2a/
│   ├── index.ts              # Public exports
│   ├── server.ts             # A2AServer class
│   ├── executor.ts           # StrandsA2AExecutor (Agent → A2A adapter)
│   └── client.ts             # A2AClient class (ToolList-compatible)
```

Exported from SDK via subpath: `import { A2AServer, A2AClient } from '@strands-agents/sdk/a2a'`

This keeps A2A as an opt-in import that doesn't bloat the core bundle, and allows tree-shaking when unused.

## Data Flow

```
┌─────────────┐     A2A Protocol      ┌──────────────┐
│  A2AClient  │ ◄──── JSON-RPC ─────► │  A2AServer   │
│  (as Tool)  │     (HTTP/SSE)        │              │
└──────┬──────┘                       └──────┬───────┘
       │                                     │
  ToolList[]                          StrandsA2AExecutor
       │                                     │
┌──────┴──────┐                       ┌──────┴───────┐
│ Local Agent │                       │ Strands Agent│
└─────────────┘                       └──────────────┘
```

## Server

### A2AServer

Wraps a Strands `Agent` and exposes it as an A2A-compliant HTTP endpoint. Mirrors the Python SDK's `A2AServer` class.

```typescript
import { Agent } from '@strands-agents/sdk'
import { A2AServer } from '@strands-agents/sdk/a2a'

const agent = new Agent({
  name: 'Calculator Agent',
  description: 'Performs arithmetic.',
  tools: [calculatorTool],
})

const server = new A2AServer({ agent })
server.serve() // starts on http://127.0.0.1:9000
```

### A2AServer Interface

```typescript
export interface A2AServerConfig {
  /** The Strands Agent to expose via A2A. */
  agent: Agent

  /** Hostname to bind. @default '127.0.0.1' */
  host?: string

  /** Port to bind. @default 9000 */
  port?: number

  /** Override the public URL advertised in the AgentCard. */
  httpUrl?: string

  /** Serve the A2A endpoint at root (/) instead of the default JSON-RPC path. */
  serveAtRoot?: boolean

  /** Version string for the AgentCard. @default '0.0.1' */
  version?: string

  /** Skills to advertise in the AgentCard. */
  skills?: AgentSkill[]

  /** Custom task store. @default InMemoryTaskStore */
  taskStore?: TaskStore
}
```

### Implementation Notes

- Constructs an `AgentCard` from the Agent's `name`, `description`, and the provided config
- Creates a `StrandsA2AExecutor` to bridge Agent invocations to A2A events
- Uses `@a2a-js/sdk/server/express` middleware: `agentCardHandler` (serves `/.well-known/agent-card.json`), `jsonRpcHandler` (handles JSON-RPC requests)
- `serve()` starts an Express server with `node:http` (no uvicorn equivalent needed in Node.js)
- Returns the Express `app` from a `createApp()` method for users who want to mount A2A on an existing server

```typescript
export class A2AServer {
  private _config: A2AServerConfig
  private _agentCard: AgentCard
  private _executor: StrandsA2AExecutor

  constructor(config: A2AServerConfig) { /* ... */ }

  /** Returns an Express app with A2A routes mounted. */
  createApp(): Express { /* ... */ }

  /** Starts the HTTP server. */
  async serve(options?: { host?: string; port?: number }): Promise<void> { /* ... */ }
}
```

## Executor

### StrandsA2AExecutor

Implements `AgentExecutor` from `@a2a-js/sdk/server`. Bridges the Strands Agent's streaming response into A2A protocol events.

```typescript
import { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server'

export class StrandsA2AExecutor implements AgentExecutor {
  private _agent: Agent

  constructor(agent: Agent) {
    this._agent = agent
  }

  async execute(context: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    // 1. Extract user text from context.message.parts
    // 2. Invoke this._agent via streaming
    // 3. Convert Strands ContentBlocks → A2A Parts
    // 4. Publish status updates and artifacts to eventBus
  }
}
```

### Content Type Mapping

| Strands Type | A2A Type | Direction |
|-------------|----------|-----------|
| `TextBlock` | `TextPart { kind: 'text' }` | Both |
| `ImageBlock` (base64) | `DataPart { kind: 'data' }` | Both |
| `ImageBlock` (url) | `FilePart { kind: 'file' }` | Both |
| `DocumentBlock` | `FilePart { kind: 'file' }` | Both |
| `JsonBlock` | `DataPart { kind: 'data', mimeType: 'application/json' }` | Both |
| `ToolUseBlock` | (internal, not exposed via A2A) | — |
| `ToolResultBlock` | (internal, not exposed via A2A) | — |

The executor extracts user-facing content from the Agent's response (text, images, documents) and publishes them as A2A artifacts. Tool use/result blocks are internal to the agent loop and not surfaced to the A2A client.

## Client

### A2AClient

Follows the `McpClient` pattern: lifecycle management, lazy connection, and integration into `ToolList`. When added to an Agent's tools, it exposes the remote A2A agent as a callable tool.

```typescript
import { Agent } from '@strands-agents/sdk'
import { A2AClient } from '@strands-agents/sdk/a2a'

const remoteAgent = new A2AClient({
  url: 'http://localhost:9000',
})

const agent = new Agent({
  tools: [remoteAgent], // A2AClient works in ToolList just like McpClient
})

await agent.invoke('Ask the remote agent to calculate 2+2')
await remoteAgent.disconnect()
```

### A2AClient Interface

```typescript
export interface A2AClientConfig {
  /** Base URL of the remote A2A server. */
  url: string

  /** Override the agent card discovery path. @default '/.well-known/agent-card.json' */
  agentCardPath?: string

  /** Custom name for the tool exposed to the local agent. Defaults to remote agent's name. */
  name?: string
}
```

### Implementation Notes

- On first use (lazy connect), fetches the remote agent's `AgentCard` via `ClientFactory.createFromUrl()`
- Exposes a single `FunctionTool` to the local agent:
  - `name`: derived from the remote agent's card name (sanitized to valid tool name)
  - `description`: from the agent card's description + skills summary
  - `inputSchema`: `{ type: 'object', properties: { message: { type: 'string' } }, required: ['message'] }`
  - `callback`: sends the message via `client.sendMessage()`, extracts text from the response Task/Message
- Supports streaming via `client.sendStreamingMessage()` when the remote agent advertises streaming capability

```typescript
export class A2AClient {
  private _config: A2AClientConfig
  private _client: A2AProtocolClient | undefined
  private _agentCard: AgentCard | undefined
  private _tool: FunctionTool | undefined

  constructor(config: A2AClientConfig) { /* ... */ }

  /** Connects and discovers the remote agent card. */
  async connect(): Promise<void> { /* ... */ }

  /** Disconnects from the remote agent. */
  async disconnect(): Promise<void> { /* ... */ }

  /** Returns the tool(s) for use in ToolList. Called by ToolRegistry during agent init. */
  async listTools(): Promise<FunctionTool[]> { /* ... */ }

  /** Sends a message to the remote agent and returns the response text. */
  async sendMessage(text: string): Promise<string> { /* ... */ }
}
```

### ToolList Integration

The `ToolList` type needs to be extended:

```typescript
// Current
export type ToolList = (Tool | McpClient | ToolList)[]

// Proposed
export type ToolList = (Tool | McpClient | A2AClient | ToolList)[]
```

The `ToolRegistry` already handles `McpClient` by calling `listTools()` and registering the returned tools. The same pattern applies to `A2AClient` — the registry checks for a `listTools()` method and treats the object as a tool provider.

A cleaner approach: introduce a `ToolProvider` interface that both `McpClient` and `A2AClient` implement, then `ToolList` becomes:

```typescript
export interface ToolProvider {
  listTools(): Promise<Tool[]>
}

export type ToolList = (Tool | ToolProvider | ToolList)[]
```

This avoids growing the union type for every new protocol client.

## Agent Card Discovery

The A2A protocol specifies that agent cards are served at `/.well-known/agent-card.json`. The `A2AServer` handles this automatically.

The `AgentCard` is constructed from the Strands Agent's metadata:

```typescript
const agentCard: AgentCard = {
  name: agent.name,
  description: agent.description,
  url: httpUrl,
  version: config.version ?? '0.0.1',
  protocolVersion: '0.3.0',
  capabilities: {
    streaming: true,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: config.skills ?? [],
}
```

## Streaming

### Server-side Streaming

The executor uses the Agent's `stream()` method and publishes events to the `ExecutionEventBus`:

1. Publish `status-update` with state `working` when execution starts
2. Stream text chunks as they arrive (if A2A-compliant streaming is enabled)
3. Publish final `artifact` with the complete response
4. Publish `status-update` with state `completed`

### Client-side Streaming

When the remote agent supports streaming, `A2AClient` can use `sendStreamingMessage()` and yield events as `ToolStreamEvent`s through the tool's async generator pattern.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Remote agent unreachable | Tool returns error result with connection details |
| Agent card fetch fails | `connect()` throws with descriptive error |
| Agent execution fails | Executor publishes `status-update` with state `failed` |
| Invalid message format | JSON-RPC error response per A2A spec |
| Missing `@a2a-js/sdk` dependency | Clear error message at import time |

## Testing Strategy

- Unit tests for `StrandsA2AExecutor`: mock Agent, verify content type conversion and event publishing
- Unit tests for `A2AClient`: mock HTTP responses, verify tool creation and message sending
- Unit tests for `A2AServer`: verify AgentCard construction and app creation
- Integration test: spin up A2AServer with a simple agent, connect A2AClient, send message, verify round-trip

## Usage Examples

### Expose an Agent as A2A Server

```typescript
import { Agent, tool } from '@strands-agents/sdk'
import { A2AServer } from '@strands-agents/sdk/a2a'
import { z } from 'zod'

const calculator = tool({
  name: 'calculate',
  description: 'Evaluate a math expression',
  inputSchema: z.object({ expression: z.string() }),
  callback: (input) => String(eval(input.expression)),
})

const agent = new Agent({
  name: 'Calculator',
  description: 'A calculator agent',
  tools: [calculator],
})

const server = new A2AServer({ agent })
await server.serve({ port: 9000 })
```

### Use a Remote A2A Agent as a Tool

```typescript
import { Agent } from '@strands-agents/sdk'
import { A2AClient } from '@strands-agents/sdk/a2a'

const calculator = new A2AClient({ url: 'http://localhost:9000' })

const agent = new Agent({
  tools: [calculator],
  systemPrompt: 'Use the remote calculator agent for math questions.',
})

const result = await agent.invoke('What is 42 * 17?')
console.log(result.toString())

await calculator.disconnect()
```

### Mount A2A on an Existing Express App

```typescript
import express from 'express'
import { Agent } from '@strands-agents/sdk'
import { A2AServer } from '@strands-agents/sdk/a2a'

const app = express()
const agent = new Agent({ name: 'MyAgent', description: 'My agent' })
const a2a = new A2AServer({ agent })

// Mount A2A routes on existing app
app.use(a2a.createApp())

app.listen(3000)
```

## Open Questions

1. **ToolProvider interface**: Should we introduce a `ToolProvider` interface now (refactoring `McpClient` to implement it), or add `A2AClient` to the `ToolList` union directly? The interface approach is cleaner but has a larger blast radius.

2. **Multiple tools per remote agent**: The Python SDK's `A2AClientToolProvider` exposes multiple tools (discover, send_message, etc.). Should `A2AClient` expose a single tool (simpler, matches "agent as tool" pattern) or multiple tools (more flexible)?

3. **Framework choice**: The Python SDK uses Starlette/FastAPI. The `@a2a-js/sdk` provides Express middleware. Should we also support Hono/Fastify, or start with Express only?

4. **Subpath export**: Using `@strands-agents/sdk/a2a` requires `package.json` exports configuration. This is the right approach for tree-shaking but needs careful setup.

5. **Agent name/description**: The `Agent` class currently has optional `name` and `description` fields. A2A requires these for the AgentCard. Should we make them required when using A2AServer, or generate defaults?
