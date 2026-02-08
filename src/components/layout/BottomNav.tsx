'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { bottomNavItems, bottomNavMoreItem } from '@/lib/constants/navigation'
import MobileDrawer from './MobileDrawer'

export default function BottomNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const allItems = [...bottomNavItems, bottomNavMoreItem]

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-14">
          {allItems.map((item) => {
            const isMore = item.href === '#more'
            const isActive = !isMore && (
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            )
            const Icon = item.icon

            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setDrawerOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-slate-400 active:text-[#34495e] transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.title}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
                  isActive
                    ? 'text-[#34495e]'
                    : 'text-slate-400 active:text-[#34495e]'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-sm')} />
                <span className={cn(
                  'text-[10px]',
                  isActive ? 'font-bold' : 'font-medium'
                )}>
                  {item.title}
                </span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-[#34495e] rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}
