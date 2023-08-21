// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { EditorView, basicSetup } from "codemirror"
import { ViewPlugin } from "@codemirror/view"
import { render } from '@jupyter/markdown'
import { jupyterMarkdown } from '@jupyter/markdown-codemirror'

const EDITOR_SELECTOR = '#editor';
const RENDERED_SELECTOR = '#preview';
const RAW_SELECTOR = '#raw';
const DEFAULT_MARKDOWN_EXAMPLE = `# Title

This is a Markdown **paragraph** with _markup_.`;

// Sync extension
const syncRenderer = ViewPlugin.fromClass(class {
  #raw;
  #renderer;
  #renderCounter = 0;

  constructor(view) {
    this.#raw = document.querySelector(RAW_SELECTOR);
    this.#renderer = document.querySelector(RENDERED_SELECTOR);
    this.update({ docChanged: true, state: view.state });
  }

  update(update) {
    if (update.docChanged) {
      this.#renderCounter++;
      const counter = this.#renderCounter;
      this.#renderer.innerHTML = '<jp-progress-ring>Rendering Markdown...</jp-progress-ring>';
      render(update.state.doc.toString()).then(result => { if (counter == this.#renderCounter) { this.#renderer.innerHTML = result; this.#raw.textContent = result } });
    }
  }
})

// Ensure to keep an handle on the editor to avoid garbage collection.
let editor;

async function onLoad() {
  const markdown = await jupyterMarkdown()

  const queryArgs = new URLSearchParams(location.search);

  editor = new EditorView({
    doc: queryArgs.get('text') ?? DEFAULT_MARKDOWN_EXAMPLE,
    extensions: [
      basicSetup,
      markdown,
      syncRenderer
    ],
    parent: document.querySelector(EDITOR_SELECTOR)
  });
}

window.addEventListener('load', onLoad);
