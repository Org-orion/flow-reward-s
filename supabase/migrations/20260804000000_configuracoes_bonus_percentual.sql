-- Configurações de BÔNUS PERCENTUAL por kits, com vigência mensal.
--
-- Cadastro SEPARADO da regra de faixas (`concremrh_configuracoes_kits`). Modela o
-- adicional que passa a valer DEPOIS de a meta ser batida:
--
--   excedente  = max(0, kits - meta_kits)
--   percentual = excedente / bloco_kits            (proporcional, conta fração)
--   adicional  = percentual * valor_bloco
--   total      = bonus_meta + adicional
--
-- Ex.: meta 11.000 · bloco 1.000 · valor R$ 100 · bônus da meta R$ 100
--   11.000 kits →   0% → R$   0,00 adicional → total R$ 100,00
--   11.500 kits →  50% → R$  50,00 adicional → total R$ 150,00
--   13.500 kits → 250% → R$ 250,00 adicional → total R$ 350,00
--
-- ⚠️ Esta tabela ainda NÃO é lida pelo motor de premiação
-- (`src/domain/premiacao/calculoPremiacao.ts`): serve para cadastro, vigências e
-- simulação. A troca do modelo aplicado no processamento é decisão separada.
create table if not exists concremrh_configuracoes_bonus_percentual (
  id uuid default gen_random_uuid() primary key,
  vigencia_inicio text not null,                       -- 'YYYY-MM' (mês a partir do qual vale)
  meta_kits integer not null,                          -- meta a partir da qual o adicional age (ex.: 11000)
  bonus_meta numeric not null default 0,               -- valor já pago ao bater a meta (ex.: 100)
  bloco_kits integer not null,                         -- tamanho do bloco de kits (ex.: 1000)
  valor_bloco numeric not null,                        -- valor de 1 bloco completo = 100% (ex.: 100)
  percentual_maximo numeric,                           -- teto do percentual (null = sem teto); APLICADO no cálculo
  ativo boolean not null default true,                 -- exclusão é SOFT (ativo = false)
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint concremrh_conf_bonus_pct_vigencia_uq unique (vigencia_inicio),
  constraint concremrh_conf_bonus_pct_meta_ck check (meta_kits > 0),
  constraint concremrh_conf_bonus_pct_bloco_ck check (bloco_kits > 0),
  constraint concremrh_conf_bonus_pct_valor_ck check (valor_bloco >= 0),
  constraint concremrh_conf_bonus_pct_bonus_meta_ck check (bonus_meta >= 0),
  constraint concremrh_conf_bonus_pct_teto_ck check (percentual_maximo is null or percentual_maximo > 0)
);

create index if not exists concremrh_conf_bonus_pct_ativo_vig_idx
  on concremrh_configuracoes_bonus_percentual (ativo, vigencia_inicio desc);

-- Mantém updated_at coerente nas edições (mesmo padrão das demais tabelas).
create or replace function concremrh_conf_bonus_pct_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists concremrh_conf_bonus_pct_updated_at
  on concremrh_configuracoes_bonus_percentual;

create trigger concremrh_conf_bonus_pct_updated_at
  before update on concremrh_configuracoes_bonus_percentual
  for each row execute function concremrh_conf_bonus_pct_touch_updated_at();

-- RLS — mesmo padrão da tabela de configurações de kits.
alter table concremrh_configuracoes_bonus_percentual enable row level security;

drop policy if exists "Acesso total para usuários autenticados"
  on concremrh_configuracoes_bonus_percentual;

create policy "Acesso total para usuários autenticados"
  on concremrh_configuracoes_bonus_percentual
  for all
  using (true)
  with check (true);
