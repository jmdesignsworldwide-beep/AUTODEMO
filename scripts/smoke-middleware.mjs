// Prueba de humo del CANARIO DEL MIDDLEWARE.
//
// El middleware pone la cabecera `x-jmauto-mw: 1` en toda respuesta. Si el
// middleware deja de ejecutarse —por ubicación de archivo (raíz vs src/) o por
// el matcher— la cabecera desaparece SIN lanzar ningún error, y protecciones
// como la revocación instantánea quedan mudas. Esta prueba lo grita.
//
// Uso:
//   node scripts/smoke-middleware.mjs                 # levanta `next start` y prueba
//   SMOKE_BASE_URL=https://... node scripts/...       # prueba contra una URL viva
//
// Requiere que exista un build (`npm run build`) si no se pasa SMOKE_BASE_URL.

import { spawn } from 'node:child_process'

const PORT = process.env.SMOKE_PORT || '3123'
const EXTERNAL = process.env.SMOKE_BASE_URL
const BASE = EXTERNAL || `http://localhost:${PORT}`
const RUTA_PROTEGIDA = '/panel' // página protegida: debe traer la cabecera igual
const CABECERA = 'x-jmauto-mw'

function fallar(msg) {
  console.error(`\n❌ CANARIO DEL MIDDLEWARE: ${msg}`)
  console.error('   El middleware NO está corriendo. Revisa la ubicación del archivo')
  console.error('   (src/middleware.ts con carpeta src/) y el matcher.\n')
  process.exit(1)
}
async function esperarServidor(url, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url + '/login', { redirect: 'manual' })
      if (r.status < 500) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function puertoLibre(url) {
  try {
    await fetch(url + '/login', { redirect: 'manual' })
    return false // algo respondió: el puerto está ocupado
  } catch {
    return true
  }
}

let server = null
try {
  if (!EXTERNAL) {
    if (!(await puertoLibre(BASE))) {
      fallar(`el puerto ${PORT} ya está ocupado — abortando para no probar un servidor viejo. Bájalo o usa SMOKE_PORT.`)
    }
    server = spawn('node_modules/.bin/next', ['start', '-p', PORT], {
      stdio: ['ignore', 'ignore', 'inherit'],
      env: process.env,
    })
    const ok = await esperarServidor(BASE)
    if (!ok) fallar('el servidor no respondió a tiempo.')
  }

  const res = await fetch(BASE + RUTA_PROTEGIDA, { redirect: 'manual' })
  const valor = res.headers.get(CABECERA)
  if (valor !== '1') {
    fallar(`${RUTA_PROTEGIDA} respondió HTTP ${res.status} SIN la cabecera ${CABECERA} (valor: ${valor ?? 'ausente'}).`)
  }
  console.log(`✅ CANARIO OK · ${RUTA_PROTEGIDA} [HTTP ${res.status}] trae ${CABECERA}: ${valor} — el middleware está vivo.`)
} finally {
  if (server) server.kill('SIGKILL')
}
process.exit(0)
