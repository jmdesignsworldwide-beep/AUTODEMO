import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formato de fecha dominicano: DD/MM/AAAA HH:mm
export function fechaDominicana(valor: string | Date): string {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const aaaa = fecha.getFullYear()
  const hh = String(fecha.getHours()).padStart(2, '0')
  const min = String(fecha.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${aaaa} ${hh}:${min}`
}

const nf2 = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 })

/** RD$ con dos decimales, separador de miles dominicano. */
export function pesosRD(n: number): string {
  return `RD$${nf2.format(n)}`
}

/** Entero con separador de miles. */
export function numeroDO(n: number): string {
  return nf0.format(n)
}

/** Porcentaje con un decimal. */
export function porcentajeDO(n: number): string {
  return `${n.toLocaleString('es-DO', { maximumFractionDigits: 1 })}%`
}
