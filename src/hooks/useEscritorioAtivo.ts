import { useEscritorio } from '@/contexts/EscritorioContext'

export function useEscritorioAtivo() {
  const { escritorioAtivo, escritoriosDisponiveis, roleAtual, isOwner, carregando, trocarEscritorio, recarregar } = useEscritorio()

  return {
    escritorioAtivo: escritorioAtivo?.id || null,
    escritorioAtivoData: escritorioAtivo,
    escritorios: escritoriosDisponiveis,
    roleAtual,
    isOwner,
    loading: carregando,
    trocarEscritorio,
    recarregar,
  }
}
