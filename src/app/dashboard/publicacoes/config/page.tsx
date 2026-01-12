'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  Key,
  RefreshCw,
  Bell,
  Filter,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Users,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function ConfiguracoesPublicacoesPage() {
  const [activeTab, setActiveTab] = useState('credenciais')
  const [showToken, setShowToken] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Mock config data
  const [config, setConfig] = useState({
    api_url: 'https://api.aasp.org.br/v1',
    api_token: 'sk_live_xxxxxxxxxxxxxxxxxxxxx',
    webhook_url: 'https://app.zyralegal.com/api/webhooks/aasp',
    webhook_secret: 'whsec_xxxxxxxxxxxxxx',
    ativo: true,
    sync_frequencia_horas: 4,
    ultima_sincronizacao: '2024-11-05T14:30:00',
    proxima_sincronizacao: '2024-11-05T18:30:00',
    notificar_users: ['user1', 'user2'],
    notificar_apenas_urgentes: false,
    resumo_diario: true,
    auto_vincular_numero: true,
    auto_vincular_cliente: true,
    tipos_alerta_imediato: ['intimacao', 'sentenca', 'decisao', 'acordao'],
    prazo_minimo_urgencia: 5,
    palavras_chave_urgencia: ['liminar', 'tutela', 'citação pessoal']
  })

  // Mock sync history
  const syncHistory = [
    {
      id: '1',
      data_inicio: '2024-11-05T14:30:00',
      data_fim: '2024-11-05T14:31:30',
      tipo: 'automatica',
      sucesso: true,
      publicacoes_novas: 12,
      publicacoes_atualizadas: 3,
      triggered_by: 'Sistema'
    },
    {
      id: '2',
      data_inicio: '2024-11-05T10:00:00',
      data_fim: '2024-11-05T10:00:45',
      tipo: 'manual',
      sucesso: true,
      publicacoes_novas: 5,
      publicacoes_atualizadas: 1,
      triggered_by: 'João Silva'
    },
    {
      id: '3',
      data_inicio: '2024-11-05T06:00:00',
      data_fim: '2024-11-05T06:00:20',
      tipo: 'automatica',
      sucesso: false,
      erro_mensagem: 'Timeout ao conectar na API',
      triggered_by: 'Sistema'
    }
  ]

  const handleTestConnection = () => {
    setIsTesting(true)
    setTimeout(() => {
      setIsTesting(false)
      // Simular sucesso
    }, 2000)
  }

  const handleSyncNow = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      // Simular sucesso
    }, 3000)
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(config.webhook_url)
    // Toast de sucesso
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/publicacoes">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-700">Configurações AASP</h1>
                  <p className="text-xs text-slate-500">Integração e sincronização de publicações</p>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'text-xs border',
                config.ativo
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {config.ativo ? 'Integração Ativa' : 'Integração Inativa'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="credenciais" className="text-xs">
              <Key className="w-3.5 h-3.5 mr-2" />
              Credenciais
            </TabsTrigger>
            <TabsTrigger value="sincronizacao" className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sincronização
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="text-xs">
              <Bell className="w-3.5 h-3.5 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="regras" className="text-xs">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Regras
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Credenciais */}
          <TabsContent value="credenciais" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Credenciais da API AASP</h3>
                <p className="text-xs text-slate-500">Configure as credenciais de acesso à API da AASP</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs">URL da API AASP</Label>
                  <Input
                    value={config.api_url}
                    onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                    className="text-sm"
                    placeholder="https://api.aasp.org.br/v1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Token de Autenticação</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={config.api_token}
                        onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                        className="text-sm pr-10"
                        placeholder="sk_live_xxxxxxxxxxxxx"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showToken ? (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="gap-2"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isTesting ? 'Testando...' : 'Testar'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Webhook URL (receber notificações em tempo real)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.webhook_url}
                      readOnly
                      className="text-sm bg-slate-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhook}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure esta URL no painel da AASP para receber notificações instantâneas
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={config.webhook_secret}
                      readOnly
                      className="text-sm bg-slate-50"
                    />
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Gerar Novo
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Checkbox
                    id="ativo"
                    checked={config.ativo}
                    onCheckedChange={(checked) => setConfig({ ...config, ativo: checked as boolean })}
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-slate-700">
                    Integração Ativa
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
                  Salvar Credenciais
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Sincronização */}
          <TabsContent value="sincronizacao" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Configurações de Sincronização</h3>
                <p className="text-xs text-slate-500">Defina a frequência de sincronização automática</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Frequência de Sincronização Automática</Label>
                  <Select
                    value={config.sync_frequencia_horas.toString()}
                    onValueChange={(value) => setConfig({ ...config, sync_frequencia_horas: parseInt(value) })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">A cada 1 hora</SelectItem>
                      <SelectItem value="4">A cada 4 horas (recomendado)</SelectItem>
                      <SelectItem value="8">A cada 8 horas</SelectItem>
                      <SelectItem value="12">A cada 12 horas</SelectItem>
                      <SelectItem value="24">A cada 24 horas</SelectItem>
                      <SelectItem value="0">Manual (desativado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Última Sincronização</div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {new Date(config.ultima_sincronizacao).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Próxima Sincronização</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {new Date(config.proxima_sincronizacao).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="w-full gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                  size="lg"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Sincronizar Agora
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Histórico de Sincronizações */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Histórico de Sincronizações</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Data/Hora</th>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Novas</th>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Atualizadas</th>
                      <th className="text-left text-xs font-medium text-slate-600 p-3">Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {syncHistory.map((sync) => (
                      <tr key={sync.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="text-sm text-slate-700">
                            {new Date(sync.data_inicio).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {sync.tipo}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {sync.sucesso ? (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-slate-700">
                            {sync.publicacoes_novas || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-slate-600">
                            {sync.publicacoes_atualizadas || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-slate-600">{sync.triggered_by}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Notificações */}
          <TabsContent value="notificacoes" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Configurações de Notificações</h3>
                <p className="text-xs text-slate-500">Defina quem e como será notificado sobre novas publicações</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Usuários para Notificar</Label>
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Checkbox id="user1" defaultChecked />
                      <label htmlFor="user1" className="text-sm text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        João Silva (Advogado)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="user2" defaultChecked />
                      <label htmlFor="user2" className="text-sm text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        Maria Santos (Sócia)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="user3" />
                      <label htmlFor="user3" className="text-sm text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        Pedro Costa (Estagiário)
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Métodos de Notificação</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="email" defaultChecked />
                      <label htmlFor="email" className="text-sm text-slate-700">E-mail</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="push" defaultChecked />
                      <label htmlFor="push" className="text-sm text-slate-700">Notificação Push (navegador)</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="whatsapp" disabled />
                      <label htmlFor="whatsapp" className="text-sm text-slate-400">
                        WhatsApp <Badge variant="outline" className="text-xs ml-2">Em breve</Badge>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Label className="text-xs mb-3 block">Regras de Notificação</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apenas-urgentes"
                        checked={config.notificar_apenas_urgentes}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, notificar_apenas_urgentes: checked as boolean })
                        }
                      />
                      <label htmlFor="apenas-urgentes" className="text-sm text-slate-700">
                        Notificar apenas publicações urgentes
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="resumo-diario"
                        checked={config.resumo_diario}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, resumo_diario: checked as boolean })
                        }
                      />
                      <label htmlFor="resumo-diario" className="text-sm text-slate-700">
                        Enviar resumo diário (9h)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
                  Salvar Preferências
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Regras */}
          <TabsContent value="regras" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Regras de Processamento</h3>
                <p className="text-xs text-slate-500">Configure como as publicações serão processadas automaticamente</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-3 block">Vinculação Automática</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="vincular-numero"
                        checked={config.auto_vincular_numero}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, auto_vincular_numero: checked as boolean })
                        }
                      />
                      <label htmlFor="vincular-numero" className="text-sm text-slate-700">
                        Auto-vincular por número CNJ do processo
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="vincular-cliente"
                        checked={config.auto_vincular_cliente}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, auto_vincular_cliente: checked as boolean })
                        }
                      />
                      <label htmlFor="vincular-cliente" className="text-sm text-slate-700">
                        Auto-vincular por nome do cliente
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Tipos que Geram Alerta Imediato</Label>
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {['intimacao', 'sentenca', 'despacho', 'decisao', 'acordao'].map((tipo) => (
                      <div key={tipo} className="flex items-center gap-2">
                        <Checkbox
                          id={tipo}
                          checked={config.tipos_alerta_imediato.includes(tipo)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setConfig({
                                ...config,
                                tipos_alerta_imediato: [...config.tipos_alerta_imediato, tipo]
                              })
                            } else {
                              setConfig({
                                ...config,
                                tipos_alerta_imediato: config.tipos_alerta_imediato.filter(t => t !== tipo)
                              })
                            }
                          }}
                        />
                        <label htmlFor={tipo} className="text-sm text-slate-700 capitalize">
                          {tipo}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Detecção de Urgência</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Considerar urgente se prazo menor que
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={config.prazo_minimo_urgencia}
                      onChange={(e) =>
                        setConfig({ ...config, prazo_minimo_urgencia: parseInt(e.target.value) })
                      }
                      className="text-sm w-24"
                    />
                    <span className="text-sm text-slate-600">dias úteis</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Palavras-chave de Urgência</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {config.palavras_chave_urgencia.map((palavra, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-white">
                        {palavra}
                        <button className="ml-2 text-slate-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm" className="h-6 text-xs">
                      + Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
                  Salvar Regras
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
