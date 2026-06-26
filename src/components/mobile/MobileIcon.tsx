'use client'

// MobileIcon.tsx — adaptador do `Icon` do design (components/Shell.jsx) para
// lucide-react (já instalado). As telas mobile portadas usam <MobileIcon name="..."/>
// igual ao design; aqui o nome vira o componente lucide correspondente.

import {
  LayoutDashboard, Calendar, Scale, Briefcase, BookOpen, Users, DollarSign,
  BarChart3, MoreHorizontal, Clock, Bell, Plus, Check, AlertTriangle,
  ChevronDown, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, Search, Filter,
  FileText, LogOut, User, Target, Trophy, Play, Pause, Sun, Moon, Eye,
  Sparkles, TrendingUp, X, type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

const MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  agenda: Calendar,
  calendar: Calendar,
  scale: Scale,
  consultivo: Briefcase,
  publicacoes: BookOpen,
  crm: Users,
  dollar: DollarSign,
  report: BarChart3,
  more: MoreHorizontal,
  clock: Clock,
  bell: Bell,
  plus: Plus,
  check: Check,
  alert: AlertTriangle,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  search: Search,
  filter: Filter,
  briefcase: Briefcase,
  fileText: FileText,
  logout: LogOut,
  user: User,
  target: Target,
  trophy: Trophy,
  play: Play,
  pause: Pause,
  sun: Sun,
  moon: Moon,
  eye: Eye,
  sparkle: Sparkles,
  trending: TrendingUp,
  close: X,
}

interface MobileIconProps {
  name: string
  size?: number
  stroke?: number
  className?: string
  style?: CSSProperties
}

export default function MobileIcon({ name, size = 18, stroke = 2, className, style }: MobileIconProps) {
  const Cmp = MAP[name] || FileText
  return <Cmp size={size} strokeWidth={stroke} className={className} style={style} />
}
