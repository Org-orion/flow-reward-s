import { useEffect, useMemo, useState } from 'react';
import { validateBonusPercentual } from '../domain/bonusPercentualValidation';
import type { BonusPercentualPayload, BonusPercentualRow } from '../types/bonus-percentual.types';

export type EditorStep = 1 | 2;

export interface BonusPercentualEditorInit {
  editing?: BonusPercentualRow | null;
  /** Preset ao "criar nova vigência a partir desta" (copia só parâmetros). */
  presetFrom?: BonusPercentualRow | null;
  seed?: string;
}

/** Aceita entrada pt-BR ("1.000,50") e devolve número ou null. */
const numOrNull = (s: string): number | null => {
  const t = s.trim().replace(/\./g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function useBonusPercentualEditor(init: BonusPercentualEditorInit, open: boolean) {
  const [step, setStep] = useState<EditorStep>(1);
  const [vigencia, setVigencia] = useState('');
  const [meta, setMeta] = useState('');
  const [bonusMeta, setBonusMeta] = useState('');
  const [bloco, setBloco] = useState('');
  const [valorBloco, setValorBloco] = useState('');
  const [semTeto, setSemTeto] = useState(true);
  const [percentualMaximo, setPercentualMaximo] = useState('');

  useEffect(() => {
    if (!open) return;
    const src = init.editing ?? init.presetFrom ?? null;
    setStep(1);
    // "Criar nova vigência a partir desta" copia parâmetros mas NÃO a vigência.
    setVigencia(init.editing?.vigenciaInicio ?? '');
    setMeta(src ? String(src.metaKits) : '');
    setBonusMeta(src ? String(src.bonusMeta) : '');
    setBloco(src ? String(src.blocoKits) : '');
    setValorBloco(src ? String(src.valorBloco) : '');
    const teto = src?.percentualMaximo ?? null;
    setSemTeto(teto == null);
    setPercentualMaximo(teto == null ? '' : String(teto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, init.editing?.id, init.seed]);

  const parsed = useMemo(() => ({
    vigenciaInicio: vigencia,
    metaKits: numOrNull(meta),
    bonusMeta: numOrNull(bonusMeta),
    blocoKits: numOrNull(bloco),
    valorBloco: numOrNull(valorBloco),
    percentualMaximo: semTeto ? null : numOrNull(percentualMaximo),
  }), [vigencia, meta, bonusMeta, bloco, valorBloco, semTeto, percentualMaximo]);

  const validation = useMemo(() => validateBonusPercentual(parsed), [parsed]);

  /** Configuração pronta para o cálculo (usada nas prévias/simulações do editor). */
  const configPreview = useMemo(() => ({
    metaKits: parsed.metaKits ?? 0,
    bonusMeta: parsed.bonusMeta ?? 0,
    blocoKits: parsed.blocoKits ?? 0,
    valorBloco: parsed.valorBloco ?? 0,
    percentualMaximo: parsed.percentualMaximo,
  }), [parsed]);

  const podePrevia = validation.valid;

  const buildPayload = (): BonusPercentualPayload => ({
    vigencia_inicio: parsed.vigenciaInicio,
    meta_kits: parsed.metaKits ?? 0,
    bonus_meta: parsed.bonusMeta ?? 0,
    bloco_kits: parsed.blocoKits ?? 0,
    valor_bloco: parsed.valorBloco ?? 0,
    percentual_maximo: parsed.percentualMaximo,
    ativo: true,
  });

  return {
    step, setStep,
    vigencia, setVigencia,
    meta, setMeta,
    bonusMeta, setBonusMeta,
    bloco, setBloco,
    valorBloco, setValorBloco,
    semTeto, setSemTeto,
    percentualMaximo, setPercentualMaximo,
    parsed, validation, configPreview, podePrevia, buildPayload,
  };
}
