import { describe, it, expect, vi, beforeEach } from 'vitest'
import { A2AClient } from '../client.js'

const mockSendMessage = vi.fn()
const mockGetAgentCard = vi.fn()
const mockCreateFromUrl = vi.fn()

vi.mock('@a2a-js/sdk/client', () => ({
  ClientFactory: vi.fn(function () {
    return { createFromUrl: mockCreateFromUrl }
  }),
}))

const mockAgentCard = {
  name: 'Test Agent',
  description: 'A test agent',
  url: 'http://localhost:9000',
  version: '1.0.0',
  protocolVersion: '0.3.0',
}

describe('A2AClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgentCard.mockResolvedValue(mockAgentCard)
    mockCreateFromUrl.mockResolvedValue({
      sendMessage: mockSendMessage,
      getAgentCard: mockGetAgentCard,
    })
  })

  describe('connect', () => {
    it('creates client from URL and fetches agent card', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000' })

      await client.connect()

      expect(mockCreateFromUrl).toHaveBeenCalledWith('http://localhost:9000', undefined)
      expect(mockGetAgentCard).toHaveBeenCalled()
    })

    it('skips reconnection when already connected', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000' })

      await client.connect()
      await client.connect()

      expect(mockCreateFromUrl).toHaveBeenCalledTimes(1)
    })

    it('reconnects when forced', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000' })

      await client.connect()
      await client.connect(true)

      expect(mockCreateFromUrl).toHaveBeenCalledTimes(2)
    })

    it('passes custom agent card path', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000', agentCardPath: '/custom/card.json' })

      await client.connect()

      expect(mockCreateFromUrl).toHaveBeenCalledWith('http://localhost:9000', '/custom/card.json')
    })
  })

  describe('disconnect', () => {
    it('clears client state', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000' })
      await client.connect()

      await client.disconnect()

      // After disconnect, connect should create a new client
      await client.connect()
      expect(mockCreateFromUrl).toHaveBeenCalledTimes(2)
    })
  })

  describe('listTools', () => {
    it('returns a tool with name from agent card', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000' })

      const tools = await client.listTools()

      expect(tools).toHaveLength(1)
      expect(tools[0]!.name).toBe('Test_Agent')
      expect(tools[0]!.description).toBe('A test agent')
    })

    it('uses custom name when provided', async () => {
      const client = new A2AClient({ url: 'http://localhost:9000', name: 'my-agent' })

      const tools = await client.listTools()

      expect(tools[0]!.name).toBe('my-agent')
    })

    it('sanitizes special characters in tool name', async () => {
      mockGetAgentCard.mockResolvedValue({ ...mockAgentCard, name: 'Agent With Spaces & Symbols!' })
      const client = new A2AClient({ url: 'http://localhost:9000' })

      const tools = await client.listTools()

      expect(tools[0]!.name).toBe('Agent_With_Spaces___Symbols_')
    })
  })

  describe('sendMessage', () => {
    it('sends message and extracts text from task response', async () => {
      mockSendMessage.mockResolvedValue({
        kind: 'task',
        artifacts: [{ parts: [{ kind: 'text', text: 'Agent response' }] }],
      })
      const client = new A2AClient({ url: 'http://localhost:9000' })

      const result = await client.sendMessage('Hello')

      expect(result).toBe('Agent response')
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          }),
        })
      )
    })

    it('extracts text from message response', async () => {
      mockSendMessage.mockResolvedValue({
        kind: 'message',
        parts: [{ kind: 'text', text: 'Direct message' }],
      })
      const client = new A2AClient({ url: 'http://localhost:9000' })

      const result = await client.sendMessage('Hello')

      expect(result).toBe('Direct message')
    })

    it('extracts text from task status message when no artifacts', async () => {
      mockSendMessage.mockResolvedValue({
        kind: 'task',
        status: { message: { parts: [{ kind: 'text', text: 'Status text' }] } },
      })
      const client = new A2AClient({ url: 'http://localhost:9000' })

      const result = await client.sendMessage('Hello')

      expect(result).toBe('Status text')
    })
  })
})
