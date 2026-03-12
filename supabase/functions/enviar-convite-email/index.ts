// Edge Function: enviar-convite-email
// Envia email de convite para novo membro do escritório via Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConviteEmailRequest {
  convite_id?: string
  token: string
  email: string
  escritorio_nome: string
  cargo_nome: string
  convidado_por_nome: string
  expira_em: string
}

function buildEmailHtml(data: ConviteEmailRequest, inviteLink: string): string {
  const expirationDate = new Date(data.expira_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Zyra Legal</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#34495e 0%,#46627f 100%);padding:32px 40px;text-align:center;">
              <img src="https://zyralegal.com.br/zyra.logo.png" alt="Zyra Legal" height="40" style="display:inline-block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#34495e;font-size:22px;font-weight:600;margin:0 0 8px;">
                Você foi convidado!
              </h1>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong style="color:#34495e;">${data.convidado_por_nome}</strong> convidou você para fazer parte do escritório <strong style="color:#34495e;">${data.escritorio_nome}</strong> na plataforma Zyra Legal.
              </p>

              <!-- Cargo Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#f0f9f9;border:1px solid #89bcbe;border-radius:8px;padding:12px 20px;">
                    <span style="color:#46627f;font-size:13px;">Cargo atribuído:</span>
                    <strong style="color:#34495e;font-size:15px;display:block;margin-top:2px;">${data.cargo_nome}</strong>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#34495e 0%,#46627f 100%);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;box-shadow:0 4px 12px rgba(52,73,94,0.3);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
                Ou copie e cole este link no navegador:<br/>
                <a href="${inviteLink}" style="color:#89bcbe;word-break:break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;text-align:center;">
                Este convite expira em <strong>${expirationDate}</strong>.<br/>
                Se você não esperava receber este convite, pode ignorar este email.
              </p>
            </td>
          </tr>

        </table>

        <!-- Copyright -->
        <p style="color:#94a3b8;font-size:11px;margin:20px 0 0;text-align:center;">
          &copy; ${new Date().getFullYear()} Zyra Legal. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada. Configure via: supabase secrets set RESEND_API_KEY=re_...')
    }

    const SITE_URL = Deno.env.get('SITE_URL') || Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://app.zyralegal.com.br'
    const FROM_EMAIL = Deno.env.get('CONVITE_FROM_EMAIL') || 'Zyra Legal <convites@zyralegal.com.br>'

    // Autenticar request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header obrigatório')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body: ConviteEmailRequest = await req.json()

    if (!body.token || !body.email || !body.escritorio_nome) {
      throw new Error('Campos obrigatórios: token, email, escritorio_nome')
    }

    const inviteLink = `${SITE_URL}/convite/${body.token}`

    const emailHtml = buildEmailHtml(body, inviteLink)

    // Enviar email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [body.email],
        subject: `${body.convidado_por_nome} convidou você para ${body.escritorio_nome} - Zyra Legal`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text()
      console.error('Erro Resend:', errorData)
      throw new Error(`Erro ao enviar email: ${resendResponse.status}`)
    }

    const resendData = await resendResponse.json()

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Erro na Edge Function enviar-convite-email:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
