'use client'

import { MotionConfig } from 'framer-motion'

/**
 * Respeta prefers-reduced-motion en TODA animación de Framer Motion.
 * Con reducedMotion="user", si el sistema pide menos movimiento, Framer
 * desactiva transform/layout y conserva solo opacidad. Se complementa con la
 * media query en globals.css que reduce las transiciones CSS.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
