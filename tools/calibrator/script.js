// ---- データ（ビルド時に差し込む） ----
const IMAGES = __IMAGES__
const DATA = __DATA__

const SIZES = { left: { w: 1600, h: 1200 }, front: { w: 1728, h: 1152 }, rear: { w: 1728, h: 1152 } }
const VIEWS = [['left', '左側望'], ['front', '正面'], ['rear', '後面']]
const LAYERS = [['skin', '皮膚'], ['muscle', '筋肉'], ['skeleton', '骨格'], ['organs', '内臓']]
const KINDS = [['part', '部位'], ['area', '大まかな場所']]
const VERTEX_HIT = 15
const SVGNS = 'http://www.w3.org/2000/svg'

const state = {
  view: 'left', layer: 'muscle', kind: 'part', chosen: null,
  shapes: {}, draft: [], vb: null, db: null, ready: false,
}

const $ = (id) => document.getElementById(id)
const svg = $('svg')
const size = () => SIZES[state.view]
const shapesOf = (v) => state.shapes[v] ?? []

// ---- viewBox（ズーム・パン）----
function lockAspect(w) { const s = size(); return { w, h: (w * s.h) / s.w } }
function fit() { const s = size(); return { x: 0, y: 0, w: s.w, h: s.h } }
function clamp(vb) {
  const s = size()
  const a = lockAspect(Math.min(s.w, Math.max(s.w / 12, vb.w)))
  return { x: Math.min(Math.max(0, vb.x), s.w - a.w), y: Math.min(Math.max(0, vb.y), s.h - a.h), w: a.w, h: a.h }
}
function zoomAt(vb, ax, ay, factor) {
  const t = lockAspect(vb.w / factor)
  const rx = (ax - vb.x) / vb.w, ry = (ay - vb.y) / vb.h
  return clamp({ x: ax - rx * t.w, y: ay - ry * t.h, w: t.w, h: t.h })
}
const currentVb = () => state.vb ?? fit()

// マーカーを画面上で一定の CSS px に保つ。ズーム倍率だけやのうてコンテナ実寸も要る。
function markerScale() {
  const vb = currentVb()
  const r = svg.getBoundingClientRect()
  if (!r.width || !r.height) return 1
  const pxPerUnit = Math.min(r.width / vb.w, r.height / vb.h)
  return pxPerUnit > 0 ? 1 / pxPerUnit : 1
}

function toUser(clientX, clientY) {
  const ctm = svg.getScreenCTM()
  if (!ctm) return [0, 0]
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return [p.x, p.y]
}

// ---- 幾何 ----
function centroid(pts) {
  if (pts.length < 3) {
    const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0])
    return [s[0] / pts.length, s[1] / pts.length]
  }
  let a2 = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]
    const c = p[0] * q[1] - q[0] * p[1]
    a2 += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c
  }
  if (a2 === 0) { const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]); return [s[0] / pts.length, s[1] / pts.length] }
  return [cx / (3 * a2), cy / (3 * a2)]
}
const toPath = (pts) => (pts.length ? `M ${pts.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z` : '')

// ---- 候補 ----
function candidates() {
  if (state.kind === 'area') return DATA.areas.map((a) => ({ id: a.id, label: a.nameJa }))
  return DATA.structures
    .filter((s) => s.layer === state.layer && s.views.includes(state.view))
    .map((s) => ({ id: s.id, label: `${s.nameJa}（${s.nameLa}）` }))
}
function targetId() {
  const c = candidates()
  if (state.chosen && c.some((x) => x.id === state.chosen)) return state.chosen
  const done = new Set(shapesOf(state.view).filter((s) => s.kind === state.kind).map((s) => s.id))
  return (c.find((x) => !done.has(x.id)) ?? c[0])?.id ?? ''
}
const nameOf = (id) =>
  DATA.structures.find((s) => s.id === id)?.nameJa ?? DATA.areas.find((a) => a.id === id)?.nameJa ?? id

// ---- 描画 ----
function el(name, attrs) {
  const n = document.createElementNS(SVGNS, name)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  return n
}
function render() {
  const s = size(), vb = currentVb(), k = markerScale()
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
  svg.replaceChildren()
  svg.append(el('rect', { x: 0, y: 0, width: s.w, height: s.h, fill: 'var(--bg)' }))

  const src = IMAGES[`${state.layer === 'muscle' ? 'muscle' : state.layer}_${state.view}`]
  if (src) {
    const img = el('image', { x: 0, y: 0, width: s.w, height: s.h, preserveAspectRatio: 'none' })
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `data:image/jpeg;base64,${src}`)
    img.setAttribute('href', `data:image/jpeg;base64,${src}`)
    svg.append(img)
  }

  for (const sh of shapesOf(state.view)) {
    svg.append(el('path', { d: toPath(sh.points), fill: 'var(--bone)', 'fill-opacity': 0.16, stroke: 'var(--bone)', 'stroke-opacity': 0.75, 'stroke-width': 1.5 * k }))
    const c = centroid(sh.points)
    svg.append(el('circle', { cx: c[0], cy: c[1], r: 4 * k, fill: 'var(--bone)' }))
  }

  if (state.draft.length) {
    const d = state.draft.length > 2 ? toPath(state.draft) : `M ${state.draft.map((p) => `${p[0]} ${p[1]}`).join(' L ')}`
    svg.append(el('path', { d, fill: state.draft.length > 2 ? 'var(--good)' : 'none', 'fill-opacity': 0.2, stroke: 'var(--good)', 'stroke-width': 2 * k, 'stroke-linejoin': 'round' }))
    for (const p of state.draft) svg.append(el('circle', { cx: p[0], cy: p[1], r: 5.5 * k, fill: 'var(--good)' }))
  }
  renderPanel()
}

function renderPanel() {
  const chips = (host, items, active, on) => {
    host.replaceChildren()
    for (const [id, label] of items) {
      const b = document.createElement('button')
      b.textContent = label
      b.setAttribute('aria-pressed', String(id === active))
      b.onclick = () => on(id)
      host.append(b)
    }
  }
  chips($('views'), VIEWS, state.view, (v) => { state.view = v; state.draft = []; state.chosen = null; state.vb = null; render() })
  chips($('layers'), LAYERS, state.layer, (l) => { state.layer = l; state.draft = []; state.chosen = null; render() })
  chips($('kinds'), KINDS, state.kind, (k) => { state.kind = k; state.draft = []; state.chosen = null; render() })

  const sel = $('target'), cur = targetId(), done = new Set(shapesOf(state.view).filter((s) => s.kind === state.kind).map((s) => s.id))
  sel.replaceChildren()
  for (const c of candidates()) {
    const o = document.createElement('option')
    o.value = c.id
    o.textContent = `${done.has(c.id) ? '●' : '○'} ${c.label}`
    sel.append(o)
  }
  sel.value = cur

  $('commit').disabled = state.draft.length < 3 || !cur
  $('commit').textContent = `確定（${state.draft.length}点）`
  $('undo').disabled = state.draft.length === 0

  const list = shapesOf(state.view)
  const expected = state.kind === 'area' ? DATA.areas.length : candidates().length
  const placed = list.filter((s) => s.kind === state.kind).length
  $('count').textContent = `この向きで確定済み ${list.length} 件（今の絞り込みでは ${placed} / ${expected}、未配置 ${Math.max(0, expected - placed)} 件）`

  const ul = $('list')
  ul.replaceChildren()
  for (const sh of list) {
    const li = document.createElement('li')
    const k = document.createElement('span'); k.className = 'k'; k.textContent = sh.kind === 'area' ? '場所' : '部位'
    const n = document.createElement('span'); n.className = 'n'; n.textContent = nameOf(sh.id)
    const c = document.createElement('span'); c.className = 'c'; c.textContent = `${sh.points.length}点`
    const b = document.createElement('button'); b.textContent = '削除'
    b.onclick = () => { state.shapes[state.view] = list.filter((x) => x !== sh); save(); render() }
    li.append(k, n, c, b); ul.append(li)
  }
  $('banner').textContent = IMAGES[`${state.layer}_${state.view}`] ? '' : 'この層の図はまだありません'
}

// ---- 保存（artifact db）----
function msg(text, isError) {
  const p = $('msg')
  p.textContent = text
  p.className = isError ? 'note err' : 'note'
  p.hidden = !text
}
let saveTimer = null
function save() {
  if (!state.db) { $('sync').textContent = 'ローカルのみ'; return }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      $('sync').textContent = '保存中…'
      await state.db.doc(`regions/${state.view}`).set({
        view: state.view,
        size: size(),
        shapes: shapesOf(state.view),
        updatedAt: new Date().toISOString(),
      })
      $('sync').textContent = '保存済み'
    } catch (e) {
      $('sync').textContent = '保存できず'
      msg(`保存でけへんかった（${e?.code ?? 'unknown'}）。JSON をコピーして手元に残してください。`, true)
    }
  }, 400)
}

// ---- 入力 ----
const pointers = new Map()
let lastPinch = null
let moved = 0

svg.addEventListener('pointerdown', (e) => {
  svg.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) moved = 0
  lastPinch = null
})
svg.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y)
  const list = [...pointers.values()]
  if (list.length >= 2) {
    const [a, b] = list
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const mid = toUser((a.x + b.x) / 2, (a.y + b.y) / 2)
    if (lastPinch && lastPinch > 0) state.vb = zoomAt(currentVb(), mid[0], mid[1], dist / lastPinch)
    lastPinch = dist
    render()
    return
  }
  const vb = currentVb()
  const wpx = svg.getBoundingClientRect().width || 1
  state.vb = clamp({ ...vb, x: vb.x - ((e.clientX - prev.x) * vb.w) / wpx, y: vb.y - ((e.clientY - prev.y) * vb.w) / wpx })
  render()
})
function endPointer(e) {
  const wasSingle = pointers.size === 1
  pointers.delete(e.pointerId)
  if (pointers.size < 2) lastPinch = null
  if (svg.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId)
  if (!wasSingle || moved > 8) return
  const [x, y] = toUser(e.clientX, e.clientY)
  const k = markerScale()
  const near = state.draft.findIndex((v) => Math.hypot(v[0] - x, v[1] - y) < VERTEX_HIT * k)
  state.draft = near >= 0 ? state.draft.filter((_, i) => i !== near) : [...state.draft, [Math.round(x), Math.round(y)]]
  render()
}
svg.addEventListener('pointerup', endPointer)
svg.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); lastPinch = null })
svg.addEventListener('wheel', (e) => {
  e.preventDefault()
  const [x, y] = toUser(e.clientX, e.clientY)
  state.vb = zoomAt(currentVb(), x, y, e.deltaY < 0 ? 1.15 : 1 / 1.15)
  render()
}, { passive: false })

$('zin').onclick = () => { const vb = currentVb(); state.vb = zoomAt(vb, vb.x + vb.w / 2, vb.y + vb.h / 2, 1.6); render() }
$('zout').onclick = () => { const vb = currentVb(); state.vb = zoomAt(vb, vb.x + vb.w / 2, vb.y + vb.h / 2, 1 / 1.6); render() }
$('zreset').onclick = () => { state.vb = null; render() }
$('undo').onclick = () => { state.draft = state.draft.slice(0, -1); render() }
$('target').onchange = (e) => { state.chosen = e.target.value; render() }
$('commit').onclick = () => {
  const id = targetId()
  if (state.draft.length < 3 || !id) return
  const list = shapesOf(state.view).filter((s) => !(s.kind === state.kind && s.id === id))
  state.shapes[state.view] = [...list, { kind: state.kind, id, points: state.draft }]
  state.draft = []
  state.chosen = null
  save()
  msg(`${nameOf(id)} を確定した。`, false)
  render()
}
$('copy').onclick = async () => {
  const list = shapesOf(state.view)
  const json = JSON.stringify({
    view: state.view,
    size: size(),
    areas: list.filter((s) => s.kind === 'area').map((s) => ({ id: s.id, nameJa: nameOf(s.id), points: s.points })),
    parts: list.filter((s) => s.kind === 'part').map((s) => {
      const st = DATA.structures.find((x) => x.id === s.id)
      const o = { id: s.id, layer: st?.layer ?? state.layer }
      if (st?.depth) o.depth = st.depth
      o.points = s.points
      o.labelAt = centroid(s.points).map((n) => Math.round(n))
      return o
    }),
  }, null, 2)
  try {
    await navigator.clipboard.writeText(json)
    msg(`${state.view}.json をコピーした（部位 ${list.filter((s) => s.kind === 'part').length} / 場所 ${list.filter((s) => s.kind === 'area').length}）。`, false)
  } catch {
    msg('コピーでけへんかった。保存はされとるので、Claude 側から読み出せる。', true)
  }
}
new ResizeObserver(() => render()).observe($('stage'))

// ---- 起動 ----
render()
;(async () => {
  const db = await window.claude?.use?.('db')
  if (!db) { $('sync').textContent = 'この端末では保存でけへん'; return }
  state.db = db
  for (const [v] of VIEWS) {
    db.collection('regions').doc(v).onSnapshot(
      (doc) => {
        const d = doc?.data?.() ?? doc?.data ?? null
        if (d && Array.isArray(d.shapes)) {
          state.shapes[v] = d.shapes
          $('sync').textContent = '同期中'
          render()
        }
      },
      () => { $('sync').textContent = '同期でけへん' },
    )
  }
  $('sync').textContent = '同期中'
})()
