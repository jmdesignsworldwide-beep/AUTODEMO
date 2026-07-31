// Catálogo de giros con su ACENTO propio (canales RGB "R G B").
// El acento no es decoración: es la modularidad hecha visible. Al activar un
// giro, el GiroProvider reescribe --acento sobre :root y todo el sistema muda.
//
// Nota de alcance: aquí SOLO vive el color/identidad del giro (Tanda 1).
// El encendido/apagado por sucursal con persistencia es la Tanda 6.

// --- Cálculo de contraste (luminancia WCAG) -------------------------------
// El texto que va ENCIMA del acento se calcula por luminancia del acento:
// casi-negro si el acento es claro, blanco si el acento es oscuro. Así el
// texto sobre el botón/badge siempre se lee, con CUALQUIER giro y tema.

const TEXTO_CLARO = '255 255 255'
const TEXTO_OSCURO = '17 20 26' // casi-negro grafito

function canalLineal(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/** Luminancia relativa (0..1) de un color "R G B". */
export function luminancia(canales: string): number {
  const [r, g, b] = canales.split(/\s+/).map(Number)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

/** Razón de contraste WCAG entre dos luminancias. */
export function razonContraste(l1: number, l2: number): number {
  const a = Math.max(l1, l2) + 0.05
  const b = Math.min(l1, l2) + 0.05
  return a / b
}

const L_CLARO = luminancia(TEXTO_CLARO)
const L_OSCURO = luminancia(TEXTO_OSCURO)

/** Devuelve el color de texto ("R G B") con mejor contraste sobre el acento. */
export function textoParaAcento(acento: string): string {
  const la = luminancia(acento)
  return razonContraste(la, L_OSCURO) >= razonContraste(la, L_CLARO) ? TEXTO_OSCURO : TEXTO_CLARO
}

// --- Catálogo -------------------------------------------------------------
export interface Giro {
  id: string
  nombre: string
  /** Acento en canales RGB, p. ej. "255 138 43". */
  acento: string
  /** Texto legible SOBRE el acento — CALCULADO por luminancia. */
  acentoTexto: string
  /** Nombre del icono lucide (se mapea en el componente). */
  icono: string
}

function giro(id: string, nombre: string, acento: string, icono: string): Giro {
  return { id, nombre, acento, acentoTexto: textoParaAcento(acento), icono }
}

export const GIRO_MAESTRO: Giro = giro('maestro', 'JM AUTO', '255 138 43', 'Car')

// Los 13 giros del proyecto (7 del documento + 5 aportados + motos).
export const GIROS: Giro[] = [
  GIRO_MAESTRO,
  giro('carwash', 'Car wash', '45 205 214', 'Droplets'),
  giro('gomeria', 'Gomería', '255 122 40', 'CircleDot'),
  giro('mecanica', 'Mecánica', '255 176 32', 'Wrench'),
  giro('adorno', 'Auto adorno', '167 120 246', 'Sparkles'),
  giro('laminado', 'Laminado', '120 160 205', 'SunMedium'),
  giro('desabolladura', 'Desabolladura', '61 191 122', 'PaintBucket'),
  giro('repuestos', 'Repuestos', '90 141 214', 'Package'),
  giro('aire', 'Aire acondicionado', '56 189 248', 'Wind'),
  giro('sonido', 'Sonido y GPS', '219 39 119', 'Radio'),
  giro('electrico', 'Eléctrico y baterías', '132 204 22', 'Zap'),
  giro('grua', 'Grúa y asistencia', '220 38 38', 'Truck'),
  giro('peritaje', 'Peritaje', '13 148 136', 'ClipboardCheck'),
  giro('motores', 'Taller de motores', '84 87 226', 'Bike'),
]

/** Mapa id -> [acento, acentoTexto] para el script anti-parpadeo del layout. */
export const GIROS_ACENTO: Record<string, [string, string]> = Object.fromEntries(
  GIROS.map((g) => [g.id, [g.acento, g.acentoTexto]]),
)
