'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, TrendingUp } from 'lucide-react';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Pessoas',
      href: '/dashboard/crm/pessoas',
      icon: Users,
      description: 'Todos os contatos',
    },
    {
      name: 'Negociações',
      href: '/dashboard/crm/funil',
      icon: TrendingUp,
      description: 'Oportunidades e Interações',
    },
  ];

  const isTabActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com Navegação */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">CRM</h1>
              <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                Gestão de relacionamento com clientes
              </p>
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isTabActive(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      active
                        ? 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
