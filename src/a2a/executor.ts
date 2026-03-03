/**
 * Strands Agent executor for the A2A protocol.
 *
 * Adapts a Strands Agent to the A2A AgentExecutor interface, converting between
 * Strands content types and A2A protocol events.
 */
import type { AgentExecutor, ExecutionEventBus, RequestContext } from '@a2a-js/sdk/server'
import type { Message as A2AMessage, Part, TextPart } from '@a2a-js/sdk'

import { Agent } from '../agent/agent.js'
import type { ContentBlock } from '../types/messages.js'

/**
 * Extracts text from A2A message parts.
 *
 * @param message - The A2A message to extract text from.
 * @returns The concatenated text content.
 */
function extractTextFromMessage(message: A2AMessage): string {
  return message.parts
    .filter((p: Part): p is TextPart => p.kind === 'text')
    .map((p: TextPart) => p.text)
    .join('\n')
}

/**
 * Converts Strands content blocks to A2A text parts.
 *
 * @param blocks - The Strands content blocks to convert.
 * @returns An array of A2A parts containing text content.
 */
function contentBlocksToParts(blocks: ContentBlock[]): Part[] {
  const parts: Part[] = []
  for (const block of blocks) {
    if (block.type === 'textBlock') {
      parts.push({ kind: 'text', text: block.text })
    }
  }
  return parts
}

/**
 * Executor that adapts a Strands Agent to the A2A protocol.
 *
 * Implements the AgentExecutor interface from the A2A JS SDK, bridging the Strands Agent's
 * response into A2A protocol events published on the ExecutionEventBus.
 */
export class StrandsA2AExecutor implements AgentExecutor {
  private _agent: Agent

  /**
   * Creates a new StrandsA2AExecutor.
   *
   * @param agent - The Strands Agent to execute requests with.
   */
  constructor(agent: Agent) {
    this._agent = agent
  }

  /**
   * Executes a request using the Strands Agent and publishes A2A events.
   *
   * @param requestContext - The A2A request context containing the user's message.
   * @param eventBus - The event bus to publish response events to.
   */
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const userText = extractTextFromMessage(requestContext.userMessage)

    const publishStatus = (state: 'working' | 'completed' | 'failed', parts?: Part[]): void => {
      const message = parts
        ? {
            kind: 'message' as const,
            messageId: globalThis.crypto.randomUUID(),
            role: 'agent' as const,
            parts,
          }
        : undefined

      eventBus.publish({
        kind: 'status-update',
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        final: state === 'completed' || state === 'failed',
        status: { state, ...(message ? { message } : {}), timestamp: new Date().toISOString() },
      })
    }

    try {
      publishStatus('working')

      const result = await this._agent.invoke(userText)
      const parts = contentBlocksToParts(result.lastMessage.content)
      const responseParts = parts.length > 0 ? parts : [{ kind: 'text' as const, text: result.toString() }]

      eventBus.publish({
        kind: 'artifact-update',
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        lastChunk: true,
        append: false,
        artifact: { artifactId: globalThis.crypto.randomUUID(), parts: responseParts },
      })

      publishStatus('completed', responseParts)
    } catch (error) {
      publishStatus('failed', [{ kind: 'text', text: error instanceof Error ? error.message : String(error) }])
    }

    eventBus.finished()
  }

  /**
   * Cancels a running task.
   *
   * @param taskId - The ID of the task to cancel.
   * @param eventBus - The event bus to publish the cancellation event to.
   */
  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId: '',
      final: true,
      status: { state: 'canceled', timestamp: new Date().toISOString() },
    })
    eventBus.finished()
  }
}
