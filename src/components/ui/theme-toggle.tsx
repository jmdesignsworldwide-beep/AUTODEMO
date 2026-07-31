'use client'

import { Sun, Moon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTema } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { tema, alternar } = useTema()
  return (
    <button
      onClick={alternar}
      aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-token border border-borde text-texto-suave transition-acento hover:text-acento',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {tema === 'dark' ? (
          <motion.span
            key="luna"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Moon className="h-5 w-5" />
          </motion.span>
        ) : (
          <motion.span
            key="sol"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Sun className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
