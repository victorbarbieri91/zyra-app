'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, X, User, Building2, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ClienteParaRelatorio } from '@/types/relatorios'
import { cn } from '@/lib/utils'

interface ClientSelectorProps {
  escritorioId: string
  selectedClients: ClienteParaRelatorio[]
  onClientsChange: (clients: ClienteParaRelatorio[]) => void
}

export function ClientSelector({
  escritorioId,
  selectedClients,
  onClientsChange
}: ClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClienteParaRelatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const supabase = createClient()

  // Buscar clientes com debounce
  const searchClientes = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      // Buscar clientes que tem processos
      const { data: pessoas, error } = await supabase
        .from('crm_pessoas')
        .select('id, nome_completo, cpf_cnpj, tipo_pessoa')
        .eq('escritorio_id', escritorioId)
        .eq('tipo_cadastro', 'cliente')
        .or(`nome_completo.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
        .limit(10)

      if (error) throw error

      // Para cada pessoa, contar processos
      const clientesComProcessos: ClienteParaRelatorio[] = []

      for (const pessoa of pessoas || []) {
        const { count } = await supabase
          .from('processos_processos')
          .select('*', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioId)
          .eq('cliente_id', pessoa.id)
          .neq('status', 'arquivado')

        if ((count || 0) > 0) {
          clientesComProcessos.push({
            id: pessoa.id,
            nome_completo: pessoa.nome_completo,
            cpf_cnpj: pessoa.cpf_cnpj,
            processos_count: count || 0
          })
        }
      }

      setSearchResults(clientesComProcessos)
    } catch (err) {
      console.error('Erro ao buscar clientes:', err)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClientes(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchClientes])

  const addClient = (cliente: ClienteParaRelatorio) => {
    if (!selectedClients.find(c => c.id === cliente.id)) {
      onClientsChange([...selectedClients, cliente])
    }
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const removeClient = (clienteId: string) => {
    onClientsChange(selectedClients.filter(c => c.id !== clienteId))
  }

  const totalProcessos = selectedClients.reduce((sum, c) => sum + c.processos_count, 0)

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-medium text-slate-700">
          Selecionar Cliente(s)
        </CardTitle>
        <p className="text-xs text-slate-500">
          Busque e selecione um ou mais clientes para o relatorio
        </p>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-4">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente por nome ou CPF/CNPJ..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            className="pl-10 h-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
          )}

          {/* Resultados da busca */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map(cliente => (
                <button
                  key={cliente.id}
                  onClick={() => addClient(cliente)}
                  disabled={selectedClients.some(c => c.id === cliente.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors",
                    selectedClients.some(c => c.id === cliente.id) && "opacity-50 cursor-not-allowed bg-slate-50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#89bcbe]/20 flex items-center justify-center">
                    {cliente.cpf_cnpj && cliente.cpf_cnpj.length > 14 ? (
                      <Building2 className="w-4 h-4 text-[#34495e]" />
                    ) : (
                      <User className="w-4 h-4 text-[#34495e]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {cliente.nome_completo}
                    </p>
                    {cliente.cpf_cnpj && (
                      <p className="text-xs text-slate-500">{cliente.cpf_cnpj}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-600">
                    <FileText className="w-3 h-3 mr-1" />
                    {cliente.processos_count} processo{cliente.processos_count !== 1 ? 's' : ''}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
              <p className="text-sm text-slate-500 text-center">
                Nenhum cliente encontrado com processos ativos
              </p>
            </div>
          )}
        </div>

        {/* Clientes selecionados */}
        {selectedClients.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Clientes Selecionados
              </h4>
              <Badge className="bg-[#89bcbe] text-white text-xs">
                {totalProcessos} processo{totalProcessos !== 1 ? 's' : ''} no total
              </Badge>
            </div>
            <div className="space-y-2">
              {selectedClients.map(cliente => (
                <div
                  key={cliente.id}
                  className="flex items-center gap-3 p-3 bg-[#f0f9f9] border border-[#aacfd0] rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    {cliente.cpf_cnpj && cliente.cpf_cnpj.length > 14 ? (
                      <Building2 className="w-4 h-4 text-[#34495e]" />
                    ) : (
                      <User className="w-4 h-4 text-[#34495e]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#34495e] truncate">
                      {cliente.nome_completo}
                    </p>
                    {cliente.cpf_cnpj && (
                      <p className="text-xs text-[#46627f]">{cliente.cpf_cnpj}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] text-[#46627f] border-[#89bcbe]">
                    <FileText className="w-3 h-3 mr-1" />
                    {cliente.processos_count}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeClient(cliente.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedClients.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <User className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Nenhum cliente selecionado</p>
            <p className="text-xs">Use a busca acima para encontrar clientes</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
