import { ChevronLeft, ChevronRight, MinusCircle, Save, Loader2, BarChart3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { INDICATOR_DEFINITIONS, INDICATOR_IDS } from '../domain/indicatorDefinitions';
import { SectorIndicatorEditor } from './SectorIndicatorEditor';
import { SectorIndicatorStatus } from './SectorIndicatorStatus';
import type { IndicatorId, SectorIndicatorRow } from '../types/sector-indicators.types';

interface Props {
  row: SectorIndicatorRow | null;
  competencia: string;
  changedIndicators: Set<IndicatorId>;
  saving: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCommit: (indicatorId: IndicatorId, field: 'meta' | 'realizado', value: string) => void;
  onRestoreIndicator: (indicatorId: IndicatorId) => void;
  onMarkSemMedicao: () => void;
  onSave: () => void;
  onSaveNext: () => void;
  onVerIndicadoresGerais: () => void;
  /** Permissões de campo desta tela (ver src/config/permissions.ts). */
  campos: { editarMeta: boolean; editarRealizado: boolean };
}

/** Drawer de apuração de um setor — os cinco indicadores + navegação e salvamento. */
export function SectorIndicatorsDrawer({
  row, competencia, changedIndicators, saving, hasPrev, hasNext,
  onClose, onPrev, onNext, onCommit, onRestoreIndicator, onMarkSemMedicao, onSave, onSaveNext, onVerIndicadoresGerais,
  campos,
}: Props) {
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;

  const preenchidos = INDICATOR_IDS.filter((id) => row.cells[id].meta != null || row.cells[id].realizado != null).length;
  const pctPreenchido = (preenchidos / INDICATOR_IDS.length) * 100;
  const podeEditar = campos.editarMeta || campos.editarRealizado;

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="truncate">{row.setorNome}</SheetTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.empresaNome || 'Empresa não informada'} · {competenciaLabelLong(competencia)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev} disabled={!hasPrev} aria-label="Setor anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext} disabled={!hasNext} aria-label="Próximo setor"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <SectorIndicatorStatus situacao={row.situacao} />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">{preenchidos} de {INDICATOR_IDS.length} indicadores preenchidos</p>
              <Progress value={pctPreenchido} className="mt-1 h-1.5" />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {INDICATOR_DEFINITIONS.map((def) => (
            <SectorIndicatorEditor
              key={def.id}
              def={def}
              cell={row.cells[def.id]}
              changed={changedIndicators.has(def.id)}
              metaBloqueada={!campos.editarMeta}
              realizadoBloqueado={!campos.editarRealizado}
              onCommit={(field, value) => onCommit(def.id, field, value)}
              onRestore={() => onRestoreIndicator(def.id)}
              onCtrlEnter={onSaveNext}
            />
          ))}

          {campos.editarRealizado && (
            <button
              type="button"
              onClick={onMarkSemMedicao}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <MinusCircle className="h-3.5 w-3.5" /> Marcar setor como sem medição (todos 100%)
            </button>
          )}

          <Button variant="ghost" className="w-full justify-center gap-1.5 text-sm text-muted-foreground" onClick={onVerIndicadoresGerais}>
            <BarChart3 className="h-4 w-4" /> Ver Indicadores Gerais
          </Button>
        </div>

        {podeEditar && (
          <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
            <Button variant="outline" className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
            <Button className="flex-1 gap-1.5" onClick={onSaveNext} disabled={saving || !hasNext}>
              Salvar e próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
