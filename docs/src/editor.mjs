// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {EditorView, basicSetup} from "codemirror"
import {ViewPlugin} from "@codemirror/view"
import {render} from '@jupyter/markdown'
import {jupyterMarkdow} from '@jupyter/markdown-codemirror'

const editorSelector = '#editor';
const renderedSelector = '#renderer'

// Sync extension
const syncRenderer = ViewPlugin.fromClass(class {
  #renderer;
  #renderInProgress = false;

  constructor() {
    this.#renderer = document.querySelector(renderedSelector);
  }

  update(update) {
    if(update.docChanged) {
      this.#renderInProgress = true;
      render(state.doc.toString()).then(result => {if(!this.#renderInProgress){this.#renderer.innerHTML = result}});
    }
  }
})

const editor = new EditorView({
  extensions: [basicSetup, jupyterMarkdow(), syncRenderer],
  parent: document.querySelector(editorSelector)
})
