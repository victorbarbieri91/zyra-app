'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Users, HardDrive, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanoLimitesCardProps {
  plano: 'starter' | 'professional' | 'enterprise';
  membrosAtivos: number;
  maxMembros: number;
  storageUsado: number; // em GB
  maxStorage: number; // em GB
  onUpgrade: () => void;
}

const planosConfig = {
  starter: {
    label: 'Starter',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Users,
  },
  professional: {
    label: 'Professional',
    color: 'bg-[#89bcbe]/20 text-[#89bcbe] border-[#89bcbe]/30',
    icon: TrendingUp,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white border-0',
    icon: Crown,
  },
};

export function PlanoLimitesCard({
  plano,
  membrosAtivos,
  maxMembros,
  storageUsado,
  maxStorage,
  onUpgrade,
}: PlanoLimitesCardProps) {
  const config = planosConfig[plano];
  const PlanoIcon = config.icon;

  const percentualMembros = (membrosAtivos / maxMembros) * 100;
  const percentualStorage = (storageUsado / maxStorage) * 100;

  const isLimiteMembrosProximo = percentualMembros >= 80;
  const isLimiteStorageProximo = percentualStorage >= 80;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
          <Crown className="w-4 h-4 text-[#89bcbe]" />
          Plano & Limites
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plano Atual */}
        <div className="space-y-2">
          <p className="text-xs text-[#adb5bd] font-medium">Plano Atual</p>
          <Badge
            variant="outline"
            className={cn('text-xs px-3 py-1 border font-medium', config.color)}
          >
            <PlanoIcon className="w-3.5 h-3.5 mr-1.5" />
            {config.label}
          </Badge>
        </div>

        {/* Progresso: Membros */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6c757d]" />
              <p className="text-sm font-medium text-[#34495e]">Membros</p>
            </div>
            <p className="text-xs text-[#6c757d]">
              <span className={cn(isLimiteMembrosProximo && 'text-amber-600 font-semibold')}>
                {membrosAtivos}
              </span>
              /{maxMembros}
            </p>
          </div>
          <Progress
            value={percentualMembros}
            className={cn(
              'h-2',
              isLimiteMembrosProximo && 'bg-amber-100 [&>div]:bg-amber-500'
            )}
          />
          {isLimiteMembrosProximo && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Limite de membros próximo
            </p>
          )}
        </div>

        {/* Progresso: Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#6c757d]" />
              <p className="text-sm font-medium text-[#34495e]">Armazenamento</p>
            </div>
            <p className="text-xs text-[#6c757d]">
              <span className={cn(isLimiteStorageProximo && 'text-amber-600 font-semibold')}>
                {storageUsado.toFixed(1)}GB
              </span>
              /{maxStorage}GB
            </p>
          </div>
          <Progress
            value={percentualStorage}
            className={cn(
              'h-2',
              isLimiteStorageProximo && 'bg-amber-100 [&>div]:bg-amber-500'
            )}
          />
          {isLimiteStorageProximo && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Armazenamento próximo do limite
            </p>
          )}
        </div>

        {/* Botão de Upgrade */}
        {plano !== 'enterprise' && (
          <div className="pt-2">
            <Button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        )}

        {/* Informações do Plano */}
        <div className="pt-3 border-t border-slate-200">
          <p className="text-xs text-[#adb5bd] mb-2">Recursos do Plano {config.label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[#6c757d]">
              <div className="w-1 h-1 rounded-full bg-[#89bcbe]" />
              Até {maxMembros} membros
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6c757d]">
              <div className="w-1 h-1 rounded-full bg-[#89bcbe]" />
              {maxStorage}GB de armazenamento
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6c757d]">
              <div className="w-1 h-1 rounded-full bg-[#89bcbe]" />
              {plano === 'enterprise' ? 'Suporte prioritário' : 'Suporte via email'}
            </div>
            {plano === 'enterprise' && (
              <div className="flex items-center gap-2 text-xs text-[#6c757d]">
                <div className="w-1 h-1 rounded-full bg-[#89bcbe]" />
                Customização avançada
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
