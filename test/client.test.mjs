/**
 * Browser-half tests: the bundle envelope, row matching, version compare, and a
 * smoke mount of `apply()` plus one render of the Settings section.
 * No DOM library: the fakes below implement only what the plugin touches.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/** A fake React that records elements and runs hooks without a renderer. */
function makeReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children }
    },
    useReducer(_reducer, initial) {
      return [initial, () => {}]
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect() {},
    useRef(initial) {
      return { current: initial }
    },
  }
}

/** Evaluate lib/client.js against the loader envelope the DSH shell provides. */
async function loadClient() {
  const source = await readFile(join(root, 'lib', 'client.js'), 'utf8')
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(definition) {
          captured = definition
        },
      },
      localStorage: {
        store: new Map(),
        getItem(key) {
          return this.store.has(key) ? this.store.get(key) : null
        },
        setItem(key, value) {
          this.store.set(key, String(value))
        },
      },
    },
    console,
    setTimeout,
    Symbol,
    Object,
    Set,
    Map,
    JSON,
    Array,
    Error,
    Promise,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })
  assert.ok(captured !== undefined, 'the bundle must call __ModuleLoader__.load')
  assert.equal(captured.id, 'dsh-sidebar-entry-manager')
  const exports = captured.factory((name) => {
    if (name === 'react') return makeReact()
    throw new Error(`unexpected require(${name})`)
  })
  exports._sandbox = sandbox
  return exports
}

/** Fake rows: each exposes the attributes the plugin reads and writes. */
function makeRow(label) {
  const attributes = new Map()
  if (label !== undefined) attributes.set('aria-label', label)
  return {
    style: {},
    attributes,
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null
    },
    setAttribute(name, value) {
      attributes.set(name, String(value))
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
  }
}

/** A fake document that answers the panel-row selector with the given rows. */
function makeDoc(rows, options) {
  const more = options && options.more !== undefined ? options.more : null
  const nav = more === null ? null : {
    querySelector(selector) {
      return selector === 'button[aria-haspopup="menu"]' ? more : null
    },
  }
  const anchorFor = (row) => ({
    closest(tag) {
      if (tag === 'button') return row
      if (tag === 'nav') return nav
      return null
    },
  })
  return {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-slot="sidebar.panellist"]')
      return rows.map(anchorFor)
    },
    querySelector(selector) {
      assert.equal(selector, '[data-slot="sidebar.panellist"]')
      return rows.length > 0 ? anchorFor(rows[0]) : null
    },
  }
}

test('the bundle is wrapped in the client loader envelope', async () => {
  const exports = await loadClient()
  assert.equal(typeof exports.apply, 'function')
  assert.deepEqual([...exports.inject], ['slots'])
})

test('the build baked the package version into the bundle', async () => {
  const source = await readFile(join(root, 'lib', 'client.js'), 'utf8')
  assert.match(source, /const VERSION = '0\.2\.2'/)
})

test('update failures offer only the retries that can work on this host', async () => {
  const { __test } = await loadClient()

  const desktopFresh = __test.updateFailureHint('RELEASE_TOO_FRESH', 'market text', 'desktop', 'zh')
  assert.equal(desktopFresh.canUpdate, false, 'the desktop host takes no one-shot bypass')
  assert.equal(desktopFresh.force, false)
  assert.match(desktopFresh.text, /发布等待期/)

  const webFresh = __test.updateFailureHint('RELEASE_TOO_FRESH', 'market text', 'web', 'zh')
  assert.equal(webFresh.canUpdate, true, 'the market-managed host can retry with force')
  assert.equal(webFresh.force, true)

  const busy = __test.updateFailureHint('OPERATION_BUSY', 'market busy text', 'desktop', 'zh')
  assert.equal(busy.canUpdate, false)
  assert.equal(busy.text, 'market busy text', 'the market explains the refused reason')

  assert.equal(__test.updateFailureHint('UPDATE_FAILED', 'boom', 'web', 'zh'), null)
})

test('resolveLabel handles strings, thunks, locale maps and the fallback', async () => {
  const { __test } = await loadClient()
  assert.equal(__test.resolveLabel('插件', 'x', 'zh'), '插件')
  assert.equal(__test.resolveLabel(() => '技能', 'x', 'zh'), '技能')
  assert.equal(__test.resolveLabel({ zh: '看板', en: 'Board' }, 'x', 'zh'), '看板')
  assert.equal(__test.resolveLabel({ zh: '看板', en: 'Board' }, 'x', 'en'), 'Board')
  assert.equal(__test.resolveLabel(undefined, 'fallback', 'zh'), 'fallback')
})

test('compareVersion orders releases and treats a missing side as zero', async () => {
  const { __test } = await loadClient()
  assert.equal(__test.compareVersion('0.2.0', '0.1.9'), 1)
  assert.equal(__test.compareVersion('0.2.0', '0.2.0'), 0)
  assert.equal(__test.compareVersion('0.1.0', '0.2.0'), -1)
  assert.equal(__test.compareVersion('0.2.0', ''), 1)
})

test('rows map to declared ids by index, and hide only the chosen ones', async () => {
  const { __test } = await loadClient()
  const entries = [
    { id: 'a', order: 1, label: 'A' },
    { id: 'b', order: 2, label: 'B' },
  ]
  const rows = [makeRow('A'), makeRow('B')]
  const doc = makeDoc(rows)

  assert.equal(__test.applyDom(doc, entries, []), 0)
  assert.equal(rows[1].attributes.has('data-sidebar-entry-hidden'), false)

  assert.equal(__test.applyDom(doc, entries, ['b']), 1)
  assert.equal(rows[0].style.display, undefined)
  assert.equal(rows[1].style.display, 'none')
  assert.equal(rows[1].getAttribute('data-sidebar-entry-hidden'), 'b')
  assert.equal(rows[1].getAttribute('aria-hidden'), 'true')

  assert.equal(__test.applyDom(doc, entries, []), 0)
  assert.equal(rows[1].style.display, '')
  assert.equal(rows[1].attributes.has('data-sidebar-entry-hidden'), false)
})

test('a reordered row is repaired by its aria-label instead of its index', async () => {
  const { __test } = await loadClient()
  const entries = [
    { id: 'a', order: 1, label: 'A' },
    { id: 'b', order: 2, label: 'B' },
  ]
  const rows = [makeRow('B'), makeRow('A')]
  __test.applyDom(makeDoc(rows), entries, ['a'])
  assert.equal(rows[0].getAttribute('data-sidebar-entry-hidden'), null, 'B must stay visible')
  assert.equal(rows[1].getAttribute('data-sidebar-entry-hidden'), 'a')
})

test('a row beyond the declared entries is left alone', async () => {
  const { __test } = await loadClient()
  const entries = [{ id: 'a', order: 1, label: 'A' }]
  const rows = [makeRow('A'), makeRow('Extra')]
  assert.equal(__test.applyDom(makeDoc(rows), entries, ['a']), 1)
  assert.equal(rows[0].getAttribute('data-sidebar-entry-hidden'), 'a')
  assert.equal(rows[1].attributes.has('data-sidebar-entry-hidden'), false)
})

test('the host More launcher maps to the synthetic id and can be hidden', async () => {
  const { __test } = await loadClient()
  const entries = [{ id: 'a', order: 1, label: 'A' }]
  const row = makeRow('A')
  const more = makeRow('更多')
  const doc = makeDoc([row], { more })

  assert.equal(__test.applyDom(doc, entries, []), 0)
  assert.equal(more.style.display, undefined)

  assert.equal(__test.applyDom(doc, entries, ['__more__']), 1)
  assert.equal(more.style.display, 'none')
  assert.equal(more.getAttribute('data-sidebar-entry-hidden'), '__more__')
  assert.equal(more.getAttribute('aria-hidden'), 'true')
  assert.equal(row.style.display, undefined, 'panel rows stay untouched')

  assert.equal(__test.applyDom(doc, entries, []), 0)
  assert.equal(more.style.display, '')
  assert.equal(more.attributes.has('data-sidebar-entry-hidden'), false)
})

test('hasMoreLauncher only reports a More row when the shell renders one', async () => {
  const { __test } = await loadClient()
  assert.equal(__test.hasMoreLauncher(makeDoc([makeRow('A')], { more: makeRow('更多') })), true)
  assert.equal(__test.hasMoreLauncher(makeDoc([makeRow('A')])), false)
  assert.equal(__test.hasMoreLauncher(null), false)
})

test('entries are read from the shell seat and sorted by order', async () => {
  const { __test } = await loadClient()
  const ctx = {
    slots: {
      entriesOfSlot: (name) => {
        assert.equal(name, 'sidebar.panellist')
        return [
          { options: { id: 'late', order: 90, label: () => '九十' } },
          { options: { id: 'early', order: 10, label: '十' } },
          { options: {} },
        ]
      },
    },
  }
  const entries = __test.readEntries(ctx, 'zh')
  assert.equal(entries.map((entry) => entry.id).join(','), 'early,late')
})

test('apply mounts, syncs the DOM and registers the Settings section', async () => {
  const exports = await loadClient()
  const sandbox = exports._sandbox
  const rows = [makeRow('插件'), makeRow('技能')]

  sandbox.document = {
    documentElement: { getAttribute: () => 'zh' },
    body: {},
    querySelectorAll: (selector) => makeDoc(rows).querySelectorAll(selector),
  }
  sandbox.fetch = async () => ({ ok: true, json: async () => ({ ok: true, hidden: [], autoUpdate: false }) })
  sandbox.MutationObserver = class {
    observe() {}
    disconnect() {}
  }
  sandbox.requestAnimationFrame = (fn) => {
    fn()
    return 1
  }
  sandbox.navigator = { language: 'zh-CN' }

  const registered = []
  const ctx = {
    get: () => undefined,
    effect(factory) {
      factory()
    },
    slots: {
      entriesOfSlot: () => [
        { options: { id: 'plugins', order: 1, label: '插件' } },
        { options: { id: 'skills', order: 2, label: '技能' } },
      ],
      subscribe: () => () => {},
      register(options, component) {
        registered.push({ options, component })
        return () => {}
      },
      inject(_key, callback) {
        return callback()
      },
    },
  }

  exports.apply(ctx)
  assert.equal(registered.length, 1)
  assert.equal(registered[0].options.name, 'settings.section')
  assert.equal(registered[0].options.id, 'sidebar-entry-manager')

  // Drive the section through one render and two toggles.
  const committed = []
  const store = {
    value: { hidden: [], autoUpdate: false },
    get() {
      return this.value
    },
    set(next) {
      this.value = next
    },
    subscribe() {
      return () => {}
    },
  }
  const notices = { get: () => ({ text: '', tone: 'muted' }), subscribe: () => () => {} }
  const element = registered[0].component(
    Object.assign({}, registered[0].options.inject(), {
      store,
      notices,
      commit: (patch) => {
        committed.push(patch)
      },
    }),
  )
  assert.equal(element.type, 'div')

  const switches = []
  const collectSwitches = (node) => {
    if (node === null || node === undefined) return
    if (Array.isArray(node)) {
      node.forEach(collectSwitches)
      return
    }
    if (typeof node !== 'object') return
    if (typeof node.type === 'function') {
      collectSwitches(node.type(node.props))
      return
    }
    if (node.props && node.props.role === 'switch') switches.push(node)
    for (const child of node.children || []) collectSwitches(child)
  }
  collectSwitches(element)
  assert.equal(switches.length, 3, 'two entry switches plus the auto-update switch')

  switches[0].props.onClick()
  assert.equal(JSON.stringify(committed[0]), JSON.stringify({ hidden: ['plugins'] }))

  switches[2].props.onClick()
  assert.equal(JSON.stringify(committed[1]), JSON.stringify({ autoUpdate: true }))
})
