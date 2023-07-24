// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type MermaidType from 'mermaid';

// mermaid themes
export const MERMAID_DEFAULT_THEME = 'default';

// DOM
export const MERMAID_CLASS = 'jp-RenderedMermaid';
export const WARNING_CLASS = 'jp-mod-warning';
export const DETAILS_CLASS = 'jp-RenderedMermaid-Details';
export const SUMMARY_CLASS = 'jp-RenderedMermaid-Summary';

/**
 * A namespace for public mermaid interfaces.
 */
export interface IMermaidManager {
  /**
   * Get the (potentially uninitialized) mermaid module.
   */
  getMermaid(): Promise<typeof MermaidType>;

  /**
   * Get the version of the currently-loaded mermaid module
   */
  getMermaidVersion(): string | null;

  /**
   * Render mermaid source to an SVG string with extraced metadata.
   */
  renderSvg(text: string): Promise<IMermaidManager.IRenderInfo>;

  /**
   * Render and cache mermaid source as a figure of an image, or a unsuccessful parser message.
   */
  renderFigure(text: string): Promise<HTMLElement>;

  /**
   * Get the pre-cached element for a mermaid string, if available.
   */
  getCachedFigure(text: string): HTMLElement | null;
}

/**
 * A namespace for the mermaid manager.
 */
export namespace IMermaidManager {
  /**
   * The results of a successful rendering of a mermaid text-based diagram.
   */
  export interface IRenderInfo {
    /** The raw rendered SVG. */
    svg: string;
    /** The extracted accessible description, if found. */
    accessibleDescription?: string | null;
    /** The extracted accessible title, if found. */
    accessibleTitle?: string | null;
    /** The extracted width of the digaram, if found. */
    width?: number | null;
  }
}

/**
 * An internal interface for fenced code block renderers.
 */
export interface IFencedBlockRenderer {
  languages: string[];
  rank: number;
  walk: (text: string) => Promise<void>;
  render: (text: string) => string | null;
}

export interface IMermaidMarkdown
  extends Omit<IFencedBlockRenderer, 'languages' | 'rank'> {}

export interface IJupyterMarkdownOptions {
  highlightCode?: (
    text: string,
    language: string,
    elt: HTMLElement
  ) => Promise<void>;
  mermaidRenderer?: IMermaidMarkdown;
}
