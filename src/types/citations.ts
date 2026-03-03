/**
 * Citation content types.
 *
 * This module defines types for citations that reference source documents.
 * Citations allow the model to provide specific references to document content
 * that supports its generated responses.
 */

/**
 * Location within a source document.
 * Can specify character positions, chunks, or pages depending on the document type.
 */
export interface CitationLocation {
  /**
   * Optional index of the document being referenced.
   */
  documentIndex?: number

  /**
   * Optional start position within the document.
   */
  start?: number

  /**
   * Optional end position within the document.
   */
  end?: number
}

/**
 * Source content from a citation.
 * Contains the actual text that was referenced from the source document.
 */
export interface CitationSourceContent {
  /**
   * Text content from the source document.
   */
  text: string
}

/**
 * Generated content from a citation.
 * Contains the text that the model generated based on the cited source.
 */
export interface CitationGeneratedContent {
  /**
   * Generated text content.
   */
  text: string
}

/**
 * A single citation referencing a source document.
 * Links generated content to specific locations in source documents.
 */
export interface Citation {
  /**
   * Location information for where this citation points in the source document.
   */
  location: CitationLocation

  /**
   * Array of source content that was referenced.
   */
  sourceContent: CitationSourceContent[]

  /**
   * Title or identifier for the cited source.
   */
  title: string
}

/**
 * Data for a citations content block.
 */
export interface CitationsContentBlockData {
  /**
   * Array of citations linking to source documents.
   */
  citations: Citation[]

  /**
   * Array of generated content associated with the citations.
   */
  content: CitationGeneratedContent[]
}

/**
 * Content block containing citations and generated content.
 * Used to return structured citation information that links generated text
 * to specific source documents.
 */
export class CitationsContentBlock implements CitationsContentBlockData {
  /**
   * Discriminator for citations content.
   */
  readonly type = 'citationsContentBlock' as const

  /**
   * Array of citations linking to source documents.
   */
  readonly citations: Citation[]

  /**
   * Array of generated content associated with the citations.
   */
  readonly content: CitationGeneratedContent[]

  constructor(data: CitationsContentBlockData) {
    this.citations = data.citations
    this.content = data.content
  }
}
