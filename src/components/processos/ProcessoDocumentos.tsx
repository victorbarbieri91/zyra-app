'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react'

interface ProcessoDocumentosProps {
  processoId: string
}

export default function ProcessoDocumentos({ processoId }: ProcessoDocumentosProps) {
  const documentos = [
    { id: '1', nome: 'Petição Inicial.pdf', tipo: 'Peça Processual', data: '15/01/2024', tamanho: '2.3 MB', usuario: 'Dr. Carlos' },
    { id: '2', nome: 'Procuração.pdf', tipo: 'Procuração', data: '15/01/2024', tamanho: '856 KB', usuario: 'Dr. Carlos' },
    { id: '3', nome: 'Documento Pessoal.pdf', tipo: 'Documento da Parte', data: '20/01/2024', tamanho: '1.1 MB', usuario: 'Dra. Ana' },
  ]

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">Arraste arquivos ou clique para fazer upload</p>
          <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white">
            <Upload className="w-4 h-4 mr-2" />
            Selecionar Arquivos
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {documentos.map(doc => (
          <Card key={doc.id} className="border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#34495e] truncate">{doc.nome}</p>
                  <p className="text-xs text-slate-500">{doc.tamanho}</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-3">
                <p><strong>Tipo:</strong> {doc.tipo}</p>
                <p><strong>Data:</strong> {doc.data}</p>
                <p><strong>Por:</strong> {doc.usuario}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
