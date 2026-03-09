import { describe, expect, it } from 'vitest'
import { Agent } from '@strands-agents/sdk'
import { Swarm, SwarmNode } from '$/sdk/multiagent/index.js'
import { collectGenerator } from '$/sdk/__fixtures__/model-test-helpers.js'
import { bedrock } from '../__fixtures__/model-providers.js'

describe.skipIf(bedrock.skip)('Swarm', () => {
  const createModel = (maxTokens = 1024) => bedrock.createModel({ maxTokens })

  it('completes single-agent execution with lifecycle events', async () => {
    const agent = new Agent({
      model: createModel(),
      printer: false,
      agentId: 'assistant',
      description: 'Answers questions briefly.',
      systemPrompt: 'Answer in one word only.',
    })

    const swarm = new Swarm([new SwarmNode('assistant', agent)], {
      entryPoint: 'assistant',
    })

    const { items, result } = await collectGenerator(swarm.stream('What is the capital of France?'))

    expect(result.state.completed).toBe(true)
    expect(result.state.nodeHistory).toContain('assistant')
    expect(result.metrics.durationMs).toBeGreaterThan(0)

    const text = result.content.find((b) => b.type === 'textBlock')
    expect(text?.text).toMatch(/Paris/i)

    // Verify lifecycle events
    const eventTypes = items.map((e) => e.type)
    expect(eventTypes).toContain('nodeStreamUpdateEvent')
    expect(eventTypes).toContain('nodeResultEvent')
    expect(eventTypes).toContain('multiAgentResultEvent')
  })

  it('hands off between agents with handoff event', async () => {
    const researcher = new Agent({
      model: createModel(),
      printer: false,
      agentId: 'researcher',
      description: 'Researches a topic then hands off to the writer.',
      systemPrompt:
        'You are a researcher. Look up the answer, then always hand off to the writer agent. Never produce a final response yourself.',
    })

    const writer = new Agent({
      model: createModel(),
      printer: false,
      agentId: 'writer',
      description: 'Writes a final one-sentence answer.',
      systemPrompt: 'Write the final answer in one sentence. Do not hand off to another agent.',
    })

    const swarm = new Swarm([new SwarmNode('researcher', researcher), new SwarmNode('writer', writer)], {
      entryPoint: 'researcher',
      maxHandoffs: 4,
    })

    const { items, result } = await collectGenerator(swarm.stream('What is the largest ocean?'))

    expect(result.state.completed).toBe(true)
    expect(result.state.nodeHistory.length).toBeGreaterThanOrEqual(2)
    expect(result.state.nodeHistory[0]).toBe('researcher')
    expect(result.metrics.durationMs).toBeGreaterThan(0)

    const text = result.content.find((b) => b.type === 'textBlock')
    expect(text?.text).toMatch(/Pacific/i)

    // Verify handoff event
    const handoff = items.find((e) => e.type === 'multiAgentHandoffEvent')
    expect(handoff).toEqual(
      expect.objectContaining({
        source: 'researcher',
        targets: ['writer'],
      })
    )
  })
})
