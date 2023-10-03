#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


import {
    diff_match_patch
} from 'diff-match-patch';
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
    const gfmExamples = [];
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
                    gfmExamples[currentExample] = '';
                } else {
                    examples[currentExample] += line + "\n"
                }
                break;
            case State.EXAMPLE_HTML:
                if (line == '`'.repeat(32)) {
                    state = State.MARKDOWN
                    strippedMd += `@#@${currentExample}@#@\n`;
                } else {
                    gfmExamples[currentExample] += line + "\n"
                }
                break;
        }
    })

    const renderedSpec = await renderJpMd(strippedMd);
    const jpExamples = await Promise.all(examples.map(example => renderJpMd(example.replace(/→/g, '\t'))));
    const dmp = new diff_match_patch();
    return renderedSpec.replace(/@#@(\d+)@#@/g, (m, idx) => {
        const jpTabHighlighted = jpExamples[idx].replace(/\t/g, '→')
        const diffs = gfmExamples[idx] ? dmp.diff_main(gfmExamples[idx], jpTabHighlighted) : null;
        if(diffs) {dmp.diff_cleanupSemantic(diffs)}

        // Preview is encapsulated in iframe to avoid style contamination.
        const exampleIdx = parseInt(idx, 10) + 1
        return `<a href="#example-${exampleIdx}">Example ${exampleIdx}</a>
<table>
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
                <jp-tab>Diff${(diffs?.length ?? -1) === 1 ? '' : '<jp-badge circular fill="accent-primary"></jp-badge>'}</jp-tab>
                <jp-tab-panel>
                    <code>
${escape(jpTabHighlighted)}
                    </code>
                </jp-tab-panel>
                <jp-tab-panel>
                    <iframe srcdoc="<!DOCTYPE html><html><body>${jpExamples[idx]}</body></html>" sandbox="allow-same-origin" frameborder="0"></iframe>
                </jp-tab-panel>
                <jp-tab-panel>
                    ${diffs ? dmp.diff_prettyHtml(diffs) : 'This feature is not supported by the GitHub Markdown Flavor.'}
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