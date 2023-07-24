/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { LruCache, PromiseDelegate } from './utils.js';
import { IFencedBlockRenderer, IJupyterMarkdownOptions } from './tokens.js';

import type { marked, Renderer } from 'marked';
import { MermaidMarkdown } from './markdown.js';

// highlight cache key separator
const FENCE = '```~~~';

export const DEFAULT_JUPYTER_MARKDOWN_OPTIONS: IJupyterMarkdownOptions = {
  highlightCode: async (text: string, language: string, elt: HTMLElement) => {
    // By default insert text node
    elt.appendChild(document.createTextNode(text));
  },
  mermaidRenderer: new MermaidMarkdown()
};

export function render(
  content: string,
  options: IJupyterMarkdownOptions = DEFAULT_JUPYTER_MARKDOWN_OPTIONS
): Promise<string> {
  // presently, only markdown blocks get rendered
  let blocks: IFencedBlockRenderer[] = [];
  if (options.mermaidRenderer) {
    blocks.push({
      languages: ['mermaid'],
      rank: 100,
      ...options.mermaidRenderer
    });
  }

  return Private.render(content, {
    highlighCode: options.highlightCode,
    blocks
  });
}

/**
 * A namespace for private marked functions
 */
namespace Private {
  let _initializing: PromiseDelegate<typeof marked> | null = null;
  let _marked: typeof marked | null = null;
  let _blocks: IFencedBlockRenderer[] = [];
  let _markedOptions: marked.MarkedOptions = {};
  let _highlights = new LruCache<string, string>();
  let _highlightCode = async (
    text: string,
    language: string,
    elt: HTMLElement
  ) => {
    // By default insert text node
    elt.appendChild(document.createTextNode(text));
  };

  /**
   * Options
   */
  export interface IRenderOptions {
    highlighCode?: (
      text: string,
      language: string,
      elt: HTMLElement
    ) => Promise<void>;
    blocks: IFencedBlockRenderer[];
  }

  export async function render(
    content: string,
    options: IRenderOptions
  ): Promise<string> {
    if (!_marked) {
      _marked = await initializeMarked(options);
    }
    return _marked(content, _markedOptions);
  }

  /**
   * Load marked lazily and exactly once.
   */
  export async function initializeMarked(
    options: IRenderOptions
  ): Promise<typeof marked> {
    if (_marked) {
      return _marked;
    }

    if (_initializing) {
      return await _initializing.promise;
    }

    if (options.highlighCode) {
      _highlightCode = options.highlighCode;
    }

    // order blocks by `rank`
    _blocks = options.blocks.sort(
      (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
    );

    _initializing = new PromiseDelegate();

    // load marked lazily, and exactly once
    const { marked, Renderer } = await import('marked');

    await initializeMarkedPlugins(marked);

    // finish marked configuration
    _markedOptions = {
      // use the explicit async paradigm for `walkTokens`
      async: true,
      // enable all built-in GitHub-flavored Markdown opinions
      gfm: true,
      // santizing is applied by the sanitizer
      sanitize: false,
      // asynchronously prepare for any special tokens, like highlighting and mermaid
      walkTokens,
      // use custom renderer
      renderer: makeRenderer(Renderer)
    };

    // complete initialization
    _marked = marked;
    _initializing.resolve(_marked);
    return _marked;
  }

  /**
   * Load and use marked plugins.
   *
   * As of writing, both of these features would work without plugins, but emit
   * deprecation warnings.
   */
  async function initializeMarkedPlugins(
    _marked: typeof marked
  ): Promise<void> {
    // load marked plugins
    const plugins: marked.MarkedExtension[] = await Promise.all([
      (async () => (await import('marked-gfm-heading-id')).gfmHeadingId())(),
      (async () => (await import('marked-mangle')).mangle())()
    ]);

    for (const plugin of plugins) {
      _marked.use(plugin);
    }
  }

  /**
   * Build a custom marked renderer.
   */
  function makeRenderer(Renderer_: typeof Renderer): Renderer {
    const renderer = new Renderer_();
    const originalCode = renderer.code;

    renderer.code = (code: string, language: string) => {
      // handle block renderers
      for (const block of _blocks) {
        if (block.languages.includes(language)) {
          const rendered = block.render(code);
          if (rendered != null) {
            return rendered;
          }
        }
      }

      // handle known highlighting
      const key = `${language}${FENCE}${code}${FENCE}`;
      const highlight = _highlights.get(key);
      if (highlight != null) {
        return highlight;
      }

      // fall back to calling with the renderer as `this`
      return originalCode.call(renderer, code, language);
    };

    return renderer;
  }

  /**
   * Apply and cache syntax highlighting for code blocks.
   */
  async function highlight(token: marked.Tokens.Code): Promise<void> {
    const { lang, text } = token;
    if (!lang) {
      // no language, no highlight
      return;
    }
    const key = `${lang}${FENCE}${text}${FENCE}`;
    if (_highlights.get(key)) {
      // already cached, don't make another DOM element
      return;
    }
    const el = document.createElement('div');
    try {
      await _highlightCode(text, lang, el);
      const html = `<pre><code class="language-${lang}">${el.innerHTML}</code></pre>`;
      _highlights.set(key, html);
    } catch (err) {
      console.error(`Failed to highlight ${lang} code`, err);
    } finally {
      el.remove();
    }
  }

  /**
   * After parsing, lazily load and render or highlight code blocks
   */
  async function walkTokens(token: marked.Token): Promise<void> {
    switch (token.type) {
      case 'code':
        if (token.lang) {
          for (const block of _blocks) {
            if (block.languages.includes(token.lang)) {
              await block.walk(token.text);
              return;
            }
          }
        }
        await highlight(token);
    }
  }
}
