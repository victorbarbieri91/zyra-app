'use client'

// MobileApp — host da experiência phone-only. Decide a tela pela rota
// (usePathname), monta a tab bar inferior e os overlays (Registrar Horas,
// Nova Tarefa, menu "Mais"). Só é montado pelo dashboard/layout quando o
// dispositivo é celular — o desktop nunca passa por aqui.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { mTokens } from './tokens'
import MobileIcon from './MobileIcon'
import MobileTabBar, { type MobileTab } from './shell/MobileTabBar'
import MobileEmBreve from './shell/MobileEmBreve'
import MobileHome from './screens/MobileHome'
import MobileAgenda from './screens/MobileAgenda'
import MobileProcessos from './screens/MobileProcessos'
import MobileProcessoDetalhe from './screens/MobileProcessoDetalhe'
import MobileConsultivo from './screens/MobileConsultivo'
import MobileConsultaDetalhe from './screens/MobileConsultaDetalhe'
import MobileNovaTarefa from './screens/MobileNovaTarefa'
import MobileRegistrarHoras from './screens/MobileRegistrarHoras'

// ---------- prefills dos overlays ----------
export interface RegistrarHorasPrefill {
  processoId?: string | null
  consultaId?: string | null
  tarefaId?: string | null
  atividade?: string
}
export interface NovaTarefaPrefill {
  processoId?: string | null
  consultivoId?: string | null
}

// ---------- contexto de navegação mobile ----------
interface MobileNavApi {
  dark: boolean
  navigate: (route: string) => void
  back: () => void
  openMais: () => void
  openRegistrarHoras: (prefill?: RegistrarHorasPrefill) => void
  openNovaTarefa: (prefill?: NovaTarefaPrefill) => void
}

const MobileNavContext = createContext<MobileNavApi | null>(null)

export function useMobileNav(): MobileNavApi {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav deve ser usado dentro de <MobileApp>')
  return ctx
}

// ---------- animações compartilhadas (scrim/sheet/expand) ----------
const ANIM_CSS =
  '@keyframes dcExpandIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}' +
  '@keyframes dcScrimIn{from{opacity:0}to{opacity:1}}' +
  '@keyframes dcSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'

// ---------- aba ativa a partir da rota ----------
function tabFromPath(pathname: string): MobileTab | undefined {
  if (pathname === '/dashboard') return 'inicio'
  if (pathname.startsWith('/dashboard/agenda')) return 'agenda'
  if (pathname.startsWith('/dashboard/processos')) return 'processos'
  if (pathname.startsWith('/dashboard/consultivo')) return 'mais'
  return undefined
}

export default function MobileApp({ children }: { children: ReactNode }) {
  void children // no celular as páginas de desktop não são renderizadas
  const pathname = usePathname() || '/dashboard'
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const t = mTokens(dark)

  const [maisOpen, setMaisOpen] = useState(false)
  const [registrarHoras, setRegistrarHoras] = useState<RegistrarHorasPrefill | null>(null)
  const [novaTarefa, setNovaTarefa] = useState<NovaTarefaPrefill | null>(null)

  // fecha overlays ao trocar de rota
  useEffect(() => {
    setMaisOpen(false)
    setRegistrarHoras(null)
    setNovaTarefa(null)
  }, [pathname])

  const api: MobileNavApi = {
    dark,
    navigate: (route) => router.push(route),
    back: () => router.back(),
    openMais: () => setMaisOpen(true),
    openRegistrarHoras: (prefill) => setRegistrarHoras(prefill || {}),
    openNovaTarefa: (prefill) => setNovaTarefa(prefill || {}),
  }

  const onTab = (id: MobileTab) => {
    if (id === 'mais') { setMaisOpen(true); return }
    const route = id === 'inicio' ? '/dashboard' : id === 'agenda' ? '/dashboard/agenda' : '/dashboard/processos'
    router.push(route)
  }

  const activeTab = tabFromPath(pathname)

  // ---------- roteamento de tela (por rota; detalhe quando há id) ----------
  function renderScreen() {
    if (pathname === '/dashboard') return <MobileHome dark={dark} />
    const seg = pathname.split('/').filter(Boolean) // ['dashboard', modulo, id?]
    const modulo = seg[1]
    const id = seg[2]
    if (modulo === 'agenda') return <MobileAgenda dark={dark} />
    if (modulo === 'processos') return id ? <MobileProcessoDetalhe dark={dark} id={id} /> : <MobileProcessos dark={dark} />
    if (modulo === 'consultivo') return id ? <MobileConsultaDetalhe dark={dark} id={id} /> : <MobileConsultivo dark={dark} />
    return <MobileEmBreve dark={dark} titulo="Em breve" descricao="Esta área ainda não tem versão de celular no app." onBack={() => router.push('/dashboard')} />
  }

  return (
    <MobileNavContext.Provider value={api}>
      <style>{ANIM_CSS}</style>
      <div style={{ position: 'relative', height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page }}>
        {/* tela ativa */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderScreen()}
        </div>

        {/* barra inferior (some quando há overlay full-screen) */}
        {!registrarHoras && !novaTarefa && <MobileTabBar active={activeTab} dark={dark} onNavigate={onTab} />}

        {/* menu "Mais" */}
        {maisOpen && <MaisMenu dark={dark} onClose={() => setMaisOpen(false)} onOpen={(route) => { setMaisOpen(false); router.push(route) }} />}

        {/* overlays full-screen de ação */}
        {registrarHoras && (
          <OverlayFull dark={dark}>
            <MobileRegistrarHoras dark={dark} prefill={registrarHoras} onClose={() => setRegistrarHoras(null)} onSuccess={() => setRegistrarHoras(null)} />
          </OverlayFull>
        )}
        {novaTarefa && (
          <OverlayFull dark={dark}>
            <MobileNovaTarefa dark={dark} prefill={novaTarefa} onClose={() => setNovaTarefa(null)} onSuccess={() => setNovaTarefa(null)} />
          </OverlayFull>
        )}
      </div>
    </MobileNavContext.Provider>
  )
}

// ---------- container de overlay full-screen ----------
function OverlayFull({ dark, children }: { dark: boolean; children: ReactNode }) {
  const t = mTokens(dark)
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: t.page, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

// ---------- menu "Mais" (portado de Novo Dashboard Mobile.html · MaisMenu) ----------
function MaisMenu({ dark, onClose, onOpen }: { dark: boolean; onClose: () => void; onOpen: (route: string) => void }) {
  const t = mTokens(dark)
  const items = [
    { id: 'consultivo', route: '/dashboard/consultivo', icon: 'consultivo', label: 'Consultivo', sub: 'Consultas e pareceres', on: true },
    { id: 'financeiro', route: '/dashboard/financeiro', icon: 'dollar', label: 'Financeiro', sub: 'Honorários, contratos', on: false },
    { id: 'publicacoes', route: '/dashboard/publicacoes', icon: 'publicacoes', label: 'Publicações', sub: 'Intimações e prazos', on: false },
    { id: 'crm', route: '/dashboard/crm/pessoas', icon: 'crm', label: 'CRM / Clientes', sub: 'Contatos e leads', on: false },
    { id: 'relatorios', route: '/dashboard/relatorios', icon: 'report', label: 'Relatórios', sub: 'Indicadores do escritório', on: false },
  ]
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(20,26,34,0.45)', animation: 'dcScrimIn .2s ease', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ background: t.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)', animation: 'dcSheetUp .28s cubic-bezier(.32,.72,0,1)', boxShadow: '0 -10px 40px -12px rgba(0,0,0,0.3)' }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 2, background: t.border, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 19, fontWeight: 600, color: t.primary, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif', marginBottom: 2 }}>Mais</div>
        <div style={{ fontSize: 11.5, color: t.secondary, marginBottom: 14 }}>Outros módulos do escritório</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => it.on && onOpen(it.route)}
              style={{
                display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: it.on ? 'pointer' : 'default',
                fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, borderRadius: 15, padding: '14px 15px',
                opacity: it.on ? 1 : 0.55,
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.on ? t.tealSoft : (dark ? '#1a212c' : '#f1efe8'), color: it.on ? t.teal : t.muted }}>
                <MobileIcon name={it.icon} size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em' }}>{it.label}</div>
                <div style={{ fontSize: 11.5, color: t.muted, marginTop: 1 }}>{it.on ? it.sub : 'Em breve'}</div>
              </div>
              {it.on && <MobileIcon name="chevronRight" size={16} style={{ color: t.muted, flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
