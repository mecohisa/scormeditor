#!/usr/bin/env node
/**
 * Consulta de la nube de SCORMEditor desde la terminal — SOLO LECTURA.
 *
 * Entra con una cuenta propia (email + contraseña) dada de alta a mano en
 * Supabase y con rol `viewer` en las carpetas que deba ver. La barrera real
 * es RLS en el servidor: aunque este script tuviera un fallo, una cuenta
 * `viewer` no puede subir ni borrar nada. Además, el script no contiene
 * ninguna llamada de escritura (ni insert/update/delete ni upload).
 *
 * Credenciales en `.env` (nunca en el chat ni en la línea de órdenes):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (ya existen, las usa el editor)
 *   NUBE_EMAIL, NUBE_PASSWORD                   (sin prefijo VITE_: no llegan al editor)
 *
 * Descargas en `.nube/` (ignorada por git: los cursos son privados).
 *
 * Uso:
 *   node scripts/nube/nube.mjs yo
 *   node scripts/nube/nube.mjs listar [texto]
 *   node scripts/nube/nube.mjs versiones "<título>"
 *   node scripts/nube/nube.mjs descargar "<título>" [nº versión]
 *   node scripts/nube/nube.mjs diff "<título>" [vA] [vB]        (por defecto: penúltima → última)
 *   node scripts/nube/nube.mjs diff "<título>" --local <fichero.scormproj> [vB]
 *        (qué cambia la versión de la nube respecto a un .scormproj local)
 */
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(RAIZ, '.nube')
const SCHEMA = 'scormeditor'
const BUCKET = 'scormeditor-projects'

// ---------------------------------------------------------------- entorno
function leerEnv() {
  const env = { ...process.env }
  const f = join(RAIZ, '.env')
  if (existsSync(f)) {
    for (const linea of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  return env
}

function fallo(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
}

async function conectar() {
  const env = leerEnv()
  const faltan = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'NUBE_EMAIL', 'NUBE_PASSWORD'].filter((k) => !env[k])
  if (faltan.length) fallo(`Faltan en .env: ${faltan.join(', ')}`)
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.auth.signInWithPassword({ email: env.NUBE_EMAIL, password: env.NUBE_PASSWORD })
  // Nunca se imprime la contraseña; el mensaje de Supabase no la incluye.
  if (error) fallo(`No se pudo iniciar sesión: ${error.message}`)
  return { sb, user: data.user }
}

async function q(promesa) {
  const { data, error } = await promesa
  if (error) fallo(error.message)
  return data
}

// ---------------------------------------------------------------- utilidades
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const kb = (n) => (n == null ? '—' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB')
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

async function contexto(sb) {
  const orgs = await q(sb.from('organizations').select('*').order('name'))
  const carpetas = await q(sb.from('folders').select('*'))
  const docs = await q(sb.from('documents').select('*').is('deleted_at', null).order('title'))
  // Emails de los autores (solo si la cuenta puede listar miembros; si no, se muestra el id corto).
  const emails = {}
  for (const o of orgs) {
    const { data } = await sb.rpc('list_members', { p_org_id: o.id })
    for (const m of data ?? []) emails[m.user_id] = m.email
  }
  return { orgs, carpetas, docs, emails }
}

function quien(ctx, id) {
  return id ? ctx.emails[id] ?? id.slice(0, 8) : '—'
}

function rutaCarpeta(ctx, folderId) {
  const partes = []
  let f = ctx.carpetas.find((c) => c.id === folderId)
  while (f) {
    partes.unshift(f.name)
    f = ctx.carpetas.find((c) => c.id === f.parent_folder_id)
  }
  return partes.join(' / ') || '(sin carpeta)'
}

function buscarDoc(ctx, texto) {
  if (!texto) fallo('Indica el título (o parte) del documento.')
  const t = norm(texto)
  const exactos = ctx.docs.filter((d) => norm(d.title) === t)
  const hits = exactos.length ? exactos : ctx.docs.filter((d) => norm(d.title).includes(t) || norm(d.course_slug).includes(t))
  if (!hits.length) fallo(`Ningún documento contiene «${texto}».`)
  if (hits.length > 1) {
    console.error(`Hay ${hits.length} documentos que contienen «${texto}»; afina el texto:`)
    for (const d of hits) console.error(`  · ${d.title}  [${rutaCarpeta(ctx, d.folder_id)}]`)
    process.exit(1)
  }
  return hits[0]
}

async function versiones(sb, docId) {
  return q(sb.from('document_versions').select('*').eq('document_id', docId).order('version_no', { ascending: true }))
}

async function bajarVersion(sb, doc, v) {
  const dir = join(CACHE, doc.course_slug || doc.id)
  const fichero = join(dir, `v${v.version_no}.scormproj`)
  if (!existsSync(fichero)) {
    const { data, error } = await sb.storage.from(BUCKET).download(v.storage_path)
    if (error) fallo(`No se pudo descargar la versión ${v.version_no}: ${error.message}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(fichero, Buffer.from(await data.arrayBuffer()))
  }
  return fichero
}

async function abrirProyecto(fichero) {
  const zip = await JSZip.loadAsync(readFileSync(fichero))
  const cj = zip.file('course.json')
  if (!cj) fallo(`${fichero} no tiene course.json`)
  const course = JSON.parse(await cj.async('string'))
  const assets = {}
  for (const [nombre, f] of Object.entries(zip.files)) {
    if (!f.dir && nombre !== 'course.json') assets[nombre] = (await f.async('uint8array')).length
  }
  return { course, assets }
}

// ---------------------------------------------------------------- diff
/** Todas las pantallas con su ubicación legible, por id. */
function pantallas(course) {
  const out = new Map()
  let orden = 0
  const add = (lista, donde) => {
    for (const s of lista ?? []) out.set(s.id, { s, donde, orden: orden++ })
  }
  add(course.intro_screens, 'Inicio')
  for (const m of course.modules ?? []) {
    add(m.screens, m.title)
    for (const u of m.units ?? []) add(u.screens, `${m.title} › ${u.title}`)
    add(m.closing_screens, `${m.title} (cierre)`)
  }
  add(course.closing_screens, 'Cierre')
  return out
}

/** Aplana un objeto a { 'a.b[2].c': hoja }. */
function aplanar(obj, pre = '', out = {}) {
  if (obj === null || typeof obj !== 'object') {
    out[pre] = obj
    return out
  }
  if (Array.isArray(obj)) {
    if (!obj.length) out[pre] = '[]'
    obj.forEach((v, i) => aplanar(v, `${pre}[${i}]`, out))
    return out
  }
  const claves = Object.keys(obj)
  if (!claves.length) out[pre] = '{}'
  for (const k of claves) aplanar(obj[k], pre ? `${pre}.${k}` : k, out)
  return out
}

/** Subsecuencia común más larga de dos listas. */
function lcs(A, B) {
  const L = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []
  for (let i = 0, j = 0; i < A.length && j < B.length; ) {
    if (A[i] === B[j]) {
      out.push(A[i])
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  return out
}

/** Diff de líneas (LCS) con contexto mínimo: solo las líneas que cambian. */
function diffLineas(a, b) {
  const A = String(a ?? '').split('\n')
  const B = String(b ?? '').split('\n')
  const n = A.length
  const m = B.length
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const res = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      i++
      j++
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) res.push('      + ' + B[j++])
    else res.push('      - ' + A[i++])
  }
  return res
}

const corto = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s === undefined ? '(nada)' : s.length > 160 ? s.slice(0, 157) + '…' : s
}

function diffCampos(a, b, ignorar = () => false) {
  const fa = aplanar(a)
  const fb = aplanar(b)
  const lineas = []
  for (const k of [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort()) {
    if (ignorar(k) || fa[k] === fb[k]) continue
    const multilinea = (typeof fa[k] === 'string' && fa[k].includes('\n')) || (typeof fb[k] === 'string' && fb[k].includes('\n'))
    lineas.push(`    · ${k}`)
    if (multilinea) lineas.push(...diffLineas(fa[k], fb[k]))
    else lineas.push(`      - ${corto(fa[k])}`, `      + ${corto(fb[k])}`)
  }
  return lineas
}

function informeDiff(A, B, etiquetaA, etiquetaB) {
  console.log(`\nDiferencias: ${etiquetaA}  →  ${etiquetaB}\n`)
  const pa = pantallas(A.course)
  const pb = pantallas(B.course)
  let cambios = 0

  const nuevas = [...pb.keys()].filter((id) => !pa.has(id))
  const quitadas = [...pa.keys()].filter((id) => !pb.has(id))
  if (nuevas.length) {
    console.log('PANTALLAS NUEVAS')
    for (const id of nuevas) console.log(`  + «${pb.get(id).s.title}»  [${pb.get(id).donde}]`)
    cambios += nuevas.length
  }
  if (quitadas.length) {
    console.log('PANTALLAS QUITADAS')
    for (const id of quitadas) console.log(`  - «${pa.get(id).s.title}»  [${pa.get(id).donde}]`)
    cambios += quitadas.length
  }

  const comunes = [...pb.keys()].filter((id) => pa.has(id))
  // Movidas: cambia de bloque, o queda fuera de la subsecuencia común más larga
  // (así mover una pantalla marca solo esa, no todas las que van detrás).
  const ordenA = comunes.slice().sort((x, y) => pa.get(x).orden - pa.get(y).orden)
  const quietas = new Set(lcs(ordenA, comunes))
  const movidas = comunes.filter((id) => pa.get(id).donde !== pb.get(id).donde || !quietas.has(id))
  if (movidas.length) {
    console.log('PANTALLAS MOVIDAS O REORDENADAS')
    for (const id of movidas) console.log(`  ↕ «${pb.get(id).s.title}»  [${pa.get(id).donde} → ${pb.get(id).donde}]`)
    cambios += movidas.length
  }

  const modificadas = []
  for (const id of comunes) {
    const l = diffCampos(pa.get(id).s, pb.get(id).s)
    if (l.length) modificadas.push([id, l])
  }
  if (modificadas.length) {
    console.log('PANTALLAS MODIFICADAS')
    for (const [id, l] of modificadas) {
      console.log(`  ~ «${pb.get(id).s.title}»  [${pb.get(id).donde}]`)
      console.log(l.join('\n'))
    }
    cambios += modificadas.length
  }

  // Resto del curso (ajustes, glosario, bibliografía, evaluaciones…), sin las pantallas.
  const sinPantallas = (c) => {
    const { intro_screens, closing_screens, modules, ...resto } = c
    return { ...resto, modules: (modules ?? []).map((m) => ({ id: m.id, title: m.title, units: (m.units ?? []).map((u) => ({ id: u.id, title: u.title, summary: u.summary })) })) }
  }
  const resto = diffCampos(sinPantallas(A.course), sinPantallas(B.course))
  if (resto.length) {
    console.log('RESTO DEL CURSO (ajustes, estructura, glosario, bibliografía, evaluación…)')
    console.log(resto.join('\n'))
    cambios++
  }

  const recursos = []
  for (const k of [...new Set([...Object.keys(A.assets), ...Object.keys(B.assets)])].sort()) {
    if (!(k in A.assets)) recursos.push(`  + ${k} (${kb(B.assets[k])})`)
    else if (!(k in B.assets)) recursos.push(`  - ${k}`)
    else if (A.assets[k] !== B.assets[k]) recursos.push(`  ~ ${k} (${kb(A.assets[k])} → ${kb(B.assets[k])})`)
  }
  if (recursos.length) {
    console.log('RECURSOS (imágenes, audio, adjuntos)')
    console.log(recursos.join('\n'))
    cambios++
  }

  if (!cambios) console.log('Sin diferencias de contenido.')
}

// ---------------------------------------------------------------- órdenes
const [orden, ...args] = process.argv.slice(2)

async function main() {
  if (!orden || orden === 'ayuda' || orden === '-h') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/Uso:\n([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''))
    return
  }
  const { sb, user } = await conectar()

  if (orden === 'yo') {
    console.log(`Sesión iniciada como ${user.email}`)
    const mem = await q(sb.from('memberships').select('org_id, role').eq('user_id', user.id))
    const orgs = await q(sb.from('organizations').select('id, name'))
    for (const m of mem) console.log(`  organización «${orgs.find((o) => o.id === m.org_id)?.name ?? m.org_id}»: ${m.role}`)
    const acc = await q(sb.from('folder_access').select('folder_id, role').eq('user_id', user.id))
    const carpetas = await q(sb.from('folders').select('id, name'))
    for (const a of acc) console.log(`  carpeta «${carpetas.find((c) => c.id === a.folder_id)?.name ?? a.folder_id}»: ${a.role}`)
    if (!mem.length) console.log('  (sin organizaciones: pide que te inviten)')
    return
  }

  const ctx = await contexto(sb)

  if (orden === 'listar') {
    const filtro = norm(args.join(' '))
    for (const o of ctx.orgs) {
      const docs = ctx.docs.filter((d) => d.org_id === o.id && (!filtro || norm(d.title).includes(filtro) || norm(rutaCarpeta(ctx, d.folder_id)).includes(filtro)))
      if (!docs.length) continue
      console.log(`\n■ ${o.name}`)
      const porCarpeta = new Map()
      for (const d of docs) {
        const r = rutaCarpeta(ctx, d.folder_id)
        if (!porCarpeta.has(r)) porCarpeta.set(r, [])
        porCarpeta.get(r).push(d)
      }
      for (const [r, ds] of [...porCarpeta].sort()) {
        console.log(`  ▸ ${r}`)
        for (const d of ds) {
          const vs = await versiones(sb, d.id)
          const u = vs.at(-1)
          console.log(`     · ${d.title}  — v${u?.version_no ?? '?'} · ${fecha(u?.created_at)} · ${quien(ctx, u?.created_by)} · ${kb(u?.size_bytes)}`)
        }
      }
    }
    return
  }

  const doc = buscarDoc(ctx, args[0])
  const vs = await versiones(sb, doc.id)
  if (!vs.length) fallo('El documento no tiene versiones.')
  const porNumero = (n) => vs.find((v) => v.version_no === Number(n)) ?? fallo(`No existe la versión ${n} (hay ${vs[0].version_no}–${vs.at(-1).version_no}).`)

  if (orden === 'versiones') {
    console.log(`${doc.title}  [${rutaCarpeta(ctx, doc.folder_id)}]`)
    for (const v of vs) console.log(`  v${v.version_no}  ${fecha(v.created_at)}  ${quien(ctx, v.created_by)}  ${kb(v.size_bytes)}`)
    return
  }

  if (orden === 'descargar') {
    const v = args[1] ? porNumero(args[1]) : vs.at(-1)
    console.log(`✓ ${await bajarVersion(sb, doc, v)}`)
    return
  }

  if (orden === 'diff') {
    const iLocal = args.indexOf('--local')
    if (iLocal >= 0) {
      const local = resolve(args[iLocal + 1] ?? fallo('Falta el fichero tras --local.'))
      if (!existsSync(local)) fallo(`No existe ${local}`)
      const resto = args.slice(1).filter((_, k) => k + 1 !== iLocal && k + 1 !== iLocal + 1)
      const vB = resto[0] ? porNumero(resto[0]) : vs.at(-1)
      const B = await abrirProyecto(await bajarVersion(sb, doc, vB))
      informeDiff(await abrirProyecto(local), B, `local ${local.replace(RAIZ, '.')}`, `nube v${vB.version_no} (${fecha(vB.created_at)}, ${quien(ctx, vB.created_by)})`)
      return
    }
    if (vs.length < 2 && !args[1]) fallo('Solo hay una versión; usa --local para comparar con un fichero.')
    const vA = args[1] ? porNumero(args[1]) : vs.at(-2)
    const vB = args[2] ? porNumero(args[2]) : vs.at(-1)
    const A = await abrirProyecto(await bajarVersion(sb, doc, vA))
    const B = await abrirProyecto(await bajarVersion(sb, doc, vB))
    informeDiff(A, B, `v${vA.version_no} (${fecha(vA.created_at)}, ${quien(ctx, vA.created_by)})`, `v${vB.version_no} (${fecha(vB.created_at)}, ${quien(ctx, vB.created_by)})`)
    return
  }

  fallo(`Orden desconocida: ${orden}. Usa «ayuda».`)
}

main().catch((e) => fallo(e?.message ?? String(e)))
