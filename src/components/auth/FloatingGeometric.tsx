'use client'

import { motion } from 'framer-motion'
import { Sparkles, Network } from 'lucide-react'

export function FloatingGeometric() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large Teal Orb - Top Right */}
      <motion.div
        className="absolute -top-20 -right-20 w-80 h-80"
        animate={{
          y: [0, -30, 0],
          x: [0, 15, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#89bcbe]/40 to-[#aacfd0]/20 blur-3xl" />
      </motion.div>

      {/* Medium Orb - Center Left */}
      <motion.div
        className="absolute top-1/3 -left-10 w-48 h-48"
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#46627f]/30 to-[#89bcbe]/10 blur-2xl" />
      </motion.div>

      {/* Small Orb - Bottom */}
      <motion.div
        className="absolute bottom-20 right-1/4 w-32 h-32"
        animate={{
          y: [0, -15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#aacfd0]/30 to-transparent blur-xl" />
      </motion.div>

      {/* Hexagon Shape - Bottom Left (replacing Scale) */}
      <motion.div
        className="absolute bottom-16 left-16"
        animate={{
          y: [0, -15, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" className="text-[#89bcbe]/15">
          <polygon
            points="40,5 70,20 70,60 40,75 10,60 10,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>

      {/* Network Icon - AI Symbol */}
      <motion.div
        className="absolute top-1/4 right-1/3"
        animate={{
          y: [0, 15, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }}
      >
        <Network className="w-16 h-16 text-[#aacfd0]/25" strokeWidth={1} />
      </motion.div>

      {/* Sparkles - AI Magic */}
      <motion.div
        className="absolute top-2/3 right-1/4"
        animate={{
          opacity: [0.2, 0.5, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      >
        <Sparkles className="w-12 h-12 text-[#89bcbe]/30" strokeWidth={1} />
      </motion.div>

      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#89bcbe]/40"
          style={{
            left: `${20 + i * 15}%`,
            bottom: `${10 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -100, -200],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 1.5,
          }}
        />
      ))}

      {/* Geometric Lines - Abstract Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <motion.line
          x1="10%"
          y1="20%"
          x2="40%"
          y2="35%"
          stroke="#89bcbe"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        <motion.line
          x1="60%"
          y1="15%"
          x2="85%"
          y2="40%"
          stroke="#aacfd0"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.8 }}
        />
        <motion.line
          x1="70%"
          y1="60%"
          x2="95%"
          y2="80%"
          stroke="#89bcbe"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1.1 }}
        />
        <motion.circle
          cx="40%"
          cy="35%"
          r="4"
          fill="#89bcbe"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 0.5, delay: 2.5 }}
        />
        <motion.circle
          cx="85%"
          cy="40%"
          r="3"
          fill="#aacfd0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 0.5, delay: 2.8 }}
        />
      </svg>
    </div>
  )
}
