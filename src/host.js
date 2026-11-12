/**
 * dsh-sidebar-entries — host half.
 *
 * Owns exactly one thing: the persisted list of sidebar entry ids the user has
 * hidden, exposed to the browser half over a fenced, loopback-only route pair.
 *
 * Why a host route instead of `localStorage`: the DSH web GUI is served on a
 * port that changes between launches, so an origin-scoped store would forget
 * the choice on every restart. The file below survives restarts and is shared
 * by every browser pointed at this Host.
 *
 * The file is plain JSON so it can be inspected, backed up or repaired by hand:
 *   ~/.dsh/sidebar-entries.json   (override: DSH_SIDEBAR_ENTRIES_FILE)
 *
 * Nothing here renders. All visibility work happens in `lib/client.js`.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Route family served to the browser half (absolute; the client uses document-relative URLs). */
export const ROUTES = {
  state: '/api/dsh-sidebar-entries/state',
}

/** Loader slug reported to the Host. */
export const name = 'sidebar-entries'

/** Largest accepted request body (the payload is a short id list). */
const MAX_BODY_BYTES = 64 * 1024

/** Longest accepted entry id. */
const MAX_ID_LENGTH = 120

/** Most ids one payload may carry. */
const MAX_IDS = 200

/** Services this plugin needs from the Host. */
export const inject = ['webServer']

/**
 * Absolute path of the state file.
 * @returns the resolved file path.
 */
export function stateFile() {
  const override = process.env.DSH_SIDEBAR_ENTRIES_FILE
  if (typeof override === 'string' && override.trim() !== '') return override.trim()
  return join(homedir(), '.dsh', 'sidebar-entries.json')
}

/**
 * Keep only well-formed ids, de-duplicated and in first-seen order.
 * @param value - candidate list from disk or the wire.
 * @returns the sanitized id list (never throws).
 */
export function sanitizeIds(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (id === '' || id.length > MAX_ID_LENGTH) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= MAX_IDS) break
  }
  return out
}

/**
 * Read the stored state. A missing or malformed file reads as "nothing hidden,
 * auto-update off", so a corrupted state can never lock the user out of the
 * sidebar (or silently start installing updates).
 * @returns {{hidden: string[], autoUpdate: boolean}} the stored state.
 */
export async function readState() {
  try {
    const raw = await readFile(stateFile(), 'utf8')
    const parsed = JSON.parse(raw)
    return {
      hidden: sanitizeIds(parsed?.hidden),
      autoUpdate: parsed?.autoUpdate === true,
    }
  } catch {
    return { hidden: [], autoUpdate: false }
  }
}

/**
 * Merge a patch into the stored state and persist it atomically (temp sibling +
 * rename), so a crash mid write never leaves a half-written state file behind.
 * Omitted fields keep their stored value.
 * @param {{hidden?: string[], autoUpdate?: boolean}} patch - fields to replace.
 * @returns {{hidden: string[], autoUpdate: boolean}} the state that was written.
 */
export async function writeState(patch) {
  const current = await readState()
  const next = {
    hidden: patch?.hidden !== undefined ? sanitizeIds(patch.hidden) : current.hidden,
    autoUpdate: patch?.autoUpdate !== undefined ? patch.autoUpdate === true : current.autoUpdate,
  }
  const file = stateFile()
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temp, `${JSON.stringify({ version: 2, ...next }, null, 2)}\n`, 'utf8')
  await rename(temp, file)
  return next
}

/**
 * Whether this request must be refused.
 *
 * Prefers the Host's own admission service (`connection.requestRejection`,
 * DSH 0.2.0+), which already encodes the deployment's LAN / pairing policy.
 * Deployments without it fall back to a strict loopback fence: loopback socket,
 * loopback Host header, no forwarding headers, and no cross-site browser
 * marker.
 *
 * @param ctx - Host plugin context.
 * @param req - incoming HTTP request.
 * @returns 401/403 when refused, otherwise undefined.
 */
export function rejectionOf(ctx, req) {
  try {
    const connection = ctx.get?.('connection', false)
    if (connection !== undefined && connection !== null && typeof connection.requestRejection === 'function') {
      const verdict = connection.requestRejection(req)
      if (verdict === 401 || verdict === 403) return verdict
      return undefined
    }
  } catch {
    // Fall through to the loopback fence; admission must never throw.
  }
  return isLoopbackRequest(req) ? undefined : 403
}

/** Whether a socket address is in the IPv4 127/8 or ::1 range. */
function isLoopbackAddress(address) {
  if (typeof address !== 'string' || address === '') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isLoopbackV4(normalized.slice(7))
  return isLoopbackV4(normalized)
}

/** Whether a dotted IPv4 name is 127/8. */
function isLoopbackV4(value) {
  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== '127') return false
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Whether a Host header names a loopback authority. */
function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isLoopbackV4(hostname)
}

/** Strict loopback fence used when the Host exposes no admission service. */
function isLoopbackRequest(request) {
  const socket = request?.socket
  if (!socket || !isLoopbackAddress(socket.remoteAddress)) return false
  const headers = request.headers ?? {}
  if (headers['cf-connecting-ip'] !== undefined || headers['x-forwarded-for'] !== undefined) return false
  if (headers['sec-fetch-site'] === 'cross-site') return false
  const host = headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  const origin = headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** Write a JSON response. */
function writeJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader?.('content-type', 'application/json; charset=utf-8')
  res.setHeader?.('cache-control', 'no-store')
  res.setHeader?.('content-length', Buffer.byteLength(body))
  res.end(body)
}

/**
 * Read a JSON body with a hard size cap.
 * @param req - incoming request.
 * @returns the parsed value, or undefined when the body is empty.
 */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      const error = new Error('request body too large')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (chunks.length === 0) return undefined
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('request body is not valid JSON')
    error.status = 400
    throw error
  }
}

/**
 * Handle one request to the state route: GET reads, POST replaces.
 * @param ctx - Host plugin context (unused beyond symmetry).
 * @param req - incoming request.
 * @param res - response sink.
 */
export async function handleState(ctx, req, res) {
  const rejection = rejectionOf(ctx, req)
  if (rejection !== undefined) {
    writeJson(res, rejection, { ok: false, error: rejection === 401 ? 'unauthorized' : 'forbidden' })
    return
  }
  if (req.method === 'GET') {
    const state = await readState()
    writeJson(res, 200, { ok: true, hidden: state.hidden, autoUpdate: state.autoUpdate })
    return
  }
  if (req.method !== 'POST') {
    res.setHeader?.('allow', 'GET, POST')
    writeJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }
  try {
    const payload = await readJsonBody(req)
    const hasHidden = payload !== undefined && payload !== null && Object.prototype.hasOwnProperty.call(payload, 'hidden')
    const hasAutoUpdate = payload !== undefined && payload !== null && Object.prototype.hasOwnProperty.call(payload, 'autoUpdate')
    if (!hasHidden && !hasAutoUpdate) {
      writeJson(res, 400, { ok: false, error: 'body must carry "hidden" and/or "autoUpdate"' })
      return
    }
    if (hasHidden && !Array.isArray(payload.hidden)) {
      writeJson(res, 400, { ok: false, error: '"hidden" must be a string array' })
      return
    }
    if (hasAutoUpdate && typeof payload.autoUpdate !== 'boolean') {
      writeJson(res, 400, { ok: false, error: '"autoUpdate" must be a boolean' })
      return
    }
    const state = await writeState({
      hidden: hasHidden ? payload.hidden : undefined,
      autoUpdate: hasAutoUpdate ? payload.autoUpdate : undefined,
    })
    writeJson(res, 200, { ok: true, hidden: state.hidden, autoUpdate: state.autoUpdate })
  } catch (error) {
    writeJson(res, error?.status ?? 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

/**
 * Register the state route.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: ROUTES.state,
        handler: (req, res) => handleState(ctx, req, res),
      }),
    'dsh-sidebar-entries: state route',
  )
}
