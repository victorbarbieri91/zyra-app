import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-[#34495e] mb-2">
          Página não encontrada
        </h2>
        <p className="text-sm text-[#46627f] mb-6">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2.5 bg-gradient-to-r from-[#34495e] to-[#46627f] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
