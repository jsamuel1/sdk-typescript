import { describe, it, expect, vi, beforeEach } from 'vitest'
import { A2AServer } from '../server.js'

const { mockAgentCardHandler, mockJsonRpcHandler } = vi.hoisted(() => ({
  mockAgentCardHandler: vi.fn(() => 'agentCardMiddleware'),
  mockJsonRpcHandler: vi.fn(() => 'jsonRpcMiddleware'),
}))

vi.mock('@a2a-js/sdk/server', () => ({
  DefaultRequestHandler: vi.fn(function () {
    return { getAgentCard: vi.fn() }
  }),
  InMemoryTaskStore: vi.fn(function () {
    return {}
  }),
}))

vi.mock('@a2a-js/sdk/server/express', () => ({
  agentCardHandler: mockAgentCardHandler,
  jsonRpcHandler: mockJsonRpcHandler,
  UserBuilder: { noAuthentication: vi.fn() },
}))

function createMockAgent(): { invoke: ReturnType<typeof vi.fn> } {
  return { invoke: vi.fn() }
}

describe('A2AServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates agent card with provided config', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.2.3',
      })

      expect(server.agentCard).toMatchObject({
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.2.3',
        protocolVersion: '0.3.0',
        url: 'http://127.0.0.1:9000',
      })
    })

    it('uses default values when not provided', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Agent',
      })

      expect(server.agentCard).toMatchObject({
        name: 'Agent',
        description: '',
        version: '0.0.1',
        url: 'http://127.0.0.1:9000',
      })
    })

    it('uses custom host and port in URL', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Agent',
        host: '0.0.0.0',
        port: 8080,
      })

      expect(server.agentCard.url).toBe('http://0.0.0.0:8080')
    })

    it('uses explicit httpUrl when provided', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Agent',
        httpUrl: 'https://my-agent.example.com',
      })

      expect(server.agentCard.url).toBe('https://my-agent.example.com')
    })

    it('includes skills in agent card', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Agent',
        skills: [{ id: 'calc', name: 'Calculator', description: 'Math operations', tags: ['math'] }],
      })

      expect(server.agentCard.skills).toStrictEqual([
        { id: 'calc', name: 'Calculator', description: 'Math operations', tags: ['math'] },
      ])
    })
  })

  describe('createMiddleware', () => {
    it('returns agent card and json-rpc middleware', () => {
      const server = new A2AServer({
        agent: createMockAgent() as never,
        name: 'Agent',
      })

      const middleware = server.createMiddleware()

      expect(mockAgentCardHandler).toHaveBeenCalled()
      expect(mockJsonRpcHandler).toHaveBeenCalled()
      expect(middleware.agentCardMiddleware).toBe('agentCardMiddleware')
      expect(middleware.jsonRpcMiddleware).toBe('jsonRpcMiddleware')
    })
  })
})
