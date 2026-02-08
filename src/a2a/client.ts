/**
 * A2A client that exposes a remote A2A agent as a tool in the Strands ToolList.
 *
 * Follows the McpClient pattern: lazy connection, lifecycle management, and
 * integration via listTools().
 */
import type { AgentCard, MessageSendParams, Task, Message as A2AMessage } from '@a2a-js/sdk'
import { ClientFactory } from '@a2a-js/sdk/client'
import type { Client } from '@a2a-js/sdk/client'

import { FunctionTool } from '../tools/function-tool.js'
import type { Tool } from '../tools/tool.js'

/**
 * Configuration for the A2A client.
 */
export interface A2AClientConfig {
  /**
   * Base URL of the remote A2A server.
   */
  url: string

  /**
   * Override the agent card discovery path.
   * @defaultValue '/.well-known/agent-card.json'
   */
  agentCardPath?: string

  /**
   * Custom name for the tool. Defaults to the remote agent's name.
   */
  name?: string
}

/**
 * Sanitizes a string into a valid tool name (alphanumeric, hyphens, underscores).
 *
 * @param name - The raw name to sanitize.
 * @returns A valid tool name.
 */
function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64) || 'a2a_agent'
}

/**
 * Extracts text from an A2A SendMessageResult (Task or Message).
 *
 * @param result - The A2A response.
 * @returns The extracted text content.
 */
function extractText(result: Task | A2AMessage): string {
  if (result.kind === 'task') {
    const task = result as Task
    const parts = task.artifacts?.flatMap((a) => a.parts) ?? task.status?.message?.parts ?? []
    return parts
      .filter((p) => p.kind === 'text')
      .map((p) => (p as { text: string }).text)
      .join('\n')
  }
  const msg = result as A2AMessage
  return msg.parts
    .filter((p) => p.kind === 'text')
    .map((p) => (p as { text: string }).text)
    .join('\n')
}

/**
 * Client for communicating with remote A2A agents.
 *
 * Integrates into the Strands ToolList alongside McpClient, exposing the remote
 * agent as a callable FunctionTool.
 *
 * @example
 * ```typescript
 * import { Agent } from '@strands-agents/sdk'
 * import { A2AClient } from '@strands-agents/sdk/a2a'
 *
 * const remote = new A2AClient({ url: 'http://localhost:9000' })
 * const agent = new Agent({ tools: [remote] })
 * await agent.invoke('Ask the remote agent something')
 * await remote.disconnect()
 * ```
 */
export class A2AClient {
  private _config: A2AClientConfig
  private _client: Client | undefined
  private _agentCard: AgentCard | undefined

  /**
   * Creates a new A2AClient.
   *
   * @param config - Client configuration including the remote server URL.
   */
  constructor(config: A2AClientConfig) {
    this._config = config
  }

  /**
   * Connects to the remote agent and fetches its agent card.
   *
   * @param reconnect - Force reconnection if already connected.
   */
  async connect(reconnect: boolean = false): Promise<void> {
    if (this._client && !reconnect) return

    const factory = new ClientFactory()
    this._client = await factory.createFromUrl(this._config.url, this._config.agentCardPath)
    this._agentCard = await this._client.getAgentCard()
  }

  /**
   * Disconnects from the remote agent.
   */
  async disconnect(): Promise<void> {
    this._client = undefined
    this._agentCard = undefined
  }

  /**
   * Returns tools for use in ToolList. Called by the Agent during initialization.
   *
   * @returns An array containing a single FunctionTool representing the remote agent.
   */
  async listTools(): Promise<Tool[]> {
    await this.connect()
    const card = this._agentCard!
    const name = sanitizeToolName(this._config.name ?? card.name)
    const description = card.description || `Remote A2A agent: ${card.name}`

    const tool = new FunctionTool({
      name,
      description,
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string', description: 'Message to send to the remote agent' } },
        required: ['message'],
      },
      callback: async (input: unknown): Promise<string> => {
        const msg = input as Record<string, unknown>
        return this.sendMessage(msg.message as string)
      },
    })

    return [tool]
  }

  /**
   * Sends a message to the remote agent and returns the response text.
   *
   * @param text - The message text to send.
   * @returns The agent's response as a string.
   */
  async sendMessage(text: string): Promise<string> {
    await this.connect()

    const params: MessageSendParams = {
      message: {
        messageId: globalThis.crypto.randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text }],
        kind: 'message',
      },
    }

    const result = await this._client!.sendMessage(params)
    return extractText(result)
  }
}
