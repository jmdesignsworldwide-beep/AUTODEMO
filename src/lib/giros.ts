// Catálogo de giros con su ACENTO propio (canales RGB "R G B").
// El acento no es decoración: es la modularidad hecha visible. Al activar un
// giro, el GiroProvider reescribe --acento sobre :root y todo el sistema muda.
//
// Nota de alcance: aquí SOLO vive el color/identidad del giro (Tanda 1).
// El encendido/apagado por sucursal con persistencia es la Tanda 6.

export interface Giro {
  id: string
  nombre: string
  /** Acento en canales RGB, p. ej. "255 138 43". */
  acento: string
  /** Texto legible SOBRE el acento, en canales RGB. */
  acentoContraste: string
  /** Nombre del icono lucide (se mapea en el componente). */
  icono: string
}

export const GIRO_MAESTRO: Giro = {
  id: 'maestro',
  nombre: 'JM AUTO',
  acento: '255 138 43', // ámbar incandescente
  acentoContraste: '18 21 26',
  icono: 'Car',
}

export const GIROS: Giro[] = [
  GIRO_MAESTRO,
  { id: 'carwash', nombre: 'Car wash', acento: '45 205 214', acentoContraste: '10 20 22', icono: 'Droplets' },
  { id: 'gomeria', nombre: 'Gomería', acento: '255 122 40', acentoContraste: '18 21 26', icono: 'CircleDot' },
  { id: 'mecanica', nombre: 'Mecánica', acento: '255 176 32', acentoContraste: '18 21 26', icono: 'Wrench' },
  { id: 'adorno', nombre: 'Auto adorno', acento: '167 120 246', acentoContraste: '255 255 255', icono: 'Sparkles' },
  { id: 'laminado', nombre: 'Laminado', acento: '120 160 205', acentoContraste: '10 18 26', icono: 'SunMedium' },
  { id: 'desabolladura', nombre: 'Desabolladura', acento: '61 191 122', acentoContraste: '10 20 15', icono: 'PaintBucket' },
  { id: 'repuestos', nombre: 'Repuestos', acento: '90 141 214', acentoContraste: '255 255 255', icono: 'Package' },
]

/** Mapa id -> [acento, contraste] para el script anti-parpadeo del layout. */
export const GIROS_ACENTO: Record<string, [string, string]> = Object.fromEntries(
  GIROS.map((g) => [g.id, [g.acento, g.acentoContraste]]),
)
