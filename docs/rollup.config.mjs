// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {nodeResolve} from "@rollup/plugin-node-resolve";

export default {
  input: "./src/editor.mjs",
  output: {
    file: "./dist/editor.bundle.js",
    format: "iife"
  },
  plugins: [nodeResolve()]
}
