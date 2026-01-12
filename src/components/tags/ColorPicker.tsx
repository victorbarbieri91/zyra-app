'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TAG_COLORS, TagColorKey, isValidHexColor } from '@/types/tags'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export default function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value)

  // Agrupar cores por categoria
  const colorGroups = {
    'Vermelhos': ['red', 'darkRed', 'crimson'] as TagColorKey[],
    'Laranjas e Amarelos': ['orange', 'amber', 'yellow'] as TagColorKey[],
    'Verdes': ['green', 'emerald', 'teal'] as TagColorKey[],
    'Azuis': ['cyan', 'blue', 'indigo'] as TagColorKey[],
    'Roxos e Rosas': ['purple', 'violet', 'pink'] as TagColorKey[],
    'Neutros': ['slate', 'gray'] as TagColorKey[],
    'Sistema': ['primary', 'secondary', 'accent'] as TagColorKey[],
  }

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex)
    if (isValidHexColor(hex)) {
      onChange(hex)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Paleta de Cores Pré-definidas */}
      <div className="space-y-3">
        {Object.entries(colorGroups).map(([groupName, colorKeys]) => (
          <div key={groupName}>
            <Label className="text-xs text-[#6c757d] mb-1.5 block">{groupName}</Label>
            <div className="flex flex-wrap gap-2">
              {colorKeys.map((colorKey) => {
                const color = TAG_COLORS[colorKey]
                const isSelected = value.toUpperCase() === color.hex.toUpperCase()

                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => onChange(color.hex)}
                    className={cn(
                      'relative w-8 h-8 rounded-md transition-all hover:scale-110',
                      'ring-offset-2 ring-offset-white',
                      isSelected && 'ring-2 ring-[#89bcbe]'
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                    aria-label={`Selecionar cor ${color.name}`}
                  >
                    {isSelected && (
                      <Check
                        className="absolute inset-0 m-auto w-4 h-4"
                        style={{
                          color: color.hex.startsWith('#E') || color.hex.startsWith('#F') ? '#1f2937' : '#ffffff',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Input para Cor Customizada */}
      <div className="pt-2 border-t border-slate-200">
        <Label htmlFor="custom-hex" className="text-xs text-[#6c757d] mb-1.5 block">
          Ou insira um código hex personalizado
        </Label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md border-2 border-slate-200 flex-shrink-0"
            style={{ backgroundColor: isValidHexColor(customHex) ? customHex : '#ffffff' }}
          />
          <Input
            id="custom-hex"
            type="text"
            value={customHex}
            onChange={(e) => handleCustomHexChange(e.target.value)}
            placeholder="#000000"
            className={cn(
              'font-mono text-sm h-8',
              !isValidHexColor(customHex) && customHex !== '' && 'border-red-300'
            )}
            maxLength={7}
          />
        </div>
        {!isValidHexColor(customHex) && customHex !== '' && (
          <p className="text-xs text-red-600 mt-1">Código hex inválido (ex: #FF0000)</p>
        )}
      </div>
    </div>
  )
}
