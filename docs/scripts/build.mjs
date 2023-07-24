#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as fs from 'fs';
import { Environment, FileSystemLoader } from 'nunjucks';
import { pathToFileURL } from 'url'

function setUp(templatesDir) {
    return new Environment(new FileSystemLoader(templatesDir));
}

export function render() {
    const env = setUp('templates');

    const common = {
        pages: [
            ['Home', './index.html'],
            ['Try', './try.html'],
        ]
    }

    const base = env.getTemplate('base.html.jinja2');
    const renderedBase = base.render(common);
    fs.writeFileSync("./dist/index.html", renderedBase);

    const editor = env.getTemplate('editor.html.jinja2');
    const renderedEditor = editor.render(common);
    fs.writeFileSync("./dist/try.html", renderedEditor);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  render()
}