'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, FileOutput, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotaDebitoImpressao, NotaDebitoImpressaoData } from '@/hooks/useNotaDebitoImpressao'
import { formatBrazilDateLong, formatBrazilDateTime } from '@/lib/timezone'

export default function NotaDebitoImprimirPage() {
  const params = useParams()
  const notaId = params.id as string

  const { loading, error, loadNotaCompleta } = useNotaDebitoImpressao()
  const [dados, setDados] = useState<NotaDebitoImpressaoData | null>(null)
  const [tentouCarregar, setTentouCarregar] = useState(false)

  useEffect(() => {
    if (notaId) {
      loadNotaCompleta(notaId).then((result) => {
        setDados(result)
        setTentouCarregar(true)
      })
    }
  }, [notaId, loadNotaCompleta])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatCPFCNPJ = (value: string | null, tipo: 'pf' | 'pj') => {
    if (!value) return null
    const clean = value.replace(/\D/g, '')
    if (tipo === 'pf' && clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    if (tipo === 'pj' && clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const formatCNPJ = (value: string | null) => {
    if (!value) return null
    const clean = value.replace(/\D/g, '')
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const formatEndereco = (end: any) => {
    if (!end) return null
    const parts = []
    if (end.logradouro) {
      let linha = end.logradouro
      if (end.numero) linha += `, ${end.numero}`
      if (end.complemento) linha += ` - ${end.complemento}`
      parts.push(linha)
    }
    if (end.bairro) parts.push(end.bairro)
    const cidadeUf = [end.cidade, end.uf].filter(Boolean).join('/')
    if (cidadeUf) parts.push(cidadeUf)
    if (end.cep) parts.push(`CEP: ${end.cep}`)
    return parts.join(' - ')
  }

  const formatEnderecoCliente = (cliente: any) => {
    const parts = []
    if (cliente.logradouro) {
      let linha = cliente.logradouro
      if (cliente.numero) linha += `, ${cliente.numero}`
      if (cliente.complemento) linha += ` - ${cliente.complemento}`
      parts.push(linha)
    }
    if (cliente.bairro) parts.push(cliente.bairro)
    const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/')
    if (cidadeUf) parts.push(cidadeUf)
    if (cliente.cep) parts.push(`CEP: ${cliente.cep}`)
    return parts.join(' - ')
  }

  const categoriasLabel: Record<string, string> = {
    custas_judiciais: 'Custas Judiciais',
    honorarios_periciais: 'Honorários Periciais',
    diligencias: 'Diligências',
    cartorio: 'Cartório',
    viagem: 'Viagem',
    correio: 'Correio',
    copia_documentos: 'Cópia de Documentos',
    outras: 'Outras',
  }

  if (loading || !tentouCarregar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-600">Carregando nota de débito...</p>
        </div>
      </div>
    )
  }

  if (error || !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <FileOutput className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-700 mb-1">Nota de débito não encontrada</p>
          <p className="text-sm text-slate-500 mb-4">{error || 'Não foi possível carregar os dados da nota.'}</p>
          <Button variant="outline" onClick={() => window.close()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  const { escritorio, nota, cliente, itens } = dados

  return (
    <>
      {/* CSS de Impressão */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm 0.8cm;
            size: A4;
          }

          html {
            margin: 0;
            padding: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            font-size: 9pt !important;
          }

          .print-hidden {
            display: none !important;
          }

          .print-bg-white {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-card {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
          }

          .print-logo {
            max-height: 50px !important;
            max-width: 160px !important;
          }

          .print-title-box {
            padding: 0.4rem 1rem !important;
            margin-bottom: 0.6rem !important;
          }

          .print-title-small {
            font-size: 7pt !important;
          }

          .print-title-main {
            font-size: 13pt !important;
          }

          .print-section {
            margin-bottom: 0.5rem !important;
            padding-bottom: 0.3rem !important;
          }

          .print-header-section {
            margin-bottom: 0.4rem !important;
            padding-bottom: 0.3rem !important;
          }

          .print-text-base {
            font-size: 8.5pt !important;
          }

          .print-text-sm {
            font-size: 8pt !important;
          }

          .print-text-xs {
            font-size: 7pt !important;
          }

          .print-text-lg {
            font-size: 9pt !important;
          }

          .print-text-xl {
            font-size: 10pt !important;
          }

          .print-text-2xl {
            font-size: 11pt !important;
          }

          .print-compact-table th,
          .print-compact-table td {
            padding: 0.2rem 0.3rem !important;
            font-size: 8pt !important;
          }

          .print-totals {
            width: 200px !important;
          }

          .print-totals-main {
            font-size: 9pt !important;
          }

          .print-totals-value {
            font-size: 11pt !important;
          }

          .print-obs {
            padding: 0.4rem !important;
            margin-bottom: 0.4rem !important;
          }

          .print-footer {
            margin-top: 0.3rem !important;
            padding-top: 0.2rem !important;
          }

          .print-footer p {
            font-size: 6.5pt !important;
          }
        }

        @media screen {
          .paper-preview {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05);
            border-radius: 4px;
            width: 210mm;
            min-height: 297mm;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>

      {/* Container principal */}
      <div className="min-h-screen bg-slate-300 print-bg-white">
        {/* Barra de Ferramentas (não imprime) */}
        <div className="print-hidden sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => window.close()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Fechar
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">
                {nota.numero}
              </span>
              <Button onClick={handlePrint} className="bg-[#34495e] hover:bg-[#46627f] text-white">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Área do Papel */}
        <div className="py-8 px-4 print:py-0 print:px-0">
          <div className="paper-preview print-card">
            <div className="p-8 print:p-4 flex flex-col min-h-[inherit]">
              {/* Cabeçalho: Logo + Emitente */}
              <div className="mb-6 print-header-section flex items-center justify-between gap-6 pb-4 border-b border-slate-200">
                {escritorio.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={escritorio.logo_url}
                      alt={escritorio.nome}
                      className="h-32 max-w-[280px] object-contain print-logo"
                    />
                  </div>
                )}
                <div className="text-right flex-shrink-0">
                  <h3 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Emitente
                  </h3>
                  <p className="text-sm print-text-base font-semibold text-[#34495e]">
                    {escritorio.nome}
                  </p>
                  {escritorio.cnpj && (
                    <p className="text-xs print-text-sm text-slate-600 mt-0.5">
                      CNPJ: {formatCNPJ(escritorio.cnpj)}
                    </p>
                  )}
                  {escritorio.endereco && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5 leading-relaxed max-w-[260px] ml-auto">
                      {formatEndereco(escritorio.endereco)}
                    </p>
                  )}
                  {(escritorio.telefone || escritorio.email) && (
                    <div className="text-[10px] print-text-xs text-slate-500 mt-0.5 space-y-0">
                      {escritorio.telefone && <p>Tel: {escritorio.telefone}</p>}
                      {escritorio.email && <p>{escritorio.email}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Título da Nota */}
              <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white py-3 px-6 print-title-box rounded-lg mb-7 print-section text-center">
                <p className="text-[10px] print-title-small uppercase tracking-widest text-white/80 mb-0.5">
                  Nota de Débito
                </p>
                <h2 className="text-2xl print-title-main font-bold tracking-wide text-white">
                  {nota.numero}
                </h2>
              </div>

              {/* Destinatário e Datas */}
              <div className="grid grid-cols-2 gap-6 mb-7 print-section pb-4 border-b border-slate-200 print-break-inside-avoid">
                <div>
                  <h3 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Destinatário
                  </h3>
                  <p className="text-sm print-text-base font-semibold text-[#34495e]">
                    {cliente.nome_completo}
                  </p>
                  {cliente.nome_fantasia && (
                    <p className="text-xs print-text-sm text-slate-600">{cliente.nome_fantasia}</p>
                  )}
                  {cliente.cpf_cnpj && (
                    <p className="text-xs print-text-sm text-slate-600 mt-0.5">
                      {cliente.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}:{' '}
                      {formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa)}
                    </p>
                  )}
                  {cliente.logradouro && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {formatEnderecoCliente(cliente)}
                    </p>
                  )}
                  {cliente.email && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5">
                      {cliente.email}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Data de Emissão
                    </p>
                    <p className="text-sm print-text-lg font-semibold text-[#34495e]">
                      {nota.data_emissao ? formatBrazilDateLong(nota.data_emissao) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Data de Vencimento
                    </p>
                    <p className="text-base print-text-xl font-bold text-[#1E3A8A]">
                      {formatBrazilDateLong(nota.data_vencimento)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Discriminação dos Itens */}
              <div className="mb-2 print-section print-break-inside-avoid">
                <h3 className="text-xs print-text-sm font-bold text-[#34495e] uppercase tracking-wide mb-3 pb-1 border-b-2 border-[#89bcbe]">
                  Despesas Reembolsáveis
                </h3>

                <table className="w-full print-compact-table">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] print-text-xs font-bold text-slate-500 uppercase">
                      <th className="py-1.5 px-2 text-left w-[40%]">Descrição</th>
                      <th className="py-1.5 px-2 text-left w-[25%]">Processo / Caso</th>
                      <th className="py-1.5 px-2 text-left w-[20%]">Categoria</th>
                      <th className="py-1.5 px-2 text-right w-[15%]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="py-1.5 px-2">
                          <p className="text-[11px] print-text-xs font-medium text-[#34495e] leading-snug">
                            {item.descricao}
                          </p>
                        </td>
                        <td className="py-1.5 px-2">
                          {item.processo_titulo ? (
                            <p className="text-[10px] print-text-xs text-slate-500 leading-snug">
                              {item.processo_titulo}
                            </p>
                          ) : (
                            <p className="text-[10px] print-text-xs text-slate-300">—</p>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          <p className="text-[10px] print-text-xs text-slate-500">
                            {item.categoria ? (categoriasLabel[item.categoria] || item.categoria) : '—'}
                          </p>
                        </td>
                        <td className="py-1.5 px-2 text-right text-[11px] print-text-xs font-semibold text-[#34495e]">
                          {formatCurrency(item.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Espaço reservado quando poucos itens */}
              {itens.length <= 5 && (
                <div className="min-h-[140px] print:min-h-[100px]" />
              )}

              {/* Total */}
              <div className="flex justify-end mb-6 print-section print-break-inside-avoid">
                <div className="w-64 print-totals">
                  <div className="flex justify-between items-baseline pt-2 mt-1 border-t-2 border-[#34495e]">
                    <span className="text-sm print-totals-main font-bold text-[#34495e] uppercase">Valor Total:</span>
                    <span className="text-xl print-totals-value font-bold text-[#1E3A8A]">
                      {formatCurrency(nota.valor_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {nota.observacoes && (
                <div className="mb-4 print-obs p-3 bg-slate-50 rounded-lg border border-slate-200 print-break-inside-avoid">
                  <h4 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Observações
                  </h4>
                  <p className="text-xs print-text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {nota.observacoes}
                  </p>
                </div>
              )}

              {/* Spacer para empurrar rodapé para o final da página A4 */}
              <div className="flex-1" />

              {/* Rodapé */}
              <footer className="mt-6 print-footer pt-2 border-t border-slate-200 text-center">
                <p className="text-[10px] print-text-xs text-slate-400">
                  Documento gerado em {formatBrazilDateTime(new Date())}
                </p>
                <p className="text-[10px] print-text-xs text-slate-400 mt-0.5">
                  Sistema Zyra Legal
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
