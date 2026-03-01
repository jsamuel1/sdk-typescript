/**
 * Multi-agent orchestration module.
 */

export { MultiAgentState, NodeState, Status, NodeResult, MultiAgentResult } from './state.js'
export type { NodeResultUpdate, ResultStatus } from './state.js'

export { Node, AgentNode } from './nodes.js'
export type { NodeConfig, AgentNodeOptions, NodeDefinition, NodeType } from './nodes.js'

export { NodeStreamUpdateEvent, NodeResultEvent, MultiAgentHandoffEvent, MultiAgentResultEvent } from './events.js'
export type { MultiAgentStreamEvent } from './events.js'

export { Edge } from './edge.js'
export type { EdgeHandler, EdgeDefinition } from './edge.js'

export { Swarm, SwarmNode, SharedContext, SwarmError } from './swarm.js'
export type { SwarmOptions, SwarmInvokeOptions, SwarmResult, SwarmState, SwarmEvent } from './swarm.js'
