import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

async function verifyAdmin(cookies: any) {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return null;
  const supabase = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return supabase;
}

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { data: clients, error } = await supabase
    .from('profiles')
    .select(`*, project_clients(project_id, projects:project_id(name))`)
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(clients), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { email, password, full_name, phone } = await request.json();

  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }), { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
  }

  if (phone) {
    await supabase.from('profiles').update({ phone }).eq('id', authData.user.id);
  }

  return new Response(JSON.stringify({ id: authData.user.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, full_name, phone, active, password } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const updates: any = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (password) {
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), { status: 400 });
    }
    const { error: passError } = await supabase.auth.admin.updateUserById(id, { password });
    if (passError) return new Response(JSON.stringify({ error: passError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
