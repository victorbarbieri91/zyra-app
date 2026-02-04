'use client'

import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface FeatureBadgeProps {
  icon: LucideIcon
  label: string
  delay?: number
}

export function FeatureBadge({ icon: Icon, label, delay = 0 }: FeatureBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/15 transition-colors cursor-default"
    >
      <Icon className="w-4 h-4 text-[#89bcbe]" />
      <span className="text-white/90 text-sm font-medium">{label}</span>
    </motion.div>
  )
}
