import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrandsA2AExecutor } from '../executor.js'
import type { ExecutionEventBus, RequestContext } from '@a2a-js/sdk/server'
import { TextBlock } from '../../types/messages.js'
import { Message } from '../../types/messages.js'
import { AgentResult } from '../../types/agent.js'

function createMockEventBus(): ExecutionEventBus {
  return {
    publish: vi.fn(),
    finished: vi.fn(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
  }
}

function createMockRequestContext(text: string): RequestContext {
  return {
    userMessage: {
      kind: 'message',
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text }],
    },
    taskId: 'task-1',
    contextId: 'ctx-1',
  } as RequestContext
}

function createMockAgent(responseText: string): { invoke: ReturnType<typeof vi.fn> } {
  const lastMessage = new Message({
    role: 'assistant',
    content: [new TextBlock(responseText)],
  })
  const result = new AgentResult({ stopReason: 'endTurn', lastMessage })
  return { invoke: vi.fn().mockResolvedValue(result) }
}

describe('StrandsA2AExecutor', () => {
  let eventBus: ExecutionEventBus

  beforeEach(() => {
    eventBus = createMockEventBus()
  })

  describe('execute', () => {
    it('publishes working status, artifact, and completed status', async () => {
      const agent = createMockAgent('Hello from agent')
      const executor = new StrandsA2AExecutor(agent as never)
      const context = createMockRequestContext('Hi')

      await executor.execute(context, eventBus)

      expect(agent.invoke).toHaveBeenCalledWith('Hi')
      expect(eventBus.publish).toHaveBeenCalledTimes(3)

      const calls = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls

      // First: working status
      expect(calls[0]![0]).toMatchObject({
        kind: 'status-update',
        taskId: 'task-1',
        status: { state: 'working' },
        final: false,
      })

      // Second: artifact
      expect(calls[1]![0].kind).toBe('artifact-update')
      expect(calls[1]![0].taskId).toBe('task-1')
      expect(calls[1]![0].lastChunk).toBe(true)

      // Third: completed status
      expect(calls[2]![0]).toMatchObject({
        kind: 'status-update',
        taskId: 'task-1',
        status: { state: 'completed' },
        final: true,
      })

      expect(eventBus.finished).toHaveBeenCalled()
    })

    it('publishes failed status when agent throws', async () => {
      const agent = { invoke: vi.fn().mockRejectedValue(new Error('Agent failed')) }
      const executor = new StrandsA2AExecutor(agent as never)
      const context = createMockRequestContext('Hi')

      await executor.execute(context, eventBus)

      const calls = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls
      expect(calls).toHaveLength(2)

      expect(calls[1]![0]).toMatchObject({
        kind: 'status-update',
        status: { state: 'failed' },
        final: true,
      })

      expect(eventBus.finished).toHaveBeenCalled()
    })

    it('extracts text from multiple message parts', async () => {
      const agent = createMockAgent('response')
      const executor = new StrandsA2AExecutor(agent as never)
      const context = {
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'Hello' },
            { kind: 'data', data: {} },
            { kind: 'text', text: 'World' },
          ],
        },
        taskId: 'task-1',
        contextId: 'ctx-1',
      } as RequestContext

      await executor.execute(context, eventBus)

      expect(agent.invoke).toHaveBeenCalledWith('Hello\nWorld')
    })
  })

  describe('cancelTask', () => {
    it('publishes canceled status and finishes', async () => {
      const executor = new StrandsA2AExecutor({} as never)

      await executor.cancelTask('task-42', eventBus)

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'status-update',
          taskId: 'task-42',
          final: true,
          status: expect.objectContaining({ state: 'canceled' }),
        })
      )
      expect(eventBus.finished).toHaveBeenCalled()
    })
  })
})
