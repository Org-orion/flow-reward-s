// Contratos genéricos de regras com vigência mensal ('YYYY-MM') — sem dependência
// de nenhuma feature. Compartilhados por qualquer cadastro cuja regra muda no
// tempo (Configurações de Kits, Bônus Percentual por Kits, ...).

export type VigenciaEstadoKind = 'programada' | 'atual' | 'historica';

export interface VigenciaEstado {
  state: VigenciaEstadoKind;
  label: string;
  variant: 'success' | 'warning' | 'neutral';
}

export interface VigenciaPeriodo {
  inicio: string;            // 'YYYY-MM' (vigencia_inicio)
  fim: string | null;        // 'YYYY-MM' do mês anterior à próxima vigência; null = em diante/atual
  emDiante: boolean;         // true quando não há próxima vigência
}

export interface VigenciaUso {
  competencias: number;      // competências processadas cobertas por esta regra
  resultados: number;        // resultados de premiação nessas competências
  utilizada: boolean;
}
