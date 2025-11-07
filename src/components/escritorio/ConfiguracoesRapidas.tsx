'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, UserCheck, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface ConfiguracoesRapidasProps {
  escritorioId: string;
  configInicial?: {
    notificacaoNovosMembros: boolean;
    aprovarConvitesManualmente: boolean;
    permissoesVisualizacaoPadrao: boolean;
  };
  onSave?: (config: any) => Promise<void>;
}

export function ConfiguracoesRapidas({
  escritorioId,
  configInicial = {
    notificacaoNovosMembros: true,
    aprovarConvitesManualmente: false,
    permissoesVisualizacaoPadrao: true,
  },
  onSave,
}: ConfiguracoesRapidasProps) {
  const [salvando, setSalvando] = useState(false);
  const [config, setConfig] = useState(configInicial);

  const handleToggle = async (campo: keyof typeof config) => {
    const novoValor = !config[campo];
    const novaConfig = { ...config, [campo]: novoValor };
    setConfig(novaConfig);

    setSalvando(true);
    try {
      if (onSave) {
        await onSave(novaConfig);
      }
      toast.success('Configuração atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      // Reverter mudança em caso de erro
      setConfig(config);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#89bcbe]" />
          Configurações Rápidas
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notificações de Novos Membros */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#34495e]">
                Notificações de Novos Membros
              </p>
              <p className="text-xs text-[#adb5bd] mt-0.5">
                Receba notificações quando um novo membro entrar
              </p>
            </div>
          </div>
          <Switch
            checked={config.notificacaoNovosMembros}
            onCheckedChange={() => handleToggle('notificacaoNovosMembros')}
            disabled={salvando}
          />
        </div>

        <div className="border-t border-slate-200" />

        {/* Aprovar Convites Manualmente */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#34495e]">
                Aprovar Convites Manualmente
              </p>
              <p className="text-xs text-[#adb5bd] mt-0.5">
                Convites precisam de aprovação antes de serem aceitos
              </p>
            </div>
          </div>
          <Switch
            checked={config.aprovarConvitesManualmente}
            onCheckedChange={() => handleToggle('aprovarConvitesManualmente')}
            disabled={salvando}
          />
        </div>

        <div className="border-t border-slate-200" />

        {/* Permissões Padrão */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#34495e]">
                Permissões de Visualização Padrão
              </p>
              <p className="text-xs text-[#adb5bd] mt-0.5">
                Novos membros podem visualizar todos os processos
              </p>
            </div>
          </div>
          <Switch
            checked={config.permissoesVisualizacaoPadrao}
            onCheckedChange={() => handleToggle('permissoesVisualizacaoPadrao')}
            disabled={salvando}
          />
        </div>

        {/* Indicador de Salvamento */}
        {salvando && (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-[#89bcbe] text-center animate-pulse">
              Salvando configurações...
            </p>
          </div>
        )}

        {/* Nota Informativa */}
        <div className="pt-2 border-t border-slate-200">
          <p className="text-xs text-[#adb5bd]">
            💡 As alterações são salvas automaticamente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
