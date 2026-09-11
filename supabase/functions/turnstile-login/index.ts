// Edge Function "turnstile-login" — gate FORTE de login com Cloudflare Turnstile.
//
// Objetivo: o cliente NUNCA valida credenciais direto. Todo login passa por aqui:
//   1. Recebe { email?, password?, token }  (token = resposta do widget Turnstile).
//   2. Valida o token no servidor via siteverify usando a SECRET KEY
//      (Deno.env TURNSTILE_SECRET_KEY — injetada como secret, nunca no frontend).
//   3. Se veio email+password (modo custom), valida as credenciais via RPC
//      concremrh_verify_login usando a SERVICE ROLE e devolve o perfil.
//      Se veio só o token (modo supabase), apenas confirma o Turnstile (gate),
//      e o cliente segue o fluxo signInWithPassword/auth-bridge.
//
// SEGURANÇA:
//   - Roda no Edge com SUPABASE_SERVICE_ROLE_KEY e TURNSTILE_SECRET_KEY do ambiente.
//   - NUNCA expor service_role nem a secret do Turnstile no cliente.
//   - Falhas de captcha/credencial retornam HTTP 200 com { ok:false, error } para
//     o cliente ler a mensagem (supabase.functions.invoke trata não-2xx como erro).
//   - Para ser à prova de bypass, revogue o EXECUTE de concremrh_verify_login do
//     anon/authenticated (ver supabase/auth-proposals/0001_turnstile_lockdown.sql),
//     aplicando SÓ depois que esta função estiver publicada e o secret definido.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { email, password, token } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string') {
      return json({ ok: false, error: 'Verificação de segurança ausente. Recarregue a página.' });
    }

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY não configurada no ambiente da função.');
      return json({ ok: false, error: 'Verificação de segurança indisponível no momento.' }, 500);
    }

    // IP do cliente (best-effort) para o siteverify.
    const ip = req.headers.get('CF-Connecting-IP')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? undefined;

    // 1) valida o token do Turnstile no servidor
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);

    const verifyRes = await fetch(SITEVERIFY, { method: 'POST', body: form });
    const outcome = await verifyRes.json() as { success: boolean; 'error-codes'?: string[] };

    if (!outcome.success) {
      console.warn('Turnstile falhou:', outcome['error-codes']);
      return json({ ok: false, error: 'Falha na verificação de segurança. Tente novamente.' });
    }

    // 2) gate-only (modo supabase): confirma o captcha e devolve ok
    if (!email || !password) {
      return json({ ok: true });
    }

    // 3) modo custom: valida credenciais via service role (cliente não chama a RPC)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: login, error } = await admin.rpc('concremrh_verify_login', {
      p_email: email, p_password: password,
    });
    if (error) {
      console.error('Erro na RPC concremrh_verify_login:', error);
      return json({ ok: false, error: 'Não foi possível validar o acesso. Tente novamente.' }, 500);
    }
    if (!login?.ok) {
      return json({ ok: false, error: 'Email ou senha inválidos.' });
    }

    return json({
      ok: true,
      profile: {
        id: login.id,
        email: login.email,
        nome: login.nome ?? null,
        perfil: login.perfil,
        secoes: login.secoes ?? [],
        // Permissões granulares EFETIVAS já resolvidas pela RPC (perfil de acesso
        // ∪ exceções \ negadas). `null` = usuário legado, governado só por `secoes`.
        // Repassar `null` (não `[]`): array vazio significa "granular sem acesso".
        permissoes: login.permissoes ?? null,
        perfil_acesso: login.perfil_acesso ?? null,
      },
    });
  } catch (e) {
    console.error('turnstile-login erro:', e);
    return json({ ok: false, error: 'Erro inesperado na verificação de acesso.' }, 500);
  }
});
