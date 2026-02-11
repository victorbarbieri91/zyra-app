'use client';

import { useState, useRef } from 'react';
import { Building2, Edit2, Upload, Calendar, MapPin, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatBrazilDate } from '@/lib/timezone';

interface EscritorioHeaderProps {
  escritorio: {
    id: string;
    nome: string;
    cnpj?: string | null;
    logo_url?: string | null;
    plano?: string | null;
    ativo?: boolean;
    created_at?: string;
    email?: string | null;
    telefone?: string | null;
    site?: string | null;
    endereco?: any;
  };
  onEdit: () => void;
}

export function EscritorioHeader({ escritorio, onEdit }: EscritorioHeaderProps) {
  const [logoUrl, setLogoUrl] = useState(escritorio.logo_url);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação de tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 2MB');
      return;
    }

    // Validação de tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `escritorios/${escritorio.id}/${fileName}`;

      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('escritorios')
        .update({ logo_url: publicUrl })
        .eq('id', escritorio.id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast.success('Logo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao atualizar logo');
    } finally {
      setUploading(false);
    }
  };

  const formatCNPJ = (cnpj: string | null | undefined) => {
    if (!cnpj) return null;
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const getPlanoLabel = (plano: string | null | undefined) => {
    const planos: Record<string, { label: string; class: string }> = {
      free: { label: 'Free', class: 'bg-slate-100 text-slate-600' },
      starter: { label: 'Starter', class: 'bg-blue-100 text-blue-700' },
      basic: { label: 'Basic', class: 'bg-blue-100 text-blue-700' },
      professional: { label: 'Professional', class: 'bg-[#89bcbe]/20 text-[#46627f]' },
      enterprise: { label: 'Enterprise', class: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white' },
    };
    return planos[plano || 'free'] || planos.free;
  };

  const planoInfo = getPlanoLabel(escritorio.plano);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <div
              className="relative group cursor-pointer"
              onClick={handleLogoClick}
            >
              <div className={`
                w-24 h-24 rounded-xl flex items-center justify-center
                transition-all duration-200 group-hover:shadow-md
                ${logoUrl
                  ? 'bg-white border border-slate-200'
                  : 'bg-slate-100 border border-slate-200'
                }
              `}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={escritorio.nome}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-[#46627f]">
                    {escritorio.nome.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Overlay */}
              <div className={`
                absolute inset-0 rounded-xl flex items-center justify-center
                bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity
                ${uploading ? 'opacity-100' : ''}
              `}>
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-5 h-5 text-white mx-auto" />
                    <span className="text-xs text-white">Alterar</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-semibold text-[#34495e]">
                    {escritorio.nome}
                  </h1>
                  {escritorio.ativo && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Ativo
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-[#6c757d]">
                  {escritorio.cnpj && (
                    <span className="font-mono text-xs">
                      {formatCNPJ(escritorio.cnpj)}
                    </span>
                  )}

                  {escritorio.created_at && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Desde {formatBrazilDate(escritorio.created_at)}
                    </span>
                  )}

                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${planoInfo.class}`}>
                    {planoInfo.label}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-shrink-0 border-slate-200 text-[#46627f] hover:bg-slate-50"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Editar
              </Button>
            </div>

            {/* Contact Info */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#6c757d]">
              {escritorio.email && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {escritorio.email}
                </span>
              )}

              {escritorio.telefone && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {escritorio.telefone}
                </span>
              )}

              {escritorio.site && (
                <a
                  href={escritorio.site.startsWith('http') ? escritorio.site : `https://${escritorio.site}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs hover:text-[#34495e] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {escritorio.site}
                </a>
              )}

              {escritorio.endereco?.cidade && (
                <span className="flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {escritorio.endereco.cidade}
                  {escritorio.endereco.estado && `, ${escritorio.endereco.estado}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
