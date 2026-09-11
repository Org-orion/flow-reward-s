import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompetenciaPicker } from '@/components/dashboard/CompetenciaPicker';
import { cn } from '@/lib/utils';
import { formatPercentBR } from '@/lib/formatters';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import type { IndicadorGeral } from '@/hooks/useIndicadoresGerais';
import type { TipoIndicadorGeral } from '@/hooks/useTiposIndicadoresGerais';
import { resolveIndicatorDefinition } from '../domain/indicatorDefinitions';
import { formatIndicatorValue, formatIndicatorDeviation } from '../domain/indicatorFormatting';
import { competenciaToDate, dateToCompetencia, calcularDesvio } from '../domain/indicatorCalculations';
import { calcularAtingimento, classifyGeneralSituacao } from '../domain/indicatorStatus';
import { GeneralIndicatorStatusBadge } from './GeneralIndicatorStatusBadge';

// Parsing pt-BR local (aceita vírgula decimal e separador de milhar).
function parseNumberBR(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const cleaned = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.includes(',') ? raw.replace(',', '.') : raw;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
const mask = (raw: string) => raw.replace(/[^\d.,]/g, '');

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipos: TipoIndicadorGeral[];
  editing: IndicadorGeral | null;
  defaultCompetencia: string;
  findRegistro: (tipoId: string, competencia: string) => IndicadorGeral | undefined;
  onCreate: (data: { tipo_indicador_id: string; competencia: string; meta: number; realizado: number }) => Promise<void>;
  onUpdate: (id: string, data: { meta: number; realizado: number }) => Promise<void>;
  onEditExisting: (registro: IndicadorGeral) => void;
  /** Permissões de campo (ver src/config/permissions.ts). */
  campos?: { editarMeta: boolean; editarRealizado: boolean };
}

/** Modal de registro/edição — adapta labels e formatação ao indicador selecionado. */
export function GeneralIndicatorForm({
  open, onOpenChange, tipos, editing, defaultCompetencia, findRegistro, onCreate, onUpdate, onEditExisting,
  campos = { editarMeta: true, editarRealizado: true },
}: Props) {
  const isEdit = !!editing;
  const [tipoId, setTipoId] = useState('');
  const [competencia, setCompetencia] = useState(defaultCompetencia);
  const [metaText, setMetaText] = useState('');
  const [realizadoText, setRealizadoText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTipoId(editing.tipo_indicador_id);
      setCompetencia(dateToCompetencia(editing.competencia));
      setMetaText(String(editing.meta ?? '').replace('.', ','));
      setRealizadoText(String(editing.realizado ?? '').replace('.', ','));
    } else {
      setTipoId(tipos[0]?.id ?? '');
      setCompetencia(defaultCompetencia);
      setMetaText('');
      setRealizadoText('');
    }
  }, [open, editing, defaultCompetencia, tipos]);

  const tipo = tipos.find((t) => t.id === tipoId);
  const def = resolveIndicatorDefinition(tipo?.codigo, tipo?.nome);
  const isCurrency = def.format === 'currency';

  const meta = parseNumberBR(metaText);
  const realizado = parseNumberBR(realizadoText);
  const atingimento = calcularAtingimento(realizado, meta, def.direction);
  const desvio = calcularDesvio(realizado, meta);
  const situacao = classifyGeneralSituacao(atingimento, meta != null || realizado != null);

  const duplicado = useMemo(
    () => (!isEdit && tipoId ? findRegistro(tipoId, competencia) : undefined),
    [isEdit, tipoId, competencia, findRegistro],
  );

  const metaLabel = isCurrency ? 'Meta de faturamento' : def.code === 'KITS' ? 'Meta de kits' : `Meta (${def.unit || def.label})`;
  const realizadoLabel = isCurrency ? 'Faturamento realizado' : def.code === 'KITS' ? 'Kits realizados' : `Realizado (${def.unit || def.label})`;

  // Sem nenhum campo editável não há o que salvar.
  const canSave = (campos.editarMeta || campos.editarRealizado)
    && tipoId && competencia && meta != null && realizado != null && !duplicado && !saving;

  const handleSave = async () => {
    if (!canSave || meta == null || realizado == null) return;
    setSaving(true);
    try {
      if (isEdit && editing) await onUpdate(editing.id, { meta, realizado });
      else await onCreate({ tipo_indicador_id: tipoId, competencia: competenciaToDate(competencia), meta, realizado });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar indicador' : 'Registrar indicador'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Atualize a meta e o realizado da competência.' : 'Registre a meta e o realizado de um indicador corporativo.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Indicador</label>
              <Select value={tipoId} onValueChange={setTipoId} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Competência</label>
              <CompetenciaPicker value={competencia} onChange={setCompetencia} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{metaLabel}{!campos.editarMeta && ' (somente leitura)'}</label>
              <div className="relative">
                {isCurrency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>}
                <Input inputMode="decimal" value={metaText} onChange={(e) => setMetaText(mask(e.target.value))} readOnly={!campos.editarMeta} disabled={!campos.editarMeta} className={cn('text-right tabular-nums', isCurrency && 'pl-9')} placeholder={isCurrency ? '0,00' : '0'} aria-label={campos.editarMeta ? metaLabel : `${metaLabel} (somente leitura)`} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{realizadoLabel}{!campos.editarRealizado && ' (somente leitura)'}</label>
              <div className="relative">
                {isCurrency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>}
                <Input inputMode="decimal" value={realizadoText} onChange={(e) => setRealizadoText(mask(e.target.value))} readOnly={!campos.editarRealizado} disabled={!campos.editarRealizado} className={cn('text-right tabular-nums', isCurrency && 'pl-9')} placeholder={isCurrency ? '0,00' : '0'} aria-label={campos.editarRealizado ? realizadoLabel : `${realizadoLabel} (somente leitura)`} />
                {!isCurrency && def.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{def.unit}</span>}
              </div>
            </div>
          </div>

          {/* Pré-visualização (percentual não é editável) */}
          {meta != null && realizado != null && (
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pré-visualização</span>
                <GeneralIndicatorStatusBadge situacao={situacao} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Atingimento</p><p className="font-semibold tabular-nums">{atingimento != null ? formatPercentBR(atingimento, 1) : '—'}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Desvio</p><p className="font-semibold tabular-nums">{formatIndicatorDeviation(desvio, def, { compact: true })}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Realizado</p><p className="font-semibold tabular-nums">{formatIndicatorValue(realizado, def, { compact: true })}</p></div>
              </div>
            </div>
          )}

          {duplicado && (
            <div className="flex items-start gap-2 rounded-xl border border-status-warning/40 bg-status-warning/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
              <div>
                <p className="text-foreground">{tipo?.nome} já possui registro para {competenciaLabelLong(competencia)}.</p>
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onEditExisting(duplicado)}>Editar registro existente</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button className="gap-1.5" onClick={handleSave} disabled={!canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Salvar alterações' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
