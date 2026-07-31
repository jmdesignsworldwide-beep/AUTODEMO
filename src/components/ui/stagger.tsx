'use client'

import { motion, type Variants } from 'framer-motion'

export const contenedorStagger: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

export const itemStagger: Variants = {
  oculto: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export function ListaStagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.ul variants={contenedorStagger} initial="oculto" animate="visible" className={className}>
      {children}
    </motion.ul>
  )
}

export function ItemStagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.li variants={itemStagger} className={className}>
      {children}
    </motion.li>
  )
}
