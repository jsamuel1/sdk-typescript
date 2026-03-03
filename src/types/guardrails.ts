/**
 * Guardrail content types.
 *
 * This module defines types for guardrail evaluation content.
 * Guardrails provide safety and policy enforcement for model interactions.
 */

/**
 * Qualifier for guard content.
 * Specifies how the content should be evaluated by guardrails:
 * - grounding_source: Content used as grounding/reference material
 * - query: User query content to be evaluated
 * - guard_content: Content to be checked by guardrails
 */
export type GuardQualifier = 'grounding_source' | 'query' | 'guard_content'

/**
 * Text content to be evaluated by guardrails.
 */
export interface GuardContentText {
  /**
   * Array of qualifiers indicating how this content should be evaluated.
   */
  qualifiers: GuardQualifier[]

  /**
   * The text content to be evaluated.
   */
  text: string
}

/**
 * Data for a guard content block.
 */
export interface GuardContentBlockData {
  /**
   * Text content with qualifiers for guardrail evaluation.
   */
  text: GuardContentText
}

/**
 * Guard content block for guardrail evaluation.
 * Used to send content through guardrail policies for safety and policy checks.
 */
export class GuardContentBlock implements GuardContentBlockData {
  /**
   * Discriminator for guard content.
   */
  readonly type = 'guardContentBlock' as const

  /**
   * Text content with qualifiers for guardrail evaluation.
   */
  readonly text: GuardContentText

  constructor(data: GuardContentBlockData) {
    this.text = data.text
  }
}
