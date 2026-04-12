import type { APIRoute } from 'astro';

export const prerender = false;

interface ContactBody {
  name: string;
  email: string;
  phone: string;
  product: string;
  message?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Parse body
  let body: ContactBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const { name, email, phone, product, message } = body;

  // 2. Validate required fields
  if (!name || !email || !phone || !product) {
    return json({ error: 'Faltan campos requeridos: nombre, email, teléfono y producto.' }, 422);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email inválido.' }, 422);
  }

  // 3. Read API key from Cloudflare runtime env
  const env = (locals as any).runtime?.env ?? {};
  const RESEND_API_KEY: string | undefined = env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY no está configurado.');
    return json({ error: 'Error de configuración del servidor.' }, 500);
  }

  // 4. Build email
  const subject = `Nueva solicitud: ${product} — ${name}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0c1524;padding:32px 40px;">
              <p style="margin:0;color:#dbc06a;font-size:12px;letter-spacing:3px;
                        text-transform:uppercase;font-weight:600;">
                Manibe LLC — Project Management
              </p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">
                Nueva solicitud de contacto
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <tr>
                  <td style="padding-bottom:20px;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;
                              letter-spacing:1px;font-weight:600;">Nombre</p>
                    <p style="margin:0;font-size:16px;color:#18181b;font-weight:600;">
                      ${escapeHtml(name)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;
                              letter-spacing:1px;font-weight:600;">Email</p>
                    <p style="margin:0;font-size:16px;">
                      <a href="mailto:${escapeHtml(email)}"
                         style="color:#dbc06a;text-decoration:none;">
                        ${escapeHtml(email)}
                      </a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;
                              letter-spacing:1px;font-weight:600;">Teléfono / WhatsApp</p>
                    <p style="margin:0;font-size:16px;color:#18181b;">${escapeHtml(phone)}</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0;${message ? 'border-bottom:1px solid #e4e4e7;' : ''}">
                    <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;
                              letter-spacing:1px;font-weight:600;">Producto de interés</p>
                    <p style="margin:0;font-size:16px;color:#18181b;font-weight:600;">
                      ${escapeHtml(product)}
                    </p>
                  </td>
                </tr>

                ${message ? `
                <tr>
                  <td style="padding:20px 0;">
                    <p style="margin:0 0 8px;font-size:11px;color:#71717a;text-transform:uppercase;
                              letter-spacing:1px;font-weight:600;">Mensaje</p>
                    <p style="margin:0;font-size:15px;color:#3f3f46;line-height:1.6;white-space:pre-wrap;">
                      ${escapeHtml(message)}
                    </p>
                  </td>
                </tr>
                ` : ''}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f5;padding:24px 40px;text-align:center;
                       border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                Este correo fue generado automáticamente desde el formulario de
                <strong>manibehomes.com</strong>.<br />
                Para responder, usa el email del cliente indicado arriba.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  // 5. Send via Resend
  let resendRes: Response;
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Manibe Homes <noreply@manibehomes.com>',
        to: ['info@manibehomes.com'],
        reply_to: email,
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error('[contact] Error de red al llamar a Resend:', err);
    return json({ error: 'No se pudo conectar con el servicio de email. Intenta de nuevo.' }, 503);
  }

  if (!resendRes.ok) {
    const body = await resendRes.text().catch(() => '');
    console.error(`[contact] Resend respondió ${resendRes.status}:`, body);
    return json({ error: 'Error al enviar el email. Intenta de nuevo más tarde.' }, 502);
  }

  return json({ success: true }, 200);
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
