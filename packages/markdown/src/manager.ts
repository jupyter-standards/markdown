// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type MermaidType from 'mermaid';
import type { MermaidConfig } from 'mermaid';

import { LruCache, PromiseDelegate } from './utils.js';

import {
  DETAILS_CLASS,
  IMermaidManager,
  MERMAID_CLASS,
  MERMAID_DEFAULT_THEME,
  SUMMARY_CLASS,
  WARNING_CLASS
} from './tokens.js';

/**
 * A mermaid diagram manager with cache.
 */
export class MermaidManager implements IMermaidManager {
  protected _diagrams: LruCache<string, HTMLElement>;

  constructor(options: MermaidManager.IOptions = {}) {
    this._diagrams = new LruCache({ maxSize: options.maxCacheSize || null });
  }

  /**
   * Handle (re)-initializing mermaid based on external values.
   */
  initialize() {
    this._diagrams.clear();
    Private.initMermaid(this.getConfig());
  }

  /**
   * Get the underlying, potentially un-initialized mermaid module.
   */
  async getMermaid(): Promise<typeof MermaidType> {
    return await Private.ensureMermaid();
  }

  /**
   * Get the version of the currently-loaded mermaid module
   */
  getMermaidVersion(): string | null {
    return Private.version();
  }

  /**
   * Get a pre-cached mermaid figure.
   *
   * This primarily exists for the needs of `marked`, which supports async node
   * visitors, but not async rendering.
   */
  getCachedFigure(text: string): HTMLElement | null {
    return this._diagrams.get(text);
  }

  /**
   * Attempt a raw rendering of mermaid to an SVG string, extracting some metadata.
   */
  async renderSvg(text: string): Promise<IMermaidManager.IRenderInfo> {
    const _mermaid = await this.getMermaid();

    const id = `jp-mermaid-${Private.nextMermaidId()}`;

    // create temporary element into which to render
    const el = document.createElement('div');
    document.body.appendChild(el);
    try {
      const result = await _mermaid.render(id, text, el);
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.svg, 'image/svg+xml');

      const info: IMermaidManager.IRenderInfo = { svg: result.svg };
      const svg = doc.querySelector('svg');
      const { maxWidth } = svg?.style || {};
      info.width = maxWidth ? parseFloat(maxWidth) : null;
      const firstTitle = doc.querySelector('title');
      const firstDesc = doc.querySelector('desc');
      if (firstTitle) {
        info.accessibleTitle = firstTitle.textContent;
      }
      if (firstDesc) {
        info.accessibleDescription = firstDesc.textContent;
      }
      return info;
    } finally {
      el.remove();
    }
  }

  /**
   * Provide and cache a fully-rendered element, checking the cache first.
   */
  async renderFigure(text: string): Promise<HTMLElement> {
    // bail if already cached
    let output: HTMLElement | null = this._diagrams.get(text);

    if (output != null) {
      return output;
    }

    let className = MERMAID_CLASS;

    let result: HTMLElement | null = null;

    // the element that will be returned
    output = document.createElement('div');
    output.className = className;

    try {
      const response = await this.renderSvg(text);
      result = this.makeMermaidFigure(response);
    } catch (err) {
      output.classList.add(WARNING_CLASS);
      result = await this.makeMermaidError(text);
    }

    let version = this.getMermaidVersion();

    if (version) {
      result.dataset.jpMermaidVersion = version;
    }

    output.appendChild(result);

    // update the cache for use when rendering synchronously
    this._diagrams.set(text, output);

    return output;
  }

  /**
   * Get the parser message element from a failed parse.
   *
   * This doesn't do much of anything if the text is successfully parsed.
   */
  async makeMermaidError(text: string): Promise<HTMLElement> {
    const _mermaid = await this.getMermaid();
    let errorMessage = '';
    try {
      await _mermaid.parse(text);
    } catch (err) {
      errorMessage = `${err}`;
    }

    const result = document.createElement('details');
    result.className = DETAILS_CLASS;
    const summary = document.createElement('summary');
    summary.className = SUMMARY_CLASS;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerText = text;
    pre.appendChild(code);
    summary.appendChild(pre);
    result.appendChild(summary);

    const warning = document.createElement('pre');
    warning.innerText = errorMessage;
    result.appendChild(warning);
    return result;
  }

  /**
   * Extract extra attributes to add to a generated figure.
   */
  makeMermaidFigure(info: IMermaidManager.IRenderInfo): HTMLElement {
    const figure = document.createElement('figure');
    const img = document.createElement('img');

    figure.appendChild(img);
    img.setAttribute(
      'src',
      `data:image/svg+xml,${encodeURIComponent(info.svg)}`
    );

    // add dimension information
    if (info.width) {
      img.width = info.width;
    }

    // add accessible alt title
    if (info.accessibleTitle) {
      img.setAttribute('alt', info.accessibleTitle);
    }

    // add accessible caption
    if (info.accessibleDescription) {
      const caption = document.createElement('figcaption');
      caption.className = 'sr-only';
      caption.textContent = info.accessibleDescription;
      figure.appendChild(caption);
    }

    return figure;
  }

  protected getConfig(): MermaidConfig {
    return {
      theme: MERMAID_DEFAULT_THEME,
      maxTextSize: 100000
    };
  }
}

/**
 * A namespace for implementation-specific details of this mermaid manager.
 */
export namespace MermaidManager {
  /**
   * Initialization options for the mermaid manager.
   */
  export interface IOptions {
    maxCacheSize?: number | null;
    mermaidConfig?: MermaidConfig;
  }
}

/**
 * A namespace for global, private mermaid data.
 */
namespace Private {
  let _mermaid: typeof MermaidType | null = null;
  let _loading: PromiseDelegate<typeof MermaidType> | null = null;
  let _nextMermaidId = 0;
  let _version: string | null = null;

  /**
   * Get the version of mermaid used for rendering.
   */
  export function version(): string | null {
    return _version;
  }

  /**
   * (Re-)initialize mermaid with lab-specific theme information
   */
  export function initMermaid(config?: MermaidConfig): boolean {
    if (!_mermaid) {
      return false;
    }

    _mermaid.mermaidAPI.globalReset();
    _mermaid.mermaidAPI.initialize({
      ...config,
      startOnLoad: false
    });
    return true;
  }

  /**
   * Determine whether mermaid has been loaded yet.
   */
  export function getMermaid(): typeof MermaidType | null {
    return _mermaid;
  }

  /**
   * Provide a globally-unique, but unstable, ID for disambiguation.
   */
  export function nextMermaidId() {
    return _nextMermaidId++;
  }

  /**
   * Ensure mermaid has been lazily loaded once, initialized, and cached.
   */
  export async function ensureMermaid(
    config?: MermaidConfig
  ): Promise<typeof MermaidType> {
    if (_mermaid != null) {
      return _mermaid;
    }
    if (_loading) {
      return _loading.promise;
    }
    _loading = new PromiseDelegate();
    _version = (await import('mermaid/package.json')).version;
    _mermaid = (await import('mermaid')).default;
    initMermaid(config);
    _loading.resolve(_mermaid);
    return _mermaid;
  }
}
