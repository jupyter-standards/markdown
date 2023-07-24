// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {EditorView, basicSetup} from "codemirror"
import {ViewPlugin} from "@codemirror/view"
import {render} from '@jupyter/markdown'
import {jupyterMarkdown} from '@jupyter/markdown-codemirror'

const editorSelector = '#editor';
const renderedSelector = '#rendered'

// Sync extension
const syncRenderer = ViewPlugin.fromClass(class {
  #renderer;
  #renderInProgress = false;

  constructor(view) {
    this.#renderer = document.querySelector(renderedSelector);
    this.update({docChanged: true, state: view.state});
  }

  update(update) {
    if(update.docChanged) {
      this.#renderInProgress = true;
      render(update.state.doc.toString()).then(result => {if(!this.#renderInProgress){this.#renderer.innerHTML = result}});
    }
  }
})

const editor = jupyterMarkdown().then(markdown => new EditorView({
  doc: `# Title

This is a Markdown **paragraph** with _markup_.`,
  extensions: [basicSetup, markdown, 
    syncRenderer
  ],
  parent: document.querySelector(editorSelector)
}));
