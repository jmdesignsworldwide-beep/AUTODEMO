'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Car, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Bienvenida() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Halo ámbar de fondo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-ambar/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-ambar/30 bg-grafito-800 shadow-[0_0_40px_-8px_rgba(255,138,43,0.5)]"
        >
          <Car className="h-10 w-10 text-ambar" strokeWidth={1.6} />
        </motion.div>

        <h1 className="text-5xl font-black tracking-tight text-titanio-300 sm:text-6xl">
          JM <span className="text-ambar">AUTO</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-4 max-w-md text-balance text-titanio"
        >
          El sistema que sabe cómo funciona tu negocio.
          <br />
          <span className="text-sm text-titanio/70">
            Un vehículo entra. Algo le pasa. Sale. Alguien paga.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-10"
        >
          <Link href="/sucursales">
            <Button size="md" className="group">
              Entrar al sistema
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-14 flex items-center gap-2 text-xs text-titanio/50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Tanda 0 · Cimientos · RLS + FORCE desde la línea uno
        </motion.div>
      </motion.div>
    </main>
  )
}
