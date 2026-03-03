import { describe, it, expect } from 'vitest'
import { CitationsContentBlock } from '../citations.js'

describe('CitationsContentBlock', () => {
  describe('when created with citations', () => {
    it('creates citations content block with correct properties', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: { documentIndex: 0, start: 10, end: 50 },
            sourceContent: [{ text: 'Source excerpt' }],
            title: 'Document 1',
          },
        ],
        content: [{ text: 'Generated content' }],
      })

      expect(block.type).toBe('citationsContentBlock')
      expect(block.citations).toHaveLength(1)
      expect(block.citations[0]).toEqual({
        location: { documentIndex: 0, start: 10, end: 50 },
        sourceContent: [{ text: 'Source excerpt' }],
        title: 'Document 1',
      })
      expect(block.content).toEqual([{ text: 'Generated content' }])
    })
  })

  describe('when created with multiple citations', () => {
    it('handles multiple citations correctly', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: { documentIndex: 0, start: 10, end: 50 },
            sourceContent: [{ text: 'First source' }],
            title: 'Doc 1',
          },
          {
            location: { documentIndex: 1, start: 100, end: 200 },
            sourceContent: [{ text: 'Second source' }],
            title: 'Doc 2',
          },
        ],
        content: [{ text: 'Combined content' }],
      })

      expect(block.citations).toHaveLength(2)
      expect(block.citations[0]?.title).toBe('Doc 1')
      expect(block.citations[1]?.title).toBe('Doc 2')
    })
  })

  describe('when created with optional location fields', () => {
    it('handles citations with partial location data', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: { documentIndex: 0 },
            sourceContent: [{ text: 'Source text' }],
            title: 'Document',
          },
        ],
        content: [{ text: 'Generated text' }],
      })

      expect(block.citations.length).toBeGreaterThan(0)
      expect(block.citations[0]?.location).toEqual({ documentIndex: 0 })
    })

    it('handles citations with empty location', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: {},
            sourceContent: [{ text: 'Source text' }],
            title: 'Document',
          },
        ],
        content: [{ text: 'Generated text' }],
      })

      expect(block.citations.length).toBeGreaterThan(0)
      expect(block.citations[0]?.location).toEqual({})
    })
  })

  describe('when created with multiple source content items', () => {
    it('handles multiple source content items per citation', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: { start: 0, end: 100 },
            sourceContent: [{ text: 'First excerpt' }, { text: 'Second excerpt' }, { text: 'Third excerpt' }],
            title: 'Document',
          },
        ],
        content: [{ text: 'Generated text' }],
      })

      const citation = block.citations[0]
      expect(citation).toBeDefined()
      expect(citation!.sourceContent).toHaveLength(3)
      expect(citation!.sourceContent[0]?.text).toBe('First excerpt')
      expect(citation!.sourceContent[1]?.text).toBe('Second excerpt')
      expect(citation!.sourceContent[2]?.text).toBe('Third excerpt')
    })
  })

  describe('when created with multiple generated content items', () => {
    it('handles multiple generated content items', () => {
      const block = new CitationsContentBlock({
        citations: [
          {
            location: {},
            sourceContent: [{ text: 'Source' }],
            title: 'Doc',
          },
        ],
        content: [{ text: 'First part' }, { text: 'Second part' }],
      })

      expect(block.content).toHaveLength(2)
      expect(block.content[0]?.text).toBe('First part')
      expect(block.content[1]?.text).toBe('Second part')
    })
  })
})
