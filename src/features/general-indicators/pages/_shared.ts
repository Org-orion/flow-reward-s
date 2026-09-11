import type { UseGeneralIndicatorsReturn } from '../hooks/useGeneralIndicators';
import type { GeneralIndicatorCardData, GeneralHistoryRow, GeneralIndicatorPoint } from '../types/general-indicators.types';
import type { GeneralIndicatorView } from '../views';

/** Props compartilhadas pelas visões — dados/estado já derivados pelo shell. */
export interface GeneralPageProps {
  data: UseGeneralIndicatorsReturn;
  competencia: string;
  setCompetencia: (c: string) => void;
  competenciasComDados: string[];
  pointsByTipo: Map<string, GeneralIndicatorPoint[]>;
  cards: GeneralIndicatorCardData[];
  historyRows: GeneralHistoryRow[];
  selectedTipoId: string;
  setSelectedTipoId: (id: string) => void;
  comparacaoCompetencia: string;
  setComparacaoCompetencia: (c: string) => void;
  onOpenDrawer: (row: GeneralHistoryRow) => void;
  onRegister: () => void;
  onEdit: (registroId: string) => void;
  onGoToView: (v: GeneralIndicatorView) => void;
  onGoToEvolution: (tipoId: string) => void;
  /** Permissões desta tela (ver src/config/permissions.ts). */
  acesso: GeneralIndicatorsAccess;
}

/** O que o usuário pode fazer nos Indicadores Gerais. */
export interface GeneralIndicatorsAccess {
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}
