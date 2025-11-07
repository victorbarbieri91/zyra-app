'use client';

import { Users, MoreVertical, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  is_owner: boolean;
  ultimo_acesso?: string;
  avatar_url?: string;
}

interface MembrosListProps {
  membros: Membro[];
  onConvidar: () => void;
  onEditarMembro: (membro: Membro) => void;
}

const getRoleBadge = (role: string, isOwner: boolean) => {
  if (isOwner) return { label: 'Proprietário', class: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white' };

  const badges: Record<string, { label: string; class: string }> = {
    admin: { label: 'Admin', class: 'bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white' },
    advogado: { label: 'Advogado', class: 'bg-blue-100 text-blue-700' },
    assistente: { label: 'Assistente', class: 'bg-slate-100 text-slate-700' },
    readonly: { label: 'Visualização', class: 'bg-gray-100 text-gray-600' },
  };
  return badges[role] || badges.readonly;
};

export function MembrosList({ membros, onConvidar, onEditarMembro }: MembrosListProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#89bcbe]" />
            Membros Ativos
          </CardTitle>
          <Button
            size="sm"
            onClick={onConvidar}
            className="bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:opacity-90 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Convidar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {membros.map((membro) => {
              const badge = getRoleBadge(membro.role, membro.is_owner);
              const iniciais = membro.nome_completo
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || '??';

              return (
                <div
                  key={membro.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 group"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-[#34495e] to-[#46627f] text-white text-sm">
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#34495e] truncate">
                      {membro.nome_completo}
                    </p>
                    <p className="text-xs text-[#6c757d] truncate">{membro.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] px-2 py-0 h-5 ${badge.class}`}>
                        {badge.label}
                      </Badge>
                      {membro.ultimo_acesso && (
                        <>
                          <span className="text-[10px] text-[#adb5bd]">·</span>
                          <div className="flex items-center gap-1 text-[10px] text-[#adb5bd]">
                            <Calendar className="w-3 h-3" />
                            {new Date(membro.ultimo_acesso).toLocaleDateString('pt-BR')}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {!membro.is_owner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditarMembro(membro)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}

            {membros.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-[#6c757d]">Nenhum membro cadastrado</p>
                <Button variant="link" onClick={onConvidar} className="text-[#89bcbe] mt-2">
                  Convidar primeiro membro
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
