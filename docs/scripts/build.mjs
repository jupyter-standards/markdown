#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { render as renderJpMd } from '@jupyter/markdown'
import * as fs from 'fs';
import { Environment, FileSystemLoader } from 'nunjucks';
import { pathToFileURL } from 'url'


const GFM_SPEC_URL = 'https://raw.githubusercontent.com/github/cmark-gfm/0.29.0.gfm.13/test/spec.txt';

const State = Object.freeze({
    // Spec text to be rendered directly
    MARKDOWN: 0,
    // First part of the example to be rendered
    EXAMPLE_MD: 1,
    // Second part of the example to be taken as expectation
    EXAMPLE_HTML: 2
})


function escape(s) {
    let lookup = {
        '&': "&amp;",
        '"': "&quot;",
        '\'': "&apos;",
        '<': "&lt;",
        '>': "&gt;"
    };
    return s.replace( /[&"'<>]/g, c => lookup[c] );
}


async function buildSpecification() {
    const result = await fetch(GFM_SPEC_URL);

    const content = (await result.text()).split('\n');

    // Skip frontmatter header
    const mainContent = content.slice(6);

    let strippedMd = "";
    const examples = [];
    const renderedExample = [];
    let currentExample = -1
    let state = State.MARKDOWN

    mainContent.forEach(line => {
        switch(state){
            case State.MARKDOWN:
                if (line.startsWith('`'.repeat(32) + ' example')) {
                    state = State.EXAMPLE_MD;
                    currentExample += 1;
                    examples[currentExample] = ''
                } else {
                    strippedMd += line + "\n";
                }
                break;
            case State.EXAMPLE_MD:
                if (line == '.') {
                    state = State.EXAMPLE_HTML
                    renderedExample[currentExample] = '';
                } else {
                    examples[currentExample] += line + "\n"
                }
                break;
            case State.EXAMPLE_HTML:
                if (line == '`'.repeat(32)) {
                    state = State.MARKDOWN
                    strippedMd += `@#@${currentExample}@#@\n`;
                } else {
                    renderedExample[currentExample] += line + "\n"
                }
                break;
        }
    })

    const renderedSpec = await renderJpMd(strippedMd);
    return renderedSpec.replace(/@#@(\d+)@#@/g, (m, idx) => {
        return `<table>
    <tr>
        <td>
            <pre>
${escape(examples[idx])}
            </pre>
        </td>
        <td>
            <jp-tabs orientation="horizontal">
                <jp-tab>HTML</jp-tab>
                <jp-tab>Preview</jp-tab>
                <jp-tab-panel>
                    <code>
${escape(renderedExample[idx])}
                    </code>
                </jp-tab-panel>
                <jp-tab-panel>
                    TODO this will be the preview result
                </jp-tab-panel>
            </jp-tabs>
        </td>
    </tr>
  </table>`})
}


function setUp(templatesDir) {
    return new Environment(new FileSystemLoader(templatesDir));
}

export async function render() {
    const env = setUp('templates');

    const common = {
        pages: [
            ['Home', './index.html'],
            ['Try', './try.html'],
        ]
    }

    const spec = await buildSpecification();

    const base = env.getTemplate('home.html.jinja2');
    const renderedBase = base.render({...common, spec});
    fs.writeFileSync("./dist/index.html", renderedBase);

    const editor = env.getTemplate('editor.html.jinja2');
    const renderedEditor = editor.render(common);
    fs.writeFileSync("./dist/try.html", renderedEditor);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  render()
}