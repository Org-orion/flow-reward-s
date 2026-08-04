// Tipos da Central de Bônus Percentual por Kits. Só contratos.
//
// Entidade `ConfiguracaoBonusPercentual`
// (tabela `concremrh_configuracoes_bonus_percentual`): id, vigencia_inicio
// ('YYYY-MM'), meta_kits, bonus_meta, bloco_kits, valor_bloco,
// percentual_maximo?, ativo, created_at, updated_at. Exclusão SOFT.
// Vigência é ÚNICA no banco (unique constraint → erro 23505).
//
// REGRA (ver `domain/bonusPercentualCalculo.ts`):
//   - O adicional só age DEPOIS da meta: excedente = max(0, kits − meta_kits).
//   - Percentual = excedente / bloco_kits (PROPORCIONAL — frações contam).
//   - Adicional = percentual × valor_bloco; total = bonus_meta + adicional.
//   - `percentual_maximo` (quando informado) É aplicado como teto.
//
// ⚠️ Esta regra REMUNERA: a partir da vigência cadastrada, o processamento calcula
// as bases de kits por `@/domain/premiacao/bonusPercentualKits` em vez do modelo de
// faixas (`calcularComissao`). Competências anteriores seguem no modelo de faixas.
import type {
  VigenciaEstado,
  VigenciaEstadoKind,
  VigenciaPeriodo,
  VigenciaUso,
} from '@/domain/vigencias/vigenciaTypes';

export type BonusPercentualStateKind = VigenciaEstadoKind;
export type BonusPercentualState = VigenciaEstado;
export type BonusPercentualPeriod = VigenciaPeriodo;
export type BonusPercentualUsage = VigenciaUso;

/** Registro cru da tabela (nomes do banco). */
export interface ConfiguracaoBonusPercentualDB {
  id: string;
  vigencia_inicio: string;
  meta_kits: number;
  bonus_meta: number;
  bloco_kits: number;
  valor_bloco: number;
  percentual_maximo?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/** Payload de escrita (create/update). */
export type BonusPercentualPayload = Omit<ConfiguracaoBonusPercentualDB, 'id' | 'created_at' | 'updated_at'>;

/** Linha enriquecida para a UI (período efetivo + estado derivados). */
export interface BonusPercentualRow {
  id: string;
  vigenciaInicio: string;          // 'YYYY-MM'
  metaKits: number;
  bonusMeta: number;
  blocoKits: number;
  valorBloco: number;
  percentualMaximo: number | null; // null = sem teto
  createdAt: string | null;
  updatedAt: string | null;
  sentinela: boolean;              // vigência-sentinela ("regra inicial", ex.: 2000-01)
  period: BonusPercentualPeriod;
  state: BonusPercentualState;
  usage: BonusPercentualUsage;     // competências/resultados já governados por esta regra
  duplicado: boolean;              // (defensivo) outra regra ativa com a mesma vigência
}
