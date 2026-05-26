import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

interface LeadBody {
  nombre: string;
  contacto: string;
  interes?: string;
  monto_simulado?: number | null;
  plazo_simulado?: number | null;
  mensaje?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: LeadBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido.' }, 400);
  }

  const { nombre, contacto, interes, monto_simulado, plazo_simulado, mensaje } = body;

  if (!nombre?.trim() || !contacto?.trim()) {
    return json({ error: 'Nombre y contacto son requeridos.' }, 422);
  }

  const runtimeEnv = (locals as any).runtime?.env ?? {};
  const supabase = createSupabaseAdmin(runtimeEnv);

  const { error: dbError } = await supabase.from('leads').insert({
    nombre: nombre.trim(),
    contacto: contacto.trim(),
    interes: interes?.trim() || null,
    monto_simulado: monto_simulado ?? null,
    plazo_simulado: plazo_simulado ?? null,
    mensaje: mensaje?.trim() || null,
    origen: 'landing-inversion',
  });

  if (dbError) {
    console.error('[lead] Supabase error:', dbError);
    return json({ error: 'Error al guardar. Intenta de nuevo.' }, 500);
  }

  // Notification email — if Resend fails, lead is already saved; still return ok
  const RESEND_API_KEY: string | undefined =
    runtimeEnv.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? undefined;

  if (RESEND_API_KEY) {
    const subject = `Nuevo lead de inversión — ${nombre.trim()}`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Manibe Homes <noreply@manibehomes.com>',
          to: ['info@manibehomes.com'],
          subject,
          html: buildEmail({ nombre, contacto, interes, monto_simulado, plazo_simulado, mensaje }),
        }),
      });
    } catch (err) {
      console.error('[lead] Resend failed (lead saved):', err);
    }
  }

  return json({ ok: true }, 200);
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmail(d: LeadBody): string {
  const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US');
  const rows = [
    { label: 'Nombre',                  val: esc(d.nombre) },
    { label: 'Contacto (email/WA)',      val: esc(d.contacto) },
    d.interes        ? { label: 'Interés',          val: esc(d.interes) }                                                     : null,
    d.monto_simulado ? { label: 'Monto simulado',   val: `${fmtUsd(d.monto_simulado)}${d.plazo_simulado ? ` — ${d.plazo_simulado} meses` : ''}` } : null,
    d.mensaje        ? { label: 'Mensaje',           val: `<span style="white-space:pre-wrap">${esc(d.mensaje)}</span>` }     : null,
  ].filter(Boolean) as { label: string; val: string }[];

  const rowsHtml = rows.map((r, i) => `
    <tr><td style="padding:${i === 0 ? '0' : '16px'} 0 16px;${i < rows.length - 1 ? 'border-bottom:1px solid #e4e4e7;' : ''}">
      <p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${r.label}</p>
      <p style="margin:0;font-size:16px;color:#18181b;">${r.val}</p>
    </td></tr>`).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:600px;width:100%;">
  <tr><td style="background:#0c1524;padding:32px 40px;">
    <p style="margin:0;color:#dbc06a;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Manibe LLC — Project Management</p>
    <h1 style="margin:10px 0 0;color:#fff;font-size:20px;font-weight:700;">Nuevo lead de inversión</h1>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
  </td></tr>
  <tr><td style="background:#f4f4f5;padding:20px 40px;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="margin:0;font-size:12px;color:#71717a;">Capturado desde <strong>manibehomes.com/inversion</strong></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
