/**
 * A2A-compatible server wrapper for Strands Agent.
 *
 * Exposes a Strands Agent as an A2A protocol endpoint using Express and the
 * official A2A JS SDK server middleware.
 */
import type { AgentCard, AgentSkill } from '@a2a-js/sdk'
import type { TaskStore } from '@a2a-js/sdk/server'
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server'
import { agentCardHandler, jsonRpcHandler, UserBuilder } from '@a2a-js/sdk/server/express'

import { Agent } from '../agent/agent.js'
import { StrandsA2AExecutor } from './executor.js'

/**
 * Configuration for the A2A server.
 */
export interface A2AServerConfig {
  /**
   * The Strands Agent to expose via A2A.
   */
  agent: Agent

  /**
   * Name for the agent card.
   */
  name: string

  /**
   * Description for the agent card.
   */
  description?: string

  /**
   * Hostname to bind.
   * @defaultValue '127.0.0.1'
   */
  host?: string

  /**
   * Port to bind.
   * @defaultValue 9000
   */
  port?: number

  /**
   * Override the public URL advertised in the AgentCard.
   */
  httpUrl?: string

  /**
   * Version string for the AgentCard.
   * @defaultValue '0.0.1'
   */
  version?: string

  /**
   * Skills to advertise in the AgentCard.
   */
  skills?: AgentSkill[]

  /**
   * Custom task store implementation.
   * @defaultValue InMemoryTaskStore
   */
  taskStore?: TaskStore
}

/**
 * A2A-compatible server that wraps a Strands Agent.
 *
 * Creates an HTTP server exposing the agent via the A2A protocol, including
 * agent card discovery at /.well-known/agent-card.json and JSON-RPC handling.
 *
 * @example
 * ```typescript
 * import { Agent } from '@strands-agents/sdk'
 * import { A2AServer } from '@strands-agents/sdk/a2a'
 *
 * const agent = new Agent({ tools: [calculatorTool] })
 * const server = new A2AServer({ agent, name: 'Calculator' })
 * await server.serve()
 * ```
 */
export class A2AServer {
  private _host: string
  private _port: number
  private _agentCard: AgentCard
  private _requestHandler: DefaultRequestHandler

  /**
   * Creates a new A2AServer.
   *
   * @param config - Server configuration including the agent to expose.
   */
  constructor(config: A2AServerConfig) {
    this._host = config.host ?? '127.0.0.1'
    this._port = config.port ?? 9000

    const httpUrl = config.httpUrl ?? `http://${this._host}:${this._port}`

    this._agentCard = {
      name: config.name,
      description: config.description ?? '',
      url: httpUrl,
      version: config.version ?? '0.0.1',
      protocolVersion: '0.3.0',
      capabilities: { streaming: false },
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: config.skills ?? [],
    }

    const executor = new StrandsA2AExecutor(config.agent)
    const taskStore = config.taskStore ?? new InMemoryTaskStore()

    this._requestHandler = new DefaultRequestHandler(this._agentCard, taskStore, executor)
  }

  /**
   * The agent card describing this server's capabilities.
   */
  get agentCard(): AgentCard {
    return this._agentCard
  }

  /**
   * Creates Express middleware for A2A routes.
   *
   * @returns Object containing the agent card and JSON-RPC middleware handlers.
   */
  createMiddleware(): {
    agentCardMiddleware: ReturnType<typeof agentCardHandler>
    jsonRpcMiddleware: ReturnType<typeof jsonRpcHandler>
  } {
    return {
      agentCardMiddleware: agentCardHandler({
        agentCardProvider: async () => this._agentCard,
      }),
      jsonRpcMiddleware: jsonRpcHandler({
        requestHandler: this._requestHandler,
        userBuilder: UserBuilder.noAuthentication,
      }),
    }
  }

  /**
   * Starts the A2A HTTP server.
   *
   * @param options - Optional host and port overrides.
   * @returns A promise that resolves when the server is listening.
   */
  async serve(options?: { host?: string; port?: number }): Promise<void> {
    const host = options?.host ?? this._host
    const port = options?.port ?? this._port

    const { default: express } = await import('express')
    const app = express()

    const { agentCardMiddleware, jsonRpcMiddleware } = this.createMiddleware()
    app.use('/.well-known/agent-card.json', agentCardMiddleware)
    app.use('/', jsonRpcMiddleware)

    return new Promise<void>((resolve) => {
      app.listen(port, host, () => {
        console.log(`A2A server listening on http://${host}:${port}`)
        resolve()
      })
    })
  }
}
