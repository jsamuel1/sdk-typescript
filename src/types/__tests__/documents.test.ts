import { describe, it, expect } from 'vitest'
import { DocumentBlock } from '../documents.js'
import { TextBlock } from '../messages.js'
import { ImageBlock } from '../media.js'

describe('DocumentBlock', () => {
  describe('when created with bytes source', () => {
    it('creates document block with correct properties', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const block = new DocumentBlock({
        name: 'document.pdf',
        format: 'pdf',
        source: { bytes },
      })

      expect(block.type).toBe('documentBlock')
      expect(block.name).toBe('document.pdf')
      expect(block.format).toBe('pdf')
      expect(block.source).toEqual({ bytes })
      expect(block.citations).toBeUndefined()
      expect(block.context).toBeUndefined()
    })
  })

  describe('when created with text source', () => {
    it('creates document block with correct properties', () => {
      const block = new DocumentBlock({
        name: 'notes.txt',
        format: 'txt',
        source: { text: 'Some text content' },
      })

      expect(block.type).toBe('documentBlock')
      expect(block.source).toEqual({ text: 'Some text content' })
    })
  })

  describe('when created with content source', () => {
    it('creates document block with nested content blocks', () => {
      const content = [new TextBlock('Hello'), new ImageBlock({ format: 'png', source: { bytes: new Uint8Array([]) } })]

      const block = new DocumentBlock({
        name: 'report.html',
        format: 'html',
        source: { content },
      })

      expect(block.type).toBe('documentBlock')
      expect(block.source).toEqual({ content })
    })
  })

  describe('when created with URL source', () => {
    it('creates document block with correct properties', () => {
      const block = new DocumentBlock({
        name: 'data.csv',
        format: 'csv',
        source: { url: 's3://bucket/data.csv' },
      })

      expect(block.source).toEqual({ url: 's3://bucket/data.csv' })
    })
  })

  describe('when created with fileId source', () => {
    it('creates document block with fileId', () => {
      const block = new DocumentBlock({
        name: 'upload.docx',
        format: 'docx',
        source: { fileId: 'file-123' },
      })

      expect(block.source).toEqual({ fileId: 'file-123' })
    })

    it('creates document block with fileId and filename', () => {
      const block = new DocumentBlock({
        name: 'upload.docx',
        format: 'docx',
        source: { fileId: 'file-123', filename: 'myfile.docx' },
      })

      expect(block.source).toEqual({ fileId: 'file-123', filename: 'myfile.docx' })
    })
  })

  describe('when created with fileData source', () => {
    it('creates document block with fileData', () => {
      const block = new DocumentBlock({
        name: 'data.xlsx',
        format: 'xlsx',
        source: { fileData: 'base64data' },
      })

      expect(block.source).toEqual({ fileData: 'base64data' })
    })

    it('creates document block with fileData and filename', () => {
      const block = new DocumentBlock({
        name: 'data.xlsx',
        format: 'xlsx',
        source: { fileData: 'base64data', filename: 'spreadsheet.xlsx' },
      })

      expect(block.source).toEqual({ fileData: 'base64data', filename: 'spreadsheet.xlsx' })
    })
  })

  describe('when created with citations config', () => {
    it('includes citations configuration', () => {
      const block = new DocumentBlock({
        name: 'research.pdf',
        format: 'pdf',
        source: { bytes: new Uint8Array([]) },
        citations: { enabled: true },
      })

      expect(block.citations).toEqual({ enabled: true })
    })
  })

  describe('when created with context', () => {
    it('includes context string', () => {
      const block = new DocumentBlock({
        name: 'manual.pdf',
        format: 'pdf',
        source: { bytes: new Uint8Array([]) },
        context: 'User manual for product X',
      })

      expect(block.context).toBe('User manual for product X')
    })
  })

  describe('when created with all document formats', () => {
    const formats: Array<'pdf' | 'csv' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'html' | 'txt' | 'md'> = [
      'pdf',
      'csv',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'html',
      'txt',
      'md',
    ]

    formats.forEach((format) => {
      it(`accepts ${format} format`, () => {
        const block = new DocumentBlock({
          name: `document.${format}`,
          format,
          source: { bytes: new Uint8Array([]) },
        })
        expect(block.format).toBe(format)
      })
    })
  })
})
