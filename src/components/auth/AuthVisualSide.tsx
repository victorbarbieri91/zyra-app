'use client'

import { motion } from 'framer-motion'
import { FloatingGeometric } from './FloatingGeometric'

export function AuthVisualSide() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-[#2c3e50] via-[#34495e] to-[#46627f]"
    >
      {/* Floating Geometric Elements */}
      <FloatingGeometric />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col justify-center h-full p-12 xl:p-16">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-lg"
        >
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Gestão jurídica
            <br />
            <span className="text-[#89bcbe]">impulsionada por IA</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Processos. Clientes. Agenda. Financeiro. Tudo conectado.
          </p>
        </motion.div>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#2c3e50]/50 to-transparent pointer-events-none" />
    </motion.div>
  )
}
