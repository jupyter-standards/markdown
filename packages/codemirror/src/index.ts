// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Language,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage
} from '@codemirror/language';
import type { Parser } from '@lezer/common';
import type { MarkdownExtension } from '@lezer/markdown';
import { parseMathIPython } from './ipython-md.js';

export { parseMathIPython } from './ipython-md.js';

export interface IJupyterMarkdown {
  /**
    When given, this language will be used by default to parse code
    blocks.
    */
  defaultCodeLanguage?: Language | LanguageSupport;
  /**
    A source of language support for highlighting fenced code
    blocks. When it is an array, the parser will use
    [`LanguageDescription.matchLanguageName`](https://codemirror.net/6/docs/ref/#language.LanguageDescription^matchLanguageName)
    with the fenced code info to find a matching language. When it
    is a function, will be called with the info string and may
    return a language or `LanguageDescription` object.
    */
  codeLanguages?:
    | readonly LanguageDescription[]
    | ((info: string) => Language | LanguageDescription | null);
  /**
    Set this to false to disable installation of the Markdown
    [keymap](https://codemirror.net/6/docs/ref/#lang-markdown.markdownKeymap).
    */
  addKeymap?: boolean;
  /**
    Markdown parser
    [extensions](https://github.com/lezer-parser/markdown#user-content-markdownextension)
    to add to the parser.
    */
  extensions?: MarkdownExtension;
  /**
    The base language to use. Defaults to
    [`commonmarkLanguage`](https://codemirror.net/6/docs/ref/#lang-markdown.commonmarkLanguage).
    */
  base?: Language;
  /**
   *
   */
  latexParser?: Parser;
}

export async function jupyterMarkdown(
  config: IJupyterMarkdown = {}
): Promise<LanguageSupport> {
  const [m, tex] = await Promise.all([
    import('@codemirror/lang-markdown'),
    config.latexParser
      ? Promise.resolve(null)
      : import('@codemirror/legacy-modes/mode/stex')
  ]);

  const extensions: MarkdownExtension[] = config.extensions
    ? [config.extensions]
    : [];
  extensions.push(
    parseMathIPython(
      config.latexParser ?? StreamLanguage.define(tex!.stexMath).parser
    )
  );

  return m.markdown({
    base: m.markdownLanguage,
    ...config,
    extensions
  });
}
