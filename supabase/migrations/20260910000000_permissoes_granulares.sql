-- ============================================================================
-- PERMISSÕES GRANULARES (recurso.ação e recurso.campo.<campo>.<ação>)
--
-- Objetivo: permitir conceder acesso a UMA TELA e à alteração de UM DADO
-- específico, em vez de liberar o módulo inteiro via `concremrh_usuarios.secoes`.
--
-- Modelo:
--   concremrh_perfis_acesso        → perfis REUTILIZÁVEIS (lista de concessões).
--   concremrh_usuarios.perfil_acesso_id → perfil aplicado ao usuário.
--   concremrh_usuarios.permissoes  → EXCEÇÕES do usuário: {"mais":[...],"menos":[...]}.
--   Efetivo = (perfil ∪ mais) \ menos   → concremrh_permissoes_efetivas(id).
--
-- COMPATIBILIDADE: usuário sem `perfil_acesso_id` E sem `permissoes` é LEGADO —
-- a função devolve NULL e o app continua governado apenas por `secoes`
-- (comportamento atual, sem regressão). Nada é migrado automaticamente.
--
-- O registro de recursos/ações/campos vive no frontend
-- (src/config/permissions.ts) — o banco apenas persiste as strings.
-- ============================================================================

-- 1) Perfis de acesso reutilizáveis ------------------------------------------
create table if not exists public.concremrh_perfis_acesso (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  permissoes  jsonb not null default '[]'::jsonb,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists concremrh_perfis_acesso_nome_uidx
  on public.concremrh_perfis_acesso (lower(nome));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'concremrh_perfis_acesso_permissoes_array'
  ) then
    alter table public.concremrh_perfis_acesso
      add constraint concremrh_perfis_acesso_permissoes_array
      check (jsonb_typeof(permissoes) = 'array');
  end if;
end $$;

comment on table public.concremrh_perfis_acesso is
  'Perfis de acesso reutilizáveis. `permissoes` = array de concessões no formato "<recurso>.<acao>" ou "<recurso>.campo.<campo>.<acao>".';

-- 2) Vínculo e exceções por usuário ------------------------------------------
alter table public.concremrh_usuarios
  add column if not exists perfil_acesso_id uuid,
  add column if not exists permissoes       jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'concremrh_usuarios_perfil_acesso_fk'
  ) then
    alter table public.concremrh_usuarios
      add constraint concremrh_usuarios_perfil_acesso_fk
      foreign key (perfil_acesso_id) references public.concremrh_perfis_acesso (id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'concremrh_usuarios_permissoes_shape'
  ) then
    alter table public.concremrh_usuarios
      add constraint concremrh_usuarios_permissoes_shape
      check (
        permissoes is null or (
          jsonb_typeof(permissoes) = 'object'
          and jsonb_typeof(coalesce(permissoes -> 'mais',  '[]'::jsonb)) = 'array'
          and jsonb_typeof(coalesce(permissoes -> 'menos', '[]'::jsonb)) = 'array'
        )
      );
  end if;
end $$;

create index if not exists concremrh_usuarios_perfil_acesso_idx
  on public.concremrh_usuarios (perfil_acesso_id);

comment on column public.concremrh_usuarios.perfil_acesso_id is
  'Perfil de acesso aplicado. NULL + permissoes NULL = usuário legado (governado por `secoes`).';
comment on column public.concremrh_usuarios.permissoes is
  'Exceções do usuário: {"mais":[concessoes],"menos":[concessoes]}. `menos` vence sobre o perfil e sobre `mais`.';

-- 3) Resolução do conjunto efetivo -------------------------------------------
-- Devolve NULL para usuário LEGADO (sem perfil e sem exceções) e um array
-- (possivelmente vazio) para usuário granular. Array vazio = granular SEM acesso.
create or replace function public.concremrh_permissoes_efetivas(p_usuario uuid)
  returns jsonb
  language plpgsql
  stable
  security definer
as $function$
declare
  v_perfil_id uuid;
  v_excecoes  jsonb;
  v_base      jsonb;
  v_efetivas  text[];
begin
  select u.perfil_acesso_id, u.permissoes
    into v_perfil_id, v_excecoes
  from public.concremrh_usuarios u
  where u.id = p_usuario;

  if not found then
    return null;
  end if;

  if v_perfil_id is null and v_excecoes is null then
    return null;  -- legado: o app cai no modelo de seções
  end if;

  select pa.permissoes into v_base
  from public.concremrh_perfis_acesso pa
  where pa.id = v_perfil_id and pa.ativo = true;
  v_base := coalesce(v_base, '[]'::jsonb);

  select coalesce(array_agg(s.g), '{}'::text[])
    into v_efetivas
  from (
    select jsonb_array_elements_text(v_base) as g
    union
    select jsonb_array_elements_text(coalesce(v_excecoes -> 'mais', '[]'::jsonb))
  ) s
  where s.g not in (
    select jsonb_array_elements_text(coalesce(v_excecoes -> 'menos', '[]'::jsonb))
  );

  return to_jsonb(v_efetivas);
end;
$function$;

comment on function public.concremrh_permissoes_efetivas(uuid) is
  'Concessões efetivas do usuário: (perfil de acesso ∪ mais) \ menos. NULL = usuário legado (usar `secoes`).';

-- Esta função recebe um id de usuário QUALQUER; deixá-la aberta permitiria a
-- um cliente anônimo enumerar as permissões de terceiros. Ela só precisa ser
-- chamada de DENTRO de outras funções SECURITY DEFINER (concremrh_verify_login
-- e, na Fase 2, get_my_profile), onde executa como o dono — por isso revogar
-- de anon/authenticated NÃO quebra o login.
revoke execute on function public.concremrh_permissoes_efetivas(uuid) from public, anon, authenticated;
grant  execute on function public.concremrh_permissoes_efetivas(uuid) to service_role;

-- 4) Login devolve as permissões efetivas ------------------------------------
-- Mesma assinatura e mesmo SECURITY DEFINER de antes; NÃO define search_path
-- (crypt() vive no schema de extensões — preservado como estava).
create or replace function public.concremrh_verify_login(p_email text, p_password text)
  returns jsonb
  language plpgsql
  security definer
as $function$
declare rec RECORD;
begin
  select u.id, u.email, u.nome, u.perfil, u.secoes, u.senha_hash, pa.nome as perfil_acesso
    into rec
  from concremrh_usuarios u
  left join concremrh_perfis_acesso pa
    on pa.id = u.perfil_acesso_id and pa.ativo = true
  where u.email = p_email and u.ativo = true and u.senha_hash is not null;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if rec.senha_hash = crypt(p_password, rec.senha_hash) then
    return jsonb_build_object(
      'ok', true, 'id', rec.id::text, 'email', rec.email,
      'nome', rec.nome, 'perfil', rec.perfil, 'secoes', rec.secoes,
      'permissoes', public.concremrh_permissoes_efetivas(rec.id),
      'perfil_acesso', rec.perfil_acesso
    );
  end if;

  return jsonb_build_object('ok', false);
end;
$function$;

-- 5) RLS — mantém a MESMA postura das outras tabelas do projeto hoje.
-- O endurecimento real está proposto em
-- supabase/security-hardening-proposals/phase3-rls/0006_phase3_perfis_acesso.sql
-- e só pode ser aplicado depois da Fase 2 (Supabase Auth) validada.
alter table public.concremrh_perfis_acesso enable row level security;
drop policy if exists "allow_all_concremrh_perfis_acesso" on public.concremrh_perfis_acesso;
create policy "allow_all_concremrh_perfis_acesso"
  on public.concremrh_perfis_acesso as permissive for all to public using (true) with check (true);

-- 6) Perfil de exemplo (idempotente) — o caso "vê a tela e altera só o
-- realizado". Não é atribuído a ninguém; serve de ponto de partida.
insert into public.concremrh_perfis_acesso (nome, descricao, permissoes)
values (
  'Apontador de Produção',
  'Vê a apuração de produção e o histórico, e altera apenas a produção realizada (meta somente leitura).',
  '[
    "producao_setor.ver",
    "producao_setor.editar",
    "producao_setor.campo.meta.ver",
    "producao_setor.campo.realizado.ver",
    "producao_setor.campo.realizado.editar",
    "producao_historico.ver"
  ]'::jsonb
)
on conflict do nothing;

-- ============================================================================
-- ROLLBACK completo e pronto para rodar (inclui a restauração de
-- concremrh_verify_login com a definição REAL capturada em produção):
--   supabase/rollbacks/20260910000000_permissoes_granulares_rollback.sql
-- ============================================================================
