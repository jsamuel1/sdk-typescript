import { describe, it, expect } from 'vitest'
import { GuardContentBlock } from '../guardrails.js'

describe('GuardContentBlock', () => {
  describe('when created with grounding_source qualifier', () => {
    it('creates guard content block with correct properties', () => {
      const block = new GuardContentBlock({
        text: {
          qualifiers: ['grounding_source'],
          text: 'Reference material for grounding',
        },
      })

      expect(block.type).toBe('guardContentBlock')
      expect(block.text.qualifiers).toEqual(['grounding_source'])
      expect(block.text.text).toBe('Reference material for grounding')
    })
  })

  describe('when created with query qualifier', () => {
    it('creates guard content block with correct properties', () => {
      const block = new GuardContentBlock({
        text: {
          qualifiers: ['query'],
          text: 'User query to evaluate',
        },
      })

      expect(block.text.qualifiers).toEqual(['query'])
      expect(block.text.text).toBe('User query to evaluate')
    })
  })

  describe('when created with guard_content qualifier', () => {
    it('creates guard content block with correct properties', () => {
      const block = new GuardContentBlock({
        text: {
          qualifiers: ['guard_content'],
          text: 'Content to check',
        },
      })

      expect(block.text.qualifiers).toEqual(['guard_content'])
      expect(block.text.text).toBe('Content to check')
    })
  })

  describe('when created with multiple qualifiers', () => {
    it('handles multiple qualifiers correctly', () => {
      const block = new GuardContentBlock({
        text: {
          qualifiers: ['query', 'guard_content'],
          text: 'Content with multiple qualifiers',
        },
      })

      expect(block.text.qualifiers).toEqual(['query', 'guard_content'])
      expect(block.text.text).toBe('Content with multiple qualifiers')
    })
  })

  describe('when created with all qualifier types', () => {
    it('accepts all qualifier types', () => {
      const block = new GuardContentBlock({
        text: {
          qualifiers: ['grounding_source', 'query', 'guard_content'],
          text: 'Content with all qualifiers',
        },
      })

      expect(block.text.qualifiers).toHaveLength(3)
      expect(block.text.qualifiers).toContain('grounding_source')
      expect(block.text.qualifiers).toContain('query')
      expect(block.text.qualifiers).toContain('guard_content')
    })
  })
})
