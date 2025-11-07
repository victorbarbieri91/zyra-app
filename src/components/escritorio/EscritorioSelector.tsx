'use client';

import React, { useState } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { Building2, Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export function EscritorioSelector() {
  const {
    escritorioAtivo,
    escritoriosDisponiveis,
    roleAtual,
    carregando,
    trocarEscritorio,
  } = useEscritorio();
  const [trocando, setTrocando] = useState(false);
  const router = useRouter();

  const handleTrocarEscritorio = async (id: string) => {
    if (id === escritorioAtivo?.id || trocando) return;

    try {
      setTrocando(true);
      await trocarEscritorio(id);
    } catch (error) {
      console.error('Erro ao trocar escritório:', error);
      alert('Erro ao trocar de escritório. Tente novamente.');
    } finally {
      setTrocando(false);
    }
  };

  const handleCriarEscritorio = () => {
    router.push('/dashboard/escritorio/criar');
  };

  if (carregando) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Carregando...</span>
        </div>
      </Button>
    );
  }

  if (!escritorioAtivo) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCriarEscritorio}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Criar Escritório</span>
        </div>
        <PlusCircle className="h-4 w-4" />
      </Button>
    );
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      owner: 'Proprietário',
      admin: 'Admin',
      advogado: 'Advogado',
      assistente: 'Assistente',
      readonly: 'Visualizar',
    };
    return roles[role] || role;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
          disabled={trocando}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium truncate w-full">
                {escritorioAtivo.nome}
              </span>
              {roleAtual && (
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(roleAtual)}
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" align="start">
        <DropdownMenuLabel>Meus Escritórios</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {escritoriosDisponiveis.map((escritorio) => {
          const isAtivo = escritorio.id === escritorioAtivo?.id;

          return (
            <DropdownMenuItem
              key={escritorio.id}
              onClick={() => handleTrocarEscritorio(escritorio.id)}
              disabled={isAtivo || trocando}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {isAtivo && <Check className="h-4 w-4 text-primary" />}
                  {!isAtivo && <div className="h-4 w-4" />}
                  <div className="flex flex-col">
                    <span className="font-medium">{escritorio.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(escritorio.role)}
                    </span>
                  </div>
                </div>
                {escritorio.is_owner && (
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCriarEscritorio} className="cursor-pointer">
          <PlusCircle className="h-4 w-4 mr-2" />
          <span>Criar novo escritório</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
