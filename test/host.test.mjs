/**
 * Host-half tests: the state file, the sanitizer, and the fenced route.
 * Runs on plain `node --test` with no dependencies.
 */

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, test } from 'node:test'

const dir = await mkdtemp(join(tmpdir(), 'dsh-sidebar-entries-'))
process.env.DSH_SIDEBAR_ENTRIES_FILE = join(dir, 'state.json')

const {
  ROUTES,
  apply,
  handleState,
  readState,
  rejectionOf,
  sanitizeIds,
  stateFile,
  writeState,
} = await import('../src/host.js')

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

beforeEach(async () => {
  await rm(process.env.DSH_SIDEBAR_ENTRIES_FILE, { force: true })
})

/** One response sink that records status, headers and body. */
function makeResponse() {
  const headers = {}
  return {
    statusCode: 0,
    body: '',
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    end(chunk) {
      this.body = chunk === undefined ? '' : String(chunk)
    },
    json() {
      return JSON.parse(this.body)
    },
    headers,
  }
}

/** One request that is both a readable stream and a header bag. */
function makeRequest({ method = 'GET', body, host = '127.0.0.1:57000', remoteAddress = '127.0.0.1', headers = {} } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(body, 'utf8')]
  return {
    method,
    url: ROUTES.state,
    headers: Object.assign({ host }, headers),
    socket: { remoteAddress },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

/** A cordis-ish context: `effect` runs immediately, services resolve by name and by property. */
function makeContext(found) {
  const webServer = {
    register(route) {
      found.push(route)
      return () => {}
    },
  }
  return {
    webServer,
    get(name) {
      return name === 'webServer' ? webServer : undefined
    },
    effect(factory) {
      found.push(factory())
    },
  }
}

test('stateFile honours the environment override', () => {
  assert.equal(stateFile(), process.env.DSH_SIDEBAR_ENTRIES_FILE)
})

test('sanitizeIds drops blanks, duplicates and non-strings', () => {
  assert.deepEqual(sanitizeIds(['a', ' a ', '', 3, null, 'b', 'b']), ['a', 'b'])
  assert.deepEqual(sanitizeIds('nope'), [])
  assert.deepEqual(sanitizeIds(undefined), [])
})

test('a missing state file reads as empty + auto-update off', async () => {
  assert.deepEqual(await readState(), { hidden: [], autoUpdate: false })
})

test('writeState merges fields and round-trips', async () => {
  assert.deepEqual(await writeState({ hidden: ['schedules', 'dsh-market'] }), {
    hidden: ['schedules', 'dsh-market'],
    autoUpdate: false,
  })
  assert.deepEqual(await writeState({ autoUpdate: true }), {
    hidden: ['schedules', 'dsh-market'],
    autoUpdate: true,
  })
  const raw = JSON.parse(await readFile(process.env.DSH_SIDEBAR_ENTRIES_FILE, 'utf8'))
  assert.equal(raw.version, 2)
  assert.deepEqual(raw.hidden, ['schedules', 'dsh-market'])
  assert.equal(raw.autoUpdate, true)
})

test('a corrupted state file reads as defaults instead of throwing', async () => {
  await writeFile(process.env.DSH_SIDEBAR_ENTRIES_FILE, '{not json', 'utf8')
  assert.deepEqual(await readState(), { hidden: [], autoUpdate: false })
})

test('apply registers exactly one exact-path route under the documented path', () => {
  const found = []
  apply(makeContext(found))
  const routes = found.filter((entry) => entry && typeof entry === 'object' && 'path' in entry)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, ROUTES.state)
  assert.equal(routes[0].kind, 'exact')
})

test('GET serves the stored state', async () => {
  await writeState({ hidden: ['plugins-x'], autoUpdate: true })
  const res = makeResponse()
  await handleState({}, makeRequest(), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true, hidden: ['plugins-x'], autoUpdate: true })
  assert.equal(res.headers['cache-control'], 'no-store')
})

test('POST replaces hidden and answers with the full state', async () => {
  const res = makeResponse()
  const body = JSON.stringify({ hidden: ['schedules', 'schedules', ' dsh-market '] })
  await handleState({}, makeRequest({ method: 'POST', body }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true, hidden: ['schedules', 'dsh-market'], autoUpdate: false })
  assert.deepEqual(await readState(), { hidden: ['schedules', 'dsh-market'], autoUpdate: false })
})

test('POST can change autoUpdate alone without touching hidden', async () => {
  await writeState({ hidden: ['a'] })
  const res = makeResponse()
  await handleState({}, makeRequest({ method: 'POST', body: JSON.stringify({ autoUpdate: true }) }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(await readState(), { hidden: ['a'], autoUpdate: true })
})

test('POST rejects an empty or malformed payload', async () => {
  for (const body of [JSON.stringify({}), JSON.stringify({ hidden: 'x' }), JSON.stringify({ autoUpdate: 'yes' })]) {
    const res = makeResponse()
    await handleState({}, makeRequest({ method: 'POST', body }), res)
    assert.equal(res.statusCode, 400, body)
  }
})

test('POST rejects malformed JSON', async () => {
  const res = makeResponse()
  await handleState({}, makeRequest({ method: 'POST', body: '{' }), res)
  assert.equal(res.statusCode, 400)
})

test('an unsupported method answers 405 with an Allow header', async () => {
  const res = makeResponse()
  await handleState({}, makeRequest({ method: 'PUT' }), res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.allow, 'GET, POST')
})

test('a cross-origin browser request is refused', async () => {
  const res = makeResponse()
  await handleState({}, makeRequest({ headers: { origin: 'http://evil.example' } }), res)
  assert.equal(res.statusCode, 403)
})

test('a proxied request is refused', async () => {
  const res = makeResponse()
  await handleState({}, makeRequest({ headers: { 'x-forwarded-for': '10.0.0.1' } }), res)
  assert.equal(res.statusCode, 403)
})

test('a non-loopback socket is refused and a loopback one allowed', () => {
  assert.equal(rejectionOf({}, makeRequest({ remoteAddress: '192.168.1.9' })), 403)
  assert.equal(rejectionOf({}, makeRequest()), undefined)
})

test('the Host admission service wins when it exists', () => {
  const ctx = { get: () => ({ requestRejection: () => 401 }) }
  assert.equal(rejectionOf(ctx, makeRequest()), 401)
  const open = { get: () => ({ requestRejection: () => undefined }) }
  assert.equal(rejectionOf(open, makeRequest({ remoteAddress: '192.168.1.9' })), undefined)
})
