-- ============================================================================
-- MÓDULO HORAS EXTRAS — base histórica do ponto diário (Secullum)
--
-- O QUE ESTE MÓDULO GUARDA
-- Um lançamento por funcionário por dia, com as batidas e os totais EXATAMENTE
-- como o Secullum apurou. O sistema NUNCA recalcula hora extra a partir das
-- batidas: `extras_min` é a coluna EXTRAS do arquivo, convertida para minutos
-- inteiros (nunca float — a soma de 484 linhas com centésimos erraria o total).
--
-- IDEMPOTÊNCIA
-- Reimportar um dia SUBSTITUI os lançamentos daquele dia. Quem faz isso é a
-- função `concremrh_ponto_importar` abaixo, em UMA transação: apagar e regravar
-- em duas chamadas do cliente deixaria o dia vazio se a segunda falhasse.
-- O registro histórico da importação anterior é preservado, ligado pela coluna
-- `substituiu_importacao_id`.
--
-- ACESSO
-- Seção nova `horas_extras` em `concremrh_usuarios.secoes`. Dado de ponto é
-- dado pessoal de trabalhador (LGPD): a leitura exige a seção, e a gravação e a
-- exclusão exigem a seção também — nenhuma política `using (true)` aqui.
--
-- Rollback: supabase/rollbacks/20260923000000_horas_extras_rollback.sql
-- ============================================================================

-- ---------------------------------------------------------------- helpers
-- `has_secao` é o helper da Fase 3 de RLS. Criado aqui de forma idempotente
-- para o módulo não depender da ordem em que as fases foram aplicadas.
do $$
begin
  if not exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'has_secao'
  ) then
    execute $fn$
      create function public.has_secao(p_secao text)
        returns boolean language sql stable security definer set search_path = public
      as $inner$
        select exists (
          select 1 from public.concremrh_usuarios u
           where u.auth_user_id = auth.uid()
             and u.ativo = true
             and (u.perfil = 'admin' or coalesce(u.secoes, '[]'::jsonb) ? p_secao)
        );
      $inner$;
    $fn$;
  end if;
end $$;

-- Id do usuário do sistema correspondente à sessão. Usado como DEFAULT das
-- colunas de autoria: se o cliente informasse quem ele é, o log de auditoria
-- seria falsificável por quem tivesse acesso à API.
create or replace function public.concremrh_usuario_atual_id()
  returns uuid language sql stable security definer set search_path = public
as $$
  select u.id from public.concremrh_usuarios u
   where u.auth_user_id = auth.uid() and u.ativo = true
   limit 1;
$$;

revoke all on function public.concremrh_usuario_atual_id() from public, anon;
grant execute on function public.concremrh_usuario_atual_id() to authenticated, service_role;

-- ---------------------------------------------------------------- tabelas

create table if not exists public.concremrh_ponto_departamentos (
  id uuid primary key default gen_random_uuid(),
  -- Texto exato do arquivo. É por ele que a conciliação casa.
  codigo_origem text not null unique,
  -- Rótulo de exibição, editável pelo administrador.
  nome_exibicao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.concremrh_ponto_funcionarios (
  id uuid primary key default gen_random_uuid(),
  -- Nº FOLHA do Secullum. Chave do funcionário: o NOME muda de grafia entre
  -- exportações e não serve de identidade.
  matricula text not null unique,
  nome text not null,
  departamento_id uuid references public.concremrh_ponto_departamentos(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.concremrh_ponto_importacoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_nome text not null,
  layout text not null check (layout in ('A', 'B')),
  data_referencia_inicio date not null,
  data_referencia_fim date not null,
  qtd_registros integer not null default 0,
  total_extras_min integer not null default 0,
  conciliacao_ok boolean not null default false,
  conciliacao_detalhe jsonb not null default '{}'::jsonb,
  -- Importação forçada por administrador apesar de divergência (ver seção 11
  -- da especificação). Fica gravado para auditoria.
  forcada boolean not null default false,
  usuario_id uuid references public.concremrh_usuarios(id) on delete set null,
  substituiu_importacao_id uuid references public.concremrh_ponto_importacoes(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint concremrh_ponto_importacoes_periodo_ck
    check (data_referencia_fim >= data_referencia_inicio)
);

create table if not exists public.concremrh_ponto_lancamentos (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.concremrh_ponto_importacoes(id) on delete cascade,
  funcionario_id uuid not null references public.concremrh_ponto_funcionarios(id) on delete cascade,
  -- Departamento DO DIA: mudança de setor é um fato do lançamento, não só do
  -- cadastro. Guardar apenas no cadastro reescreveria o passado.
  departamento_id uuid not null references public.concremrh_ponto_departamentos(id),
  data date not null,
  ent1 text, sai1 text,
  ent2 text, sai2 text,
  ent3 text, sai3 text,
  status_afastamento text,
  normais_min integer not null default 0,
  faltas_min integer not null default 0,
  extras_min integer not null default 0,
  carga_min integer not null default 0,
  faixa text not null check (faixa in ('verde', 'amarelo', 'vermelho', 'sem_extra')),
  created_at timestamptz not null default now(),
  -- Um funcionário tem um único ponto por dia. É o que torna a reimportação
  -- segura e o que impede a duplicação silenciosa de horas no relatório.
  constraint concremrh_ponto_lancamentos_func_data_uq unique (funcionario_id, data),
  -- Amarra que independe dos limites configurados pelo administrador.
  constraint concremrh_ponto_lancamentos_faixa_ck
    check ((faixa = 'sem_extra') = (extras_min <= 0))
);

create index if not exists concremrh_ponto_lancamentos_data_idx
  on public.concremrh_ponto_lancamentos (data);
create index if not exists concremrh_ponto_lancamentos_depto_data_idx
  on public.concremrh_ponto_lancamentos (departamento_id, data);
create index if not exists concremrh_ponto_lancamentos_importacao_idx
  on public.concremrh_ponto_lancamentos (importacao_id);
-- O painel filtra quase sempre por "acima do limite": índice parcial evita
-- varrer os ~40% de linhas sem extra a cada consulta.
create index if not exists concremrh_ponto_lancamentos_ocorrencias_idx
  on public.concremrh_ponto_lancamentos (data)
  where faixa in ('amarelo', 'vermelho');

create table if not exists public.concremrh_ponto_config (
  id uuid primary key default gen_random_uuid(),
  -- Linha única: a configuração é do módulo, não por usuário.
  singleton boolean not null default true unique,
  faixa_verde_max_min integer not null default 120,
  faixa_amarela_max_min integer not null default 150,
  jornadas jsonb not null default '{
    "producao": "8h de segunda a sexta e 4h no sábado (44h semanais)",
    "administracao": "8h48 em cinco dias"
  }'::jsonb,
  destinatarios_email jsonb not null default '[]'::jsonb,
  logo_url text,
  rodape text,
  updated_at timestamptz not null default now(),
  constraint concremrh_ponto_config_faixas_ck
    check (faixa_verde_max_min > 0 and faixa_amarela_max_min > faixa_verde_max_min)
);

insert into public.concremrh_ponto_config (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.concremrh_ponto_relatorios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  parametros jsonb not null default '{}'::jsonb,
  periodo_inicio date not null,
  periodo_fim date not null,
  arquivo_nome text not null,
  usuario_id uuid default public.concremrh_usuario_atual_id()
    references public.concremrh_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  enviado_em timestamptz
);

create index if not exists concremrh_ponto_relatorios_periodo_idx
  on public.concremrh_ponto_relatorios (periodo_inicio, periodo_fim);

comment on table public.concremrh_ponto_lancamentos is
  'Ponto diário por funcionário. Valores em MINUTOS INTEIROS, copiados do Secullum sem recálculo.';
comment on column public.concremrh_ponto_lancamentos.extras_min is
  'Coluna EXTRAS do Secullum em minutos. NUNCA derivada das batidas.';

-- ---------------------------------------------------------------- importação

/**
 * Grava uma importação inteira em UMA transação.
 *
 * `p_lancamentos` é um array de objetos com: matricula, nome, departamento
 * (código de origem), data, ent1..sai3, status_afastamento, normais_min,
 * faltas_min, extras_min, carga_min, faixa.
 *
 * Substituição: os lançamentos das datas do arquivo são apagados antes de
 * regravar. A importação anterior continua na tabela `importacoes`, apontada
 * por `substituiu_importacao_id` — o histórico de QUEM importou o quê não se
 * perde quando o dia é refeito.
 */
create or replace function public.concremrh_ponto_importar(
  p_arquivo_nome text,
  p_layout text,
  p_inicio date,
  p_fim date,
  p_conciliacao_ok boolean,
  p_conciliacao_detalhe jsonb,
  p_forcada boolean,
  p_lancamentos jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_importacao_id uuid;
  v_anterior_id uuid;
  v_usuario_id uuid;
  v_total_extras integer;
  v_qtd integer;
begin
  if not public.has_secao('horas_extras') then
    raise exception 'Sem permissão para importar ponto.' using errcode = '42501';
  end if;

  select u.id into v_usuario_id
    from public.concremrh_usuarios u
   where u.auth_user_id = auth.uid()
   limit 1;

  -- Importação mais recente que cobre o mesmo período (a que será substituída).
  select i.id into v_anterior_id
    from public.concremrh_ponto_importacoes i
   where i.data_referencia_inicio <= p_fim
     and i.data_referencia_fim >= p_inicio
   order by i.created_at desc
   limit 1;

  select coalesce(sum((e->>'extras_min')::int), 0), count(*)
    into v_total_extras, v_qtd
    from jsonb_array_elements(p_lancamentos) e;

  insert into public.concremrh_ponto_importacoes (
    arquivo_nome, layout, data_referencia_inicio, data_referencia_fim,
    qtd_registros, total_extras_min, conciliacao_ok, conciliacao_detalhe,
    forcada, usuario_id, substituiu_importacao_id
  ) values (
    p_arquivo_nome, p_layout, p_inicio, p_fim,
    v_qtd, v_total_extras, p_conciliacao_ok, coalesce(p_conciliacao_detalhe, '{}'::jsonb),
    coalesce(p_forcada, false), v_usuario_id, v_anterior_id
  )
  returning id into v_importacao_id;

  -- Departamentos novos entram com o nome bruto; os existentes são preservados
  -- (o administrador pode ter ajustado o rótulo e isso não pode ser desfeito).
  insert into public.concremrh_ponto_departamentos (codigo_origem, nome_exibicao)
  select distinct e->>'departamento', e->>'departamento'
    from jsonb_array_elements(p_lancamentos) e
   where coalesce(e->>'departamento', '') <> ''
  on conflict (codigo_origem) do nothing;

  -- O nome é sempre atualizado para a última grafia exportada; a matrícula é a
  -- identidade e não muda.
  insert into public.concremrh_ponto_funcionarios (matricula, nome, departamento_id)
  select distinct on (e->>'matricula')
         e->>'matricula',
         e->>'nome',
         d.id
    from jsonb_array_elements(p_lancamentos) e
    join public.concremrh_ponto_departamentos d on d.codigo_origem = e->>'departamento'
   where coalesce(e->>'matricula', '') <> ''
   -- O DISTINCT ON é obrigatório: `on conflict do update` recusa afetar a mesma
   -- linha duas vezes, e o mesmo funcionário aparece em vários dias no layout A.
   -- A ordenação fixa qual linha vence — a do dia mais recente do arquivo.
   order by e->>'matricula', e->>'data' desc
  on conflict (matricula) do update
    set nome = excluded.nome,
        departamento_id = excluded.departamento_id,
        updated_at = now();

  -- Reimportação: o dia inteiro sai antes de entrar de novo.
  --
  -- A varredura é por DATA, não por data+departamento. É o que a política de
  -- idempotência pede ("reimportar o mesmo dia substitui os registros daquele
  -- dia") e o que casa com a exportação real, que sempre traz o grupo inteiro.
  -- Consequência a respeitar: importar um arquivo com apenas alguns
  -- departamentos remove o ponto dos demais naquelas datas.
  delete from public.concremrh_ponto_lancamentos l
   where l.data in (select distinct (e->>'data')::date from jsonb_array_elements(p_lancamentos) e);

  insert into public.concremrh_ponto_lancamentos (
    importacao_id, funcionario_id, departamento_id, data,
    ent1, sai1, ent2, sai2, ent3, sai3, status_afastamento,
    normais_min, faltas_min, extras_min, carga_min, faixa
  )
  select v_importacao_id, f.id, d.id, (e->>'data')::date,
         e->>'ent1', e->>'sai1', e->>'ent2', e->>'sai2', e->>'ent3', e->>'sai3',
         e->>'status_afastamento',
         coalesce((e->>'normais_min')::int, 0),
         coalesce((e->>'faltas_min')::int, 0),
         coalesce((e->>'extras_min')::int, 0),
         coalesce((e->>'carga_min')::int, 0),
         e->>'faixa'
    from jsonb_array_elements(p_lancamentos) e
    join public.concremrh_ponto_funcionarios f on f.matricula = e->>'matricula'
    join public.concremrh_ponto_departamentos d on d.codigo_origem = e->>'departamento';

  return jsonb_build_object(
    'ok', true,
    'importacao_id', v_importacao_id,
    'substituiu', v_anterior_id,
    'registros', v_qtd,
    'total_extras_min', v_total_extras
  );
end;
$$;

revoke all on function public.concremrh_ponto_importar(text, text, date, date, boolean, jsonb, boolean, jsonb) from public, anon;
grant execute on function public.concremrh_ponto_importar(text, text, date, date, boolean, jsonb, boolean, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------- RLS

alter table public.concremrh_ponto_departamentos enable row level security;
alter table public.concremrh_ponto_funcionarios  enable row level security;
alter table public.concremrh_ponto_importacoes   enable row level security;
alter table public.concremrh_ponto_lancamentos   enable row level security;
alter table public.concremrh_ponto_config        enable row level security;
alter table public.concremrh_ponto_relatorios    enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'concremrh_ponto_departamentos', 'concremrh_ponto_funcionarios',
    'concremrh_ponto_importacoes', 'concremrh_ponto_lancamentos',
    'concremrh_ponto_config', 'concremrh_ponto_relatorios'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_secao(''horas_extras''))',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_secao(''horas_extras'')) with check (public.has_secao(''horas_extras''))',
      t || '_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- aplicação no Hub

insert into public.concremrh_hr_applications (code, name, description, icon, color, route, is_active, display_order)
select 'horas_extras',
       'Horas Extras',
       'Importação do ponto diário do Secullum, painel e relatórios gerenciais de horas extras.',
       'Clock',
       'amber',
       '/horas-extras',
       true,
       coalesce((select max(display_order) from public.concremrh_hr_applications), 0) + 1
where not exists (select 1 from public.concremrh_hr_applications where code = 'horas_extras');

-- ============================================================================
-- Validação
--   select count(*) from public.concremrh_ponto_lancamentos;              -- 0
--   select * from public.concremrh_ponto_config;                          -- 1 linha, 120/150
--   select code, route from public.concremrh_hr_applications order by display_order;
--
-- Conceder acesso a um usuário (a seção nova NÃO é dada a ninguém por padrão):
--   update public.concremrh_usuarios
--      set secoes = coalesce(secoes, '[]'::jsonb) || '["horas_extras"]'::jsonb
--    where email = 'pessoa@concrem.com.br'
--      and not (coalesce(secoes, '[]'::jsonb) ? 'horas_extras');
--   -- ou pela tela Usuários e Acessos, marcando "Horas Extras".
-- ============================================================================
