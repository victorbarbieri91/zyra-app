'use client'

import type { ReviewCardProps } from './types'

export default function ReviewCard({ title, children, icon }: ReviewCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div className="text-[#89bcbe]">
            {icon}
          </div>
        )}
        <h4 className="text-sm font-medium text-[#34495e]">{title}</h4>
      </div>
      <div className="text-sm text-slate-700 space-y-1">
        {children}
      </div>
    </div>
  )
}
