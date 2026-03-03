/**
 * Document content types.
 *
 * This module defines types for document content blocks that can contain
 * structured content including text, images, and videos. Documents support
 * multiple source formats and can include citations.
 */

import type { ImageBlock, VideoBlock } from './media.js'
import type { TextBlock } from './messages.js'

/**
 * Document format type.
 * Supported formats for document content.
 */
export type DocumentFormat = 'pdf' | 'csv' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'html' | 'txt' | 'md'

/**
 * Content blocks that can be nested inside a document.
 * Documents can contain text, images, and videos.
 */
export type DocumentContentBlock = TextBlock | ImageBlock | VideoBlock

/**
 * Source for a document.
 * Supports multiple formats including structured content:
 * - bytes: Raw binary data (Bedrock)
 * - text: Plain text content (Bedrock)
 * - content: Structured content with nested blocks (Bedrock)
 * - url: URL reference - s3:// (Bedrock)
 * - fileId: Uploaded file reference (OpenAI, future)
 * - fileData: Base64-encoded data (OpenAI, future)
 */
export type DocumentSource =
  | { bytes: Uint8Array }
  | { text: string }
  | { content: DocumentContentBlock[] }
  | { url: string }
  | { fileId: string; filename?: string }
  | { fileData: string; filename?: string }

/**
 * Configuration for enabling citations on documents.
 */
export interface CitationsConfig {
  /**
   * Whether citations should be enabled for this document.
   */
  enabled: boolean
}

/**
 * Data for a document block.
 */
export interface DocumentBlockData {
  /**
   * Document name or filename.
   */
  name: string

  /**
   * Document format type.
   */
  format: DocumentFormat

  /**
   * Source for the document data.
   */
  source: DocumentSource

  /**
   * Optional citations configuration.
   * When enabled, the model can reference specific parts of the document.
   */
  citations?: CitationsConfig

  /**
   * Optional context string providing additional information about the document.
   */
  context?: string
}

/**
 * Document content block within a message.
 * Supports documents from various sources and can contain nested content blocks.
 */
export class DocumentBlock implements DocumentBlockData {
  /**
   * Discriminator for document content.
   */
  readonly type = 'documentBlock' as const

  /**
   * Document name or filename.
   */
  readonly name: string

  /**
   * Document format type.
   */
  readonly format: DocumentFormat

  /**
   * Source for the document data.
   */
  readonly source: DocumentSource

  /**
   * Optional citations configuration.
   * When enabled, the model can reference specific parts of the document.
   */
  readonly citations?: CitationsConfig

  /**
   * Optional context string providing additional information about the document.
   */
  readonly context?: string

  constructor(data: DocumentBlockData) {
    this.name = data.name
    this.format = data.format
    this.source = data.source
    if (data.citations !== undefined) {
      this.citations = data.citations
    }
    if (data.context !== undefined) {
      this.context = data.context
    }
  }
}
