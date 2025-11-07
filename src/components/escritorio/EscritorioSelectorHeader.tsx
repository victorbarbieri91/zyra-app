'use client';

import { useState } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { Building2, Check, ChevronDown, PlusCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function EscritorioSelectorHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { escritorioAtivo, escritoriosDisponiveis, roleAtual, trocarEscritorio, carregando } = useEscritorio();
  const router = useRouter();

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      owner: { label: 'Proprietário', class: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white' },
      admin: { label: 'Admin', class: 'bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white' },
      advogado: { label: 'Advogado', class: 'bg-blue-100 text-blue-700' },
      assistente: { label: 'Assistente', class: 'bg-slate-100 text-slate-700' },
      readonly: { label: 'Visualização', class: 'bg-gray-100 text-gray-600' },
    };
    return badges[role] || badges.readonly;
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-lg">
        <div className="w-7 h-7 bg-slate-100 rounded-md animate-pulse" />
        <div className="text-left">
          <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse mb-1" />
          <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Botão Principal - Design Minimalista */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-lg hover:border-[#89bcbe]/40 hover:shadow-sm transition-all duration-200"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-md flex items-center justify-center shadow-sm">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-[#34495e] leading-tight truncate max-w-[160px]">
            {escritorioAtivo?.nome || 'Selecionar'}
          </p>
          {roleAtual && (
            <p className="text-[10px] text-[#89bcbe] font-medium">
              {getRoleBadge(roleAtual).label}
            </p>
          )}
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-all duration-200 group-hover:text-[#89bcbe]', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full mt-2 right-0 w-80 bg-white rounded-lg shadow-2xl border border-slate-200/80 overflow-hidden z-50 backdrop-blur-sm"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-[#f0f9f9]/30 to-white">
                <h3 className="text-sm font-semibold text-[#34495e]">Meus Escritórios</h3>
                <p className="text-[10px] text-[#89bcbe] font-medium mt-0.5">
                  {escritoriosDisponiveis.length} {escritoriosDisponiveis.length === 1 ? 'escritório disponível' : 'escritórios disponíveis'}
                </p>
              </div>

              {/* Lista de Escritórios */}
              <div className="max-h-[400px] overflow-y-auto">
                {escritoriosDisponiveis.length > 0 ? (
                  escritoriosDisponiveis.map((esc) => {
                    const isActive = esc.id === escritorioAtivo?.id;
                    const badge = getRoleBadge(esc.role);

                    return (
                      <button
                        key={esc.id}
                        onClick={() => {
                          if (!isActive) {
                            trocarEscritorio(esc.id);
                          }
                          setIsOpen(false);
                        }}
                        disabled={isActive}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gradient-to-r hover:from-[#f0f9f9]/40 hover:to-transparent transition-all duration-200 border-b border-slate-50 last:border-0 group',
                          isActive && 'bg-gradient-to-r from-[#f0f9f9]/60 to-transparent'
                        )}
                      >
                        <div className="flex-shrink-0">
                          {isActive ? (
                            <div className="w-6 h-6 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-md flex items-center justify-center shadow-sm">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-slate-200 rounded-md group-hover:border-[#89bcbe]/30 transition-colors" />
                          )}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold text-[#34495e] text-sm truncate">{esc.nome}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', badge.class)}>
                              {badge.label}
                            </span>
                            {esc.is_owner && (
                              <span className="text-[10px] font-semibold text-[#89bcbe]">• Owner</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-[#6c757d] mb-4">Nenhum escritório encontrado</p>
                    <button
                      onClick={() => {
                        router.push('/dashboard/escritorio/criar');
                        setIsOpen(false);
                      }}
                      className="text-sm text-[#89bcbe] hover:text-[#6ba9ab] font-medium"
                    >
                      Criar seu primeiro escritório
                    </button>
                  </div>
                )}
              </div>

              {/* Footer com Ações */}
              {escritoriosDisponiveis.length > 0 && (
                <div className="p-2 border-t border-slate-100 bg-gradient-to-br from-slate-50/50 to-white">
                  <button
                    onClick={() => {
                      router.push('/dashboard/escritorio/criar');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#89bcbe] hover:bg-white/80 rounded-md transition-all duration-200 hover:shadow-sm group"
                  >
                    <PlusCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold">Criar novo escritório</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/dashboard/escritorio');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[#46627f] hover:bg-white/80 rounded-md transition-all duration-200 hover:shadow-sm group"
                  >
                    <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                    <span className="text-xs font-semibold">Gerenciar escritórios</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
