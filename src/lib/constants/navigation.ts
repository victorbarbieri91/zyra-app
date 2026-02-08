import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  MessageSquareCode,
  Scale,
  FileSearch,
  Newspaper,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react'

export interface NavItem {
  title: string
  icon: typeof LayoutDashboard
  href: string
  group: 'main' | 'operations' | 'management'
}

export const menuItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    group: 'main',
  },
  {
    title: 'Centro de Comando',
    icon: MessageSquareCode,
    href: '/dashboard/centro-comando',
    group: 'main',
  },
  {
    title: 'Agenda',
    icon: Calendar,
    href: '/dashboard/agenda',
    group: 'operations',
  },
  {
    title: 'Processos',
    icon: Scale,
    href: '/dashboard/processos',
    group: 'operations',
  },
  {
    title: 'Consultivo',
    icon: FileSearch,
    href: '/dashboard/consultivo',
    group: 'operations',
  },
  {
    title: 'Publicações',
    icon: Newspaper,
    href: '/dashboard/publicacoes',
    group: 'operations',
  },
  {
    title: 'CRM',
    icon: Users,
    href: '/dashboard/crm/pessoas',
    group: 'management',
  },
  {
    title: 'Portfólio',
    icon: Briefcase,
    href: '/dashboard/portfolio',
    group: 'management',
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    href: '/dashboard/financeiro',
    group: 'management',
  },
]

export const bottomNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    group: 'main',
  },
  {
    title: 'Agenda',
    icon: Calendar,
    href: '/dashboard/agenda',
    group: 'operations',
  },
  {
    title: 'Processos',
    icon: Scale,
    href: '/dashboard/processos',
    group: 'operations',
  },
  {
    title: 'Consultivo',
    icon: FileSearch,
    href: '/dashboard/consultivo',
    group: 'operations',
  },
]

export const bottomNavMoreItem = {
  title: 'Mais',
  icon: MoreHorizontal,
  href: '#more',
  group: 'main' as const,
}
