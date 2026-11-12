#!/usr/bin/env node
/**
 * Build dsh-sidebar-entries.
 *
 * The DSH web client does not load plain ES modules for a plugin's browser
 * half: it evaluates `lib/client.js` as a script whose only entry point is
 * `window.__ModuleLoader__.load({ id, factory })`, and the factory receives the
 * `require` function that resolves shared peers (`react`, DSH packages). The
 * client source is therefore kept as a bundle BODY in `src/client.js` and this
 * script wraps it.
 *
 * The host half is plain ESM and is copied verbatim.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGE_NAME = 'dsh-sidebar-entries'

/** Indent every non-empty line by two tabs to match the shipped bundle shape. */
function indent(source) {
  return source
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : `\t\t${line}`))
    .join('\n')
}

/** Wrap the client body in the client module loader envelope. */
function wrapClient(body) {
  return `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PACKAGE_NAME)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${indent(body).replace(/\n+$/, '')}
\t\treturn module.exports;
\t}
});
`
}

const clientBody = await readFile(join(root, 'src', 'client.js'), 'utf8')
const hostSource = await readFile(join(root, 'src', 'host.js'), 'utf8')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

// The browser half shows its own version in Settings; bake it from package.json
// so the constant can never drift from the published manifest.
const versionedBody = clientBody.replaceAll('__PLUGIN_VERSION__', String(manifest.version))

await mkdir(join(root, 'lib'), { recursive: true })
await writeFile(join(root, 'lib', 'client.js'), wrapClient(versionedBody), 'utf8')
await writeFile(join(root, 'lib', 'index.js'), hostSource, 'utf8')

console.log(`built lib/client.js and lib/index.js (v${manifest.version})`)
