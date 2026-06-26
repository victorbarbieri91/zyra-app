'use client'

// useDismissable — integra uma "camada" mobile (sheet / overlay full-screen) com
// o histórico do navegador para que o BOTÃO/GESTO VOLTAR do celular feche a
// camada (em vez de sair da tela), com animação de saída.
//
// Padrão nativo: ao abrir, empurra uma entrada no histórico; TODO fechamento
// passa pelo `popstate` (back), mantendo o histórico equilibrado.
// - requestClose(): fechamento pela UI (tocar fora, X, swipe, ação) → history.back() → popstate.
// - popstate (back do SO/navegador OU o history.back() acima) → inicia a saída e, após a
//   animação, chama onClose() (o pai desmonta).
// - guard/onBlocked: para formulários "sujos" — o back é interceptado e em vez de fechar
//   dispara onBlocked() (ex.: abrir confirmação "Descartar?"). forceClose() ignora o guard.

import { useCallback, useEffect, useRef, useState } from 'react'

interface DismissOpts {
  animMs?: number
  /** Retorna true para BLOQUEAR o fechamento (ex.: formulário com dados). */
  guard?: () => boolean
  /** Chamado quando o fechamento é bloqueado pelo guard (ex.: abrir confirmação). */
  onBlocked?: () => void
}

export function useDismissable(onClose: () => void, opts?: DismissOpts) {
  const animMs = opts?.animMs ?? 260
  const onCloseRef = useRef(onClose)
  const guardRef = useRef(opts?.guard)
  const onBlockedRef = useRef(opts?.onBlocked)
  onCloseRef.current = onClose
  guardRef.current = opts?.guard
  onBlockedRef.current = opts?.onBlocked

  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const poppedRef = useRef(false)
  const bypassRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const startClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timerRef.current = window.setTimeout(() => onCloseRef.current(), animMs)
  }, [animMs])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    if (guardRef.current?.()) { onBlockedRef.current?.(); return }
    if (poppedRef.current) { startClose(); return }
    window.history.back() // → popstate → startClose
  }, [startClose])

  // Fecha ignorando o guard (ex.: usuário confirmou "Descartar").
  const forceClose = useCallback(() => {
    if (closingRef.current) return
    bypassRef.current = true
    if (poppedRef.current) { startClose(); return }
    window.history.back()
  }, [startClose])

  useEffect(() => {
    window.history.pushState({ mobileLayer: true }, '')
    const onPop = () => {
      // back com formulário sujo → cancela (re-empurra) e pede confirmação
      if (guardRef.current?.() && !bypassRef.current) {
        window.history.pushState({ mobileLayer: true }, '')
        onBlockedRef.current?.()
        return
      }
      poppedRef.current = true
      startClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [startClose])

  return { closing, requestClose, forceClose }
}
