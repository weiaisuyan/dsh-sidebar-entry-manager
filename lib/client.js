window.__ModuleLoader__.load({
	id: "dsh-sidebar-entries",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/**
		 * dsh-sidebar-entries — browser half (bundle body).
		 *
		 * Three jobs:
		 *  1. Hide the chosen sidebar entries: the shell (`ui-sidebar`) lists
		 *     `sidebar.panellist` registrations but ships no per-entry visibility
		 *     switch, and its "More" menu deliberately offers no pin/hide UI. A row
		 *     button carries the entry's resolved label as `aria-label` and no id
		 *     attribute, so this plugin maps rows back to declared entry ids (index
		 *     first, label as the cross-check) and hides the chosen ones.
		 *  2. Offer the missing switch: a "Sidebar entries" section inside DSH
		 *     Settings, one toggle per registered entry, persisted on the Host.
		 *  3. Keep itself up to date from inside that same section: a silent version
		 *     check (npm registry or the plugin market's public update API), a
		 *     one-click update through the market, and an optional auto-update switch.
		 *
		 * Hiding is presentational on purpose: the row stays mounted (React keeps
		 * owning it), the plugin keeps running, and its page still works — only the
		 * navigation row stops being drawn.
		 *
		 * This file is the bundle BODY; scripts/build.mjs wraps it in
		 * `window.__ModuleLoader__.load({ id, factory })` and substitutes
		 * `0.2.0`, which is why it uses `require('react')` and
		 * `exports.*` instead of ESM syntax.
		 */

		const React = require('react')

		/** Installed version, substituted from package.json at build time. */
		const VERSION = '0.2.0'

		/** Package name used by the update endpoints. */
		const PKG_NAME = 'dsh-sidebar-entries'

		/** Locale namespace / settings section id. */
		const NS = 'sidebar-entries'

		/**
		 * Host state route, DOCUMENT-RELATIVE on purpose: the GUI is served with
		 * `<base href="./">`, so a root-absolute path escapes a sub-path deployment.
		 */
		const API = 'api/dsh-sidebar-entries/state'

		/** Origin-scoped fallback cache, used only when the Host route is unreachable. */
		const CACHE_KEY = 'dsh-sidebar-entries:state'

		/** Marker attribute on a row this plugin hid (never set on a visible row). */
		const HIDDEN_ATTR = 'data-sidebar-entry-hidden'

		/** Anchor the slot renderer stamps inside every panel row glyph. */
		const ROW_SELECTOR = '[data-slot="sidebar.panellist"]'

		/** Entry id of the plugin manager; flagged in the UI, never blocked. */
		const PROTECTED_ID = 'plugins'

		/** The plugin market's public update API (dshmarket >= 1.60, schema v1). */
		const MARKET = {
		  capabilities: '/dsh-market/api/v1/capabilities',
		  updates: '/dsh-market/api/v1/updates',
		  operations: '/dsh-market/api/v1/operations',
		}

		/** Fallback version source when the market is absent. */
		const NPM_LATEST_URL = 'https://registry.npmjs.org/dsh-sidebar-entries/latest'

		const STRINGS = {
		  zh: {
		    nav: '侧边栏入口',
		    title: '侧边栏入口',
		    intro: '勾掉不想在左侧导航栏显示的入口。插件本身继续运行，它的页面和功能都不受影响——只是那一行不再画出来。',
		    count: '已登记 {total} 个入口，当前隐藏 {hidden} 个',
		    empty: '当前没有登记到任何侧边栏入口。',
		    show: '显示这一行',
		    hide: '隐藏这一行',
		    reset: '全部恢复显示',
		    saved: '已保存',
		    failed: '保存失败：{detail}',
		    offline: '宿主接口不可用，本次改动只在这个页面生效。',
		    protectedNote: '「插件」入口也可以隐藏，但隐藏后侧栏里就没有插件管理入口了（设置里仍然进得去）。',
		    updateTitle: '插件更新',
		    version: '当前版本 v{version}',
		    check: '检查更新',
		    updateNow: '立即更新',
		    checking: '正在检查…',
		    latest: '已是最新版本（{time} 检查）',
		    available: '发现新版本 v{latest}',
		    updating: '正在更新…{progress}',
		    updateDone: '已更新到 v{version}，刷新页面即可生效',
		    updateDoneRestart: '已更新到 v{version}，重启 App 后生效',
		    updateFailed: '更新失败：{detail}',
		    autoUpdate: '自动更新',
		    autoUpdateDesc: '发现新版本时自动安装（有会话在跑时会跳过，不打断会话）。',
		    autoSkipped: '发现 v{latest}，但当前有会话在运行，已跳过自动更新。',
		    noMarket: '没有找到插件市场，无法在这里安装。到「插件」页手动更新。',
		    agentsBusy: '现在有 {count} 个会话正在运行，更新会替换插件文件。稍后再试。',
		    forceFresh: '这个版本刚发布，市场还要等几分钟。过会儿再点一次「立即更新」。',
		    retry: '重试',
		    checkedAt: '（{time} 检查）',
		  },
		  en: {
		    nav: 'Sidebar entries',
		    title: 'Sidebar entries',
		    intro: 'Turn off the entries you do not want in the left navigation. The plugin keeps running and its page keeps working — only the row stops being drawn.',
		    count: '{total} registered entries, {hidden} hidden',
		    empty: 'No sidebar entries are registered right now.',
		    show: 'Show this row',
		    hide: 'Hide this row',
		    reset: 'Show everything again',
		    saved: 'Saved',
		    failed: 'Could not save: {detail}',
		    offline: 'The Host route is unreachable; this change only applies to this page.',
		    protectedNote: 'The Plugins entry can be hidden too, but then the sidebar loses its plugin manager entry (Settings still opens it).',
		    updateTitle: 'Plugin update',
		    version: 'Version v{version}',
		    check: 'Check for updates',
		    updateNow: 'Update now',
		    checking: 'Checking…',
		    latest: 'Up to date (checked {time})',
		    available: 'New version v{latest} available',
		    updating: 'Updating…{progress}',
		    updateDone: 'Updated to v{version}. Refresh the page to apply.',
		    updateDoneRestart: 'Updated to v{version}. Restart the app to apply.',
		    updateFailed: 'Update failed: {detail}',
		    autoUpdate: 'Auto-update',
		    autoUpdateDesc: 'Install new versions automatically. Skipped while conversations are running, so nothing is interrupted.',
		    autoSkipped: 'v{latest} is available, but conversations are running — auto-update skipped.',
		    noMarket: 'Plugin market not found; update from the Plugins page instead.',
		    agentsBusy: '{count} conversations are running. Updating replaces plugin files — try again later.',
		    forceFresh: 'This release is very fresh; the market needs a few more minutes. Try "Update now" again shortly.',
		    retry: 'Retry',
		    checkedAt: '(checked {time})',
		  },
		}

		/** Current UI language, read at render time so a language switch shows on reload. */
		function currentLang() {
		  let raw = ''
		  try {
		    raw = document.documentElement.getAttribute('lang') || ''
		  } catch {
		    raw = ''
		  }
		  if (raw === '') {
		    try {
		      raw = navigator.language || ''
		    } catch {
		      raw = ''
		    }
		  }
		  if (typeof raw !== 'string' || raw === '') return 'zh'
		  return raw.toLowerCase().startsWith('zh') ? 'zh' : 'en'
		}

		/** Translate one key, with `{name}` interpolation. */
		function translate(lang, key, values) {
		  const table = STRINGS[lang] || STRINGS.zh
		  const template = table[key] !== undefined ? table[key] : STRINGS.zh[key] !== undefined ? STRINGS.zh[key] : key
		  if (values === undefined) return template
		  return template.replace(/\{(\w+)\}/g, (match, name) =>
		    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
		  )
		}

		/** Keep only well-formed ids, de-duplicated in first-seen order. */
		function sanitizeIds(value) {
		  if (!Array.isArray(value)) return []
		  const seen = new Set()
		  const out = []
		  for (const raw of value) {
		    if (typeof raw !== 'string') continue
		    const id = raw.trim()
		    if (id === '' || id.length > 120 || seen.has(id)) continue
		    seen.add(id)
		    out.push(id)
		    if (out.length >= 200) break
		  }
		  return out
		}

		/** Minimal observable read/write store. */
		function createStore(initial) {
		  let value = initial
		  const listeners = new Set()
		  return {
		    get() {
		      return value
		    },
		    set(next) {
		      value = next
		      for (const listener of Array.from(listeners)) {
		        try {
		          listener()
		        } catch {
		          // A broken listener must not stop the others.
		        }
		      }
		    },
		    subscribe(listener) {
		      listeners.add(listener)
		      return () => {
		        listeners.delete(listener)
		      }
		    },
		  }
		}

		/**
		 * Resolve a slot label declaration (`string`, `() => string`, or a locale map)
		 * into display text. Mirrors the shell's `resolveSlotLabel` without importing
		 * the slots package, so this bundle needs no peer beyond React.
		 */
		function resolveLabel(label, fallback, lang) {
		  if (typeof label === 'string' && label.trim() !== '') return label
		  if (typeof label === 'function') {
		    try {
		      const value = label()
		      if (typeof value === 'string' && value.trim() !== '') return value
		    } catch {
		      // Fall through.
		    }
		  }
		  if (label !== null && typeof label === 'object') {
		    const keys = lang === 'zh' ? ['zh', 'zh-CN', 'zh-Hans', 'en'] : ['en', 'zh', 'zh-CN']
		    for (const key of keys) {
		      const value = label[key]
		      if (typeof value === 'string' && value.trim() !== '') return value
		    }
		    for (const value of Object.values(label)) {
		      if (typeof value === 'string' && value.trim() !== '') return value
		    }
		  }
		  return fallback
		}

		/**
		 * The entries currently registered in the shell's global panel seat, in the
		 * order the shell lists them (ascending `order`, stable on ties).
		 */
		function readEntries(ctx, lang) {
		  let raw = []
		  try {
		    raw = ctx.slots.entriesOfSlot('sidebar.panellist') || []
		  } catch {
		    raw = []
		  }
		  const out = []
		  for (const entry of raw) {
		    const options = (entry && entry.options) || {}
		    const id = typeof options.id === 'string' ? options.id : undefined
		    if (id === undefined || id === '') continue
		    out.push({
		      id,
		      order: typeof options.order === 'number' ? options.order : 0,
		      label: resolveLabel(options.label, id, lang),
		    })
		  }
		  out.sort((left, right) => left.order - right.order)
		  return out
		}

		/** Read the rendered panel rows and their resolved labels, in DOM order. */
		function readRowLabels(doc) {
		  if (doc === undefined || doc === null) return []
		  const anchors = doc.querySelectorAll !== undefined ? doc.querySelectorAll(ROW_SELECTOR) : []
		  const buttons = []
		  const seen = new Set()
		  for (const anchor of anchors) {
		    const button = typeof anchor.closest === 'function' ? anchor.closest('button') : null
		    if (button === null || button === undefined || seen.has(button)) continue
		    seen.add(button)
		    buttons.push(button)
		  }
		  return buttons.map((button) => {
		    const label = button.getAttribute('aria-label')
		    return { button, label: typeof label === 'string' ? label.trim() : '' }
		  })
		}

		/**
		 * Decide, per rendered row, which declared entry it belongs to and whether it
		 * must be hidden. Index alignment is authoritative (the shell renders the same
		 * entries in the same order); aria-label repairs a row whose index moved and
		 * names rows the index cannot.
		 *
		 * @param entries - declared entries in shell order.
		 * @param rows - rendered rows with their resolved labels.
		 * @param hidden - ids the user hid.
		 * @returns one decision per row.
		 */
		function resolveVisibility(entries, rows, hidden) {
		  const hiddenSet = new Set(hidden)
		  const decisions = []
		  rows.forEach((row, index) => {
		    let id = entries[index] !== undefined ? entries[index].id : undefined
		    const label = row.label
		    if (label !== '') {
		      const byIndex = entries[index]
		      if (byIndex === undefined || byIndex.label !== label) {
		        const match = entries.find((entry) => entry.label === label)
		        if (match !== undefined) id = match.id
		      }
		    }
		    if (id === undefined) return
		    decisions.push({ row: row.button, id, hide: hiddenSet.has(id) })
		  })
		  return decisions
		}

		/**
		 * Apply the stored decision to the live DOM.
		 * @returns how many rows are currently hidden.
		 */
		function applyDom(doc, entries, hidden) {
		  const decisions = resolveVisibility(entries, readRowLabels(doc), hidden)
		  let hiddenCount = 0
		  for (const decision of decisions) {
		    const row = decision.row
		    if (decision.hide) {
		      hiddenCount += 1
		      if (row.style !== undefined) row.style.display = 'none'
		      row.setAttribute(HIDDEN_ATTR, decision.id)
		      row.setAttribute('aria-hidden', 'true')
		      row.setAttribute('tabindex', '-1')
		    } else if (row.getAttribute(HIDDEN_ATTR) !== null) {
		      // Only undo what this plugin set: a visible-but-untouched row never carries the marker.
		      if (row.style !== undefined) row.style.display = ''
		      row.removeAttribute(HIDDEN_ATTR)
		      row.removeAttribute('aria-hidden')
		      row.removeAttribute('tabindex')
		    }
		  }
		  return hiddenCount
		}

		/** GET the Host state; throws when the route is unreachable or unauthorized. */
		async function fetchState() {
		  const response = await fetch(API, {
		    method: 'GET',
		    cache: 'no-store',
		    headers: { accept: 'application/json' },
		    credentials: 'same-origin',
		  })
		  if (!response.ok) throw new Error(`HTTP ${response.status}`)
		  const payload = await response.json()
		  return {
		    hidden: sanitizeIds(payload && payload.hidden),
		    autoUpdate: payload !== null && payload !== undefined && payload.autoUpdate === true,
		  }
		}

		/** POST a state patch; resolves to the full stored state. */
		async function postState(patch) {
		  const response = await fetch(API, {
		    method: 'POST',
		    headers: { 'content-type': 'application/json', accept: 'application/json' },
		    credentials: 'same-origin',
		    body: JSON.stringify(patch),
		  })
		  if (!response.ok) throw new Error(`HTTP ${response.status}`)
		  const payload = await response.json()
		  return {
		    hidden: sanitizeIds(payload && payload.hidden),
		    autoUpdate: payload !== null && payload !== undefined && payload.autoUpdate === true,
		  }
		}

		/** Read the origin-scoped fallback cache. */
		function readCache() {
		  try {
		    const raw = window.localStorage.getItem(CACHE_KEY)
		    if (raw === null) return { hidden: [], autoUpdate: false }
		    const parsed = JSON.parse(raw)
		    return {
		      hidden: sanitizeIds(parsed && parsed.hidden),
		      autoUpdate: parsed !== null && parsed !== undefined && parsed.autoUpdate === true,
		    }
		  } catch {
		    return { hidden: [], autoUpdate: false }
		  }
		}

		/** Mirror the state into the fallback cache (best effort). */
		function writeCache(state) {
		  try {
		    window.localStorage.setItem(CACHE_KEY, JSON.stringify(state))
		  } catch {
		    // Storage may be unavailable; the Host copy stays authoritative.
		  }
		}

		/** Compare dotted versions; returns 1, 0 or -1. */
		function compareVersion(left, right) {
		  const parse = (value) =>
		    String(value || '')
		      .split('-')[0]
		      .split('.')
		      .map((part) => Number.parseInt(part, 10) || 0)
		  const a = parse(left)
		  const b = parse(right)
		  const length = Math.max(a.length, b.length)
		  for (let index = 0; index < length; index += 1) {
		    const x = a[index] || 0
		    const y = b[index] || 0
		    if (x > y) return 1
		    if (x < y) return -1
		  }
		  return 0
		}

		/** Time stamp for "checked at" labels. */
		function stamp() {
		  try {
		    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
		  } catch {
		    return ''
		  }
		}

		/** Services this browser half needs. */
		const inject = ['slots']

		/**
		 * Mount the browser half: load the stored state, keep the DOM in sync, register
		 * the Settings section, and start the silent update check.
		 *
		 * @param ctx - client root context (slots service, optional locale).
		 */
		function apply(ctx) {
		  const store = createStore({ hidden: [], autoUpdate: false })
		  const notices = createStore({ text: '', tone: 'muted' })
		  const lang = currentLang()

		  let entries = readEntries(ctx, lang)

		  const paint = () => {
		    try {
		      return applyDom(document, entries, store.get().hidden)
		    } catch {
		      // A DOM shape change must never break the plugin (or the shell).
		      return 0
		    }
		  }

		  let frame = 0
		  const schedule = () => {
		    if (frame !== 0) return
		    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16)
		    frame = raf(() => {
		      frame = 0
		      paint()
		    })
		  }

		  const refreshEntries = () => {
		    entries = readEntries(ctx, lang)
		    paint()
		  }

		  /**
		   * Commit a state patch: store, repaint, persist. The optimistic value is
		   * rolled back when the Host refuses the write.
		   */
		  const commit = async (patch) => {
		    const previous = store.get()
		    const optimistic = {
		      hidden: patch.hidden !== undefined ? sanitizeIds(patch.hidden) : previous.hidden,
		      autoUpdate: patch.autoUpdate !== undefined ? patch.autoUpdate === true : previous.autoUpdate,
		    }
		    store.set(optimistic)
		    paint()
		    writeCache(optimistic)
		    notices.set({ text: '', tone: 'muted' })
		    try {
		      const stored = await postState(patch)
		      store.set(stored)
		      writeCache(stored)
		      paint()
		      notices.set({ text: translate(lang, 'saved'), tone: 'ok' })
		      return true
		    } catch (error) {
		      store.set(previous)
		      paint()
		      notices.set({
		        text: translate(lang, 'failed', { detail: error instanceof Error ? error.message : String(error) }),
		        tone: 'error',
		      })
		      return false
		    }
		  }

		  ctx.effect(() => ctx.slots.subscribe('sidebar.panellist', refreshEntries), 'dsh-sidebar-entries: panel entries')

		  try {
		    const locale = typeof ctx.get === 'function' ? ctx.get('locale', false) : undefined
		    if (locale !== undefined && locale !== null && typeof locale.subscribe === 'function') {
		      ctx.effect(() => locale.subscribe(refreshEntries), 'dsh-sidebar-entries: panel labels')
		    }
		  } catch {
		    // No locale service in this composition: labels stay as first resolved.
		  }

		  ctx.effect(() => {
		    if (typeof MutationObserver !== 'function') return () => {}
		    const target = typeof document !== 'undefined' ? document.body || document.documentElement : undefined
		    if (target === undefined || target === null) return () => {}
		    const observer = new MutationObserver(() => {
		      schedule()
		    })
		    observer.observe(target, {
		      childList: true,
		      subtree: true,
		      attributes: true,
		      attributeFilter: ['aria-label'],
		    })
		    return () => {
		      observer.disconnect()
		    }
		  }, 'dsh-sidebar-entries: sidebar mutations')

		  // First paint uses whatever we know, then the Host answer replaces it.
		  paint()
		  fetchState()
		    .then((state) => {
		      store.set(state)
		      writeCache(state)
		      paint()
		    })
		    .catch(() => {
		      const cached = readCache()
		      if (cached.hidden.length === 0 && cached.autoUpdate === false) {
		        notices.set({ text: translate(lang, 'offline'), tone: 'muted' })
		        return
		      }
		      store.set(cached)
		      paint()
		    })

		  ctx.slots.inject('settings.section', () =>
		    ctx.slots.register(
		      {
		        name: 'settings.section',
		        id: NS,
		        order: 120,
		        label: () => translate(currentLang(), 'nav'),
		        inject: () => ({ store, notices, slots: ctx.slots, ctx, commit }),
		      },
		      EntrySection,
		    ),
		  )
		}

		/** One switch: a real button with `role=switch`, so it is keyboard operable. */
		function Switch({ checked, onChange, label }) {
		  return React.createElement(
		    'button',
		    {
		      type: 'button',
		      role: 'switch',
		      'aria-checked': checked ? 'true' : 'false',
		      'aria-label': label,
		      onClick: onChange,
		      style: {
		        width: 40,
		        height: 22,
		        flex: 'none',
		        padding: 0,
		        border: 'none',
		        borderRadius: 999,
		        cursor: 'pointer',
		        position: 'relative',
		        background: checked
		          ? 'var(--dsw-alias-state-business-primary, #4d6bfe)'
		          : 'var(--dsw-alias-border-l2, rgba(127,127,127,.45))',
		        transition: 'background-color .16s ease',
		      },
		    },
		    React.createElement('span', {
		      'aria-hidden': 'true',
		      style: {
		        position: 'absolute',
		        top: 2,
		        left: checked ? 20 : 2,
		        width: 18,
		        height: 18,
		        borderRadius: '50%',
		        background: '#fff',
		        boxShadow: '0 1px 2px rgba(0,0,0,.28)',
		        transition: 'left .16s ease',
		      },
		    }),
		  )
		}

		/**
		 * The Settings section: one switch per registered sidebar entry, plus the
		 * plugin update panel.
		 */
		function EntrySection(props) {
		  const lang = currentLang()
		  const t = (key, values) => translate(lang, key, values)

		  const rerender = React.useReducer((value) => value + 1, 0)[1]
		  React.useEffect(() => props.store.subscribe(rerender), [props.store])
		  React.useEffect(() => props.notices.subscribe(rerender), [props.notices])
		  React.useEffect(() => props.slots.subscribe('sidebar.panellist', rerender), [props.slots])

		  const state = props.store.get()
		  const notice = props.notices.get()
		  const entries = readEntries(props.ctx, lang)
		  const current = state.hidden
		  const hiddenHere = current.filter((id) => entries.some((entry) => entry.id === id)).length

		  /* ── update state ─────────────────────────────────────────────────────── */
		  const [update, setUpdate] = React.useState({
		    phase: 'idle',
		    text: '',
		    installed: VERSION,
		    latest: '',
		    canUpdate: false,
		    progress: null,
		    agentsBusy: 0,
		    forceFresh: false,
		  })
		  const autoRef = React.useRef(false)

		  const checkUpdate = async (silent) => {
		    const quiet = silent === true
		    setUpdate((prev) => (quiet ? prev : { ...prev, phase: 'checking', text: t('checking'), canUpdate: false }))
		    try {
		      /* Prefer the market's public update API: it knows the real installed
		         version and enforces the release-age policy. Fall back to npm. */
		      let installed = VERSION
		      let latest = ''
		      let available = false
		      let hasMarket = false
		      try {
		        const capsRes = await fetch(`${MARKET.capabilities}?t=${Date.now()}`, { cache: 'no-store' })
		        if (capsRes.ok === true) {
		          const caps = await capsRes.json()
		          hasMarket = caps !== null && caps !== undefined && caps.features !== undefined && caps.features.check === true
		        }
		      } catch {
		        hasMarket = false
		      }
		      if (hasMarket === true) {
		        const res = await fetch(`${MARKET.updates}?name=${encodeURIComponent(PKG_NAME)}&force=1&t=${Date.now()}`, {
		          cache: 'no-store',
		        })
		        if (res.ok !== true) throw new Error(`HTTP ${res.status}`)
		        const data = await res.json()
		        const info = data === null || data === undefined ? undefined : data.package
		        if (info === undefined || info === null) throw new Error('no package info')
		        installed = String(info.installedVersion || VERSION)
		        latest = String(info.latestVersion || installed)
		        available = info.updateAvailable === true || compareVersion(latest, installed) > 0
		      } else {
		        const res = await fetch(`${NPM_LATEST_URL}?t=${Date.now()}`, { cache: 'no-store' })
		        if (res.ok !== true) throw new Error(`HTTP ${res.status}`)
		        const data = await res.json()
		        latest = String((data && data.version) || '')
		        available = latest !== '' && compareVersion(latest, installed) > 0
		      }
		      setUpdate({
		        phase: available ? 'available' : 'latest',
		        text: available
		          ? t('available', { latest })
		          : t('latest', { time: stamp() }),
		        installed,
		        latest,
		        canUpdate: available,
		        progress: null,
		        agentsBusy: 0,
		        forceFresh: false,
		      })
		      if (available === true && quiet === true && state.autoUpdate === true && autoRef.current === false) {
		        autoRef.current = true
		        /* Auto-install only through the market; npm-only installs need a manual path. */
		        if (hasMarket === true) void runUpdate(latest)
		        else setUpdate((prev) => ({ ...prev, text: t('noMarket') }))
		      }
		    } catch (error) {
		      setUpdate((prev) => ({
		        ...prev,
		        phase: 'error',
		        text: t('updateFailed', { detail: error instanceof Error ? error.message : String(error) }),
		        canUpdate: false,
		      }))
		    }
		  }

		  const runUpdate = async (targetVersion) => {
		    const target = typeof targetVersion === 'string' && targetVersion !== '' ? targetVersion : update.latest
		    setUpdate((prev) => ({ ...prev, phase: 'updating', text: t('updating', { progress: '' }), canUpdate: false, progress: 0 }))
		    try {
		      const body = { packageName: PKG_NAME }
		      if (update.forceFresh === true) body.force = true
		      const res = await fetch(MARKET.updates, {
		        method: 'POST',
		        headers: { 'content-type': 'application/json' },
		        body: JSON.stringify(body),
		      })
		      if (res.status === 409) {
		        let busy = null
		        try {
		          busy = await res.json()
		        } catch {
		          // ignore
		        }
		        const count = busy !== null && busy !== undefined && Array.isArray(busy.runningAgents) ? busy.runningAgents.length : 0
		        setUpdate((prev) => ({
		          ...prev,
		          phase: 'available',
		          canUpdate: true,
		          agentsBusy: count || 1,
		          text: t('agentsBusy', { count: count || 1 }),
		        }))
		        return
		      }
		      if (res.status !== 202) {
		        let detail = ''
		        try {
		          const payload = await res.json()
		          detail = String((payload && (payload.message || payload.error)) || '')
		        } catch {
		          // ignore
		        }
		        throw new Error(`HTTP ${res.status}${detail === '' ? '' : ': ' + detail}`)
		      }
		      const created = await res.json()
		      const createdOp = created === null || created === undefined ? {} : created.operation || created
		      const operationId = String((createdOp && createdOp.operationId) || (created && created.operationId) || '')
		      if (operationId === '') throw new Error('no operation id')
		      for (let step = 0; step < 80; step += 1) {
		        await new Promise((resolve) => setTimeout(resolve, 1500))
		        const poll = await fetch(`${MARKET.operations}?operationId=${encodeURIComponent(operationId)}`, { cache: 'no-store' })
		        if (poll.ok !== true) continue
		        const payload = await poll.json()
		        const op = payload === null || payload === undefined ? undefined : payload.operation || payload
		        if (op === undefined || op === null) continue
		        const phase = String(op.state || '')
		        if (phase === 'succeeded') {
		          const got = String(op.installedVersion || target)
		          const outcome = op.outcome === null || op.outcome === undefined ? {} : op.outcome
		          const needRestart = outcome.restartRequired === true
		          setUpdate((prev) => ({
		            ...prev,
		            phase: 'done',
		            text: needRestart ? t('updateDoneRestart', { version: got }) : t('updateDone', { version: got }),
		            installed: got,
		            canUpdate: false,
		            progress: 100,
		          }))
		          return
		        }
		        if (phase === 'failed' || phase === 'cancelled' || phase === 'rolled-back') {
		          const failure = op.failure === null || op.failure === undefined ? {} : op.failure
		          const code = String(failure.code || '')
		          if (code === 'RELEASE_TOO_FRESH' || code === 'VERSION_UNCHANGED' || code === 'OPERATION_BUSY') {
		            setUpdate((prev) => ({
		              ...prev,
		              phase: 'available',
		              canUpdate: true,
		              progress: null,
		              forceFresh: true,
		              text: t('forceFresh'),
		            }))
		            return
		          }
		          throw new Error(String(failure.message || failure.code || phase))
		        }
		        const percent = op.progress === null || op.progress === undefined ? undefined : op.progress.percent
		        setUpdate((prev) => ({
		          ...prev,
		          text: t('updating', { progress: typeof percent === 'number' ? ` ${Math.round(percent)}%` : '' }),
		          progress: typeof percent === 'number' ? percent : prev.progress,
		        }))
		      }
		      throw new Error('timeout')
		    } catch (error) {
		      setUpdate((prev) => ({
		        ...prev,
		        phase: 'error',
		        text: t('updateFailed', { detail: error instanceof Error ? error.message : String(error) }),
		        canUpdate: false,
		        progress: null,
		      }))
		    }
		  }

		  /* Silent check once per settings-page mount. */
		  const checkedOnce = React.useRef(false)
		  React.useEffect(() => {
		    if (checkedOnce.current === true) return
		    checkedOnce.current = true
		    void checkUpdate(true)
		  }, [])

		  const rowStyle = {
		    display: 'flex',
		    alignItems: 'center',
		    gap: 12,
		    padding: '10px 14px',
		    borderTop: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.18))',
		  }

		  const rows = entries.map((entry, index) => {
		    const on = current.indexOf(entry.id) < 0
		    return React.createElement(
		      'div',
		      { key: entry.id, style: index === 0 ? Object.assign({}, rowStyle, { borderTop: 'none' }) : rowStyle },
		      React.createElement(
		        'span',
		        { style: { minWidth: 0, flex: 1, display: 'block' } },
		        React.createElement(
		          'span',
		          {
		            style: {
		              display: 'block',
		              fontSize: 14,
		              lineHeight: '22px',
		              color: 'var(--dsw-alias-label-primary, inherit)',
		            },
		          },
		          entry.label,
		          entry.id === PROTECTED_ID
		            ? React.createElement(
		                'span',
		                {
		                  style: {
		                    marginLeft: 8,
		                    fontSize: 11,
		                    lineHeight: '16px',
		                    padding: '0 6px',
		                    borderRadius: 999,
		                    border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.3))',
		                    color: 'var(--dsw-alias-label-tertiary, #888)',
		                  },
		                },
		                'plugin manager',
		              )
		            : null,
		        ),
		        React.createElement(
		          'span',
		          {
		            style: {
		              display: 'block',
		              fontSize: 11,
		              lineHeight: '16px',
		              color: 'var(--dsw-alias-label-tertiary, #888)',
		              fontFamily: 'var(--ds-font-family-code, ui-monospace, monospace)',
		            },
		          },
		          entry.id,
		        ),
		      ),
		      React.createElement(Switch, {
		        checked: on,
		        label: on ? t('hide') : t('show'),
		        onChange: () => {
		          const next = on ? current.concat(entry.id) : current.filter((id) => id !== entry.id)
		          props.commit({ hidden: next })
		        },
		      }),
		    )
		  })

		  const empty =
		    entries.length === 0
		      ? React.createElement(
		          'div',
		          { style: { padding: '16px 14px', fontSize: 13, color: 'var(--dsw-alias-label-tertiary, #888)' } },
		          t('empty'),
		        )
		      : null

		  const updateText = update.text !== '' ? update.text : t('version', { version: update.installed || VERSION })
		  const updateColor =
		    update.phase === 'error'
		      ? 'var(--dsw-alias-state-error-primary, #d33)'
		      : update.phase === 'done'
		        ? 'var(--dsw-alias-state-success-primary, #16a34a)'
		        : 'var(--dsw-alias-label-tertiary, #888)'

		  const updatePanel = React.createElement(
		    'div',
		    { style: { marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.25))' } },
		    React.createElement(
		      'div',
		      { style: { fontSize: 14, fontWeight: 600, lineHeight: '22px', margin: '0 0 8px' } },
		      t('updateTitle'),
		    ),
		    React.createElement(
		      'div',
		      { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
		      React.createElement(
		        'span',
		        { style: { fontSize: 12, color: updateColor, lineHeight: '18px', flex: '1 1 220px' } },
		        updateText,
		      ),
		      React.createElement(
		        'button',
		        {
		          type: 'button',
		          onClick: () => {
		            void checkUpdate(false)
		          },
		          disabled: update.phase === 'checking' || update.phase === 'updating',
		          style: {
		            fontSize: 12,
		            height: 28,
		            padding: '0 12px',
		            borderRadius: 6,
		            border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.3))',
		            background: 'transparent',
		            color: 'var(--dsw-alias-label-primary, inherit)',
		            cursor: 'pointer',
		            opacity: update.phase === 'checking' || update.phase === 'updating' ? 0.5 : 1,
		          },
		        },
		        t('check'),
		      ),
		      update.canUpdate === true
		        ? React.createElement(
		            'button',
		            {
		              type: 'button',
		              onClick: () => {
		                void runUpdate(update.latest)
		              },
		              style: {
		                fontSize: 12,
		                height: 28,
		                padding: '0 12px',
		                borderRadius: 6,
		                border: 'none',
		                background: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
		                color: '#fff',
		                cursor: 'pointer',
		              },
		            },
		            t('updateNow'),
		          )
		        : null,
		    ),
		    typeof update.progress === 'number' && update.phase === 'updating'
		      ? React.createElement(
		          'div',
		          { style: { marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(127,127,127,.2)', overflow: 'hidden' } },
		          React.createElement('div', {
		            style: {
		              height: '100%',
		              width: `${Math.max(0, Math.min(100, update.progress))}%`,
		              background: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
		              transition: 'width .3s ease',
		            },
		          }),
		        )
		      : null,
		    React.createElement(
		      'div',
		      { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 } },
		      React.createElement(
		        'span',
		        { style: { flex: 1, minWidth: 0 } },
		        React.createElement(
		          'span',
		          { style: { display: 'block', fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-primary, inherit)' } },
		          t('autoUpdate'),
		        ),
		        React.createElement(
		          'span',
		          { style: { display: 'block', fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary, #888)' } },
		          t('autoUpdateDesc'),
		        ),
		      ),
		      React.createElement(Switch, {
		        checked: state.autoUpdate === true,
		        label: t('autoUpdate'),
		        onChange: () => {
		          props.commit({ autoUpdate: state.autoUpdate !== true })
		        },
		      }),
		    ),
		  )

		  return React.createElement(
		    'div',
		    { style: { padding: '2px 0 28px' } },
		    React.createElement(
		      'div',
		      { style: { fontSize: 16, fontWeight: 600, lineHeight: '24px', margin: '0 0 4px' } },
		      t('title'),
		    ),
		    React.createElement(
		      'div',
		      {
		        style: {
		          fontSize: 13,
		          lineHeight: '20px',
		          color: 'var(--dsw-alias-label-secondary, #888)',
		          margin: '0 0 6px',
		        },
		      },
		      t('intro'),
		    ),
		    React.createElement(
		      'div',
		      {
		        style: {
		          fontSize: 12,
		          lineHeight: '18px',
		          color: 'var(--dsw-alias-label-tertiary, #888)',
		          margin: '0 0 14px',
		        },
		      },
		      t('count', { total: entries.length, hidden: hiddenHere }),
		    ),
		    React.createElement(
		      'div',
		      {
		        style: {
		          border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.25))',
		          borderRadius: 12,
		          overflow: 'hidden',
		        },
		      },
		      empty,
		      rows,
		    ),
		    React.createElement(
		      'div',
		      { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' } },
		      React.createElement(
		        'button',
		        {
		          type: 'button',
		          onClick: () => {
		            props.commit({ hidden: [] })
		          },
		          disabled: current.length === 0,
		          style: {
		            fontSize: 12,
		            height: 28,
		            padding: '0 12px',
		            borderRadius: 6,
		            border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.3))',
		            background: 'transparent',
		            color: 'var(--dsw-alias-label-primary, inherit)',
		            cursor: current.length === 0 ? 'default' : 'pointer',
		            opacity: current.length === 0 ? 0.5 : 1,
		          },
		        },
		        t('reset'),
		      ),
		      React.createElement(
		        'span',
		        {
		          style: {
		            fontSize: 12,
		            color:
		              notice.tone === 'error'
		                ? 'var(--dsw-alias-state-error-primary, #d33)'
		                : 'var(--dsw-alias-label-tertiary, #888)',
		          },
		        },
		        notice.text,
		      ),
		    ),
		    updatePanel,
		    React.createElement(
		      'div',
		      {
		        style: {
		          fontSize: 12,
		          lineHeight: '18px',
		          color: 'var(--dsw-alias-label-tertiary, #888)',
		          marginTop: 14,
		        },
		      },
		      t('protectedNote'),
		    ),
		  )
		}

		exports.apply = apply
		exports.inject = inject
		exports.__test = { resolveVisibility, resolveLabel, sanitizeIds, applyDom, readEntries, compareVersion }
		return module.exports;
	}
});
