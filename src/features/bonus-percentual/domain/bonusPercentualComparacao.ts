// Comparação de parâmetros entre duas regras de bônus percentual — PURO. Sem mesclar.
export interface BonusPercentualCompareInput {
  metaKits: number;
  bonusMeta: number;
  blocoKits: number;
  valorBloco: number;
  percentualMaximo: number | null;
}

export type BonusPercentualParamKind = 'kits' | 'currency' | 'percent';

export interface BonusPercentualDiffRow {
  key: keyof BonusPercentualCompareInput;
  label: string;
  kind: BonusPercentualParamKind;
  a: number | null;
  b: number | null;
  deltaAbs: number | null;    // b - a (null quando algum lado é null)
  deltaPct: number | null;    // (b-a)/a * 100, 1 casa
  changed: boolean;
}

const FIELDS: { key: keyof BonusPercentualCompareInput; label: string; kind: BonusPercentualParamKind }[] = [
  { key: 'metaKits', label: 'Meta de kits', kind: 'kits' },
  { key: 'bonusMeta', label: 'Bônus ao bater a meta', kind: 'currency' },
  { key: 'blocoKits', label: 'Bloco de kits', kind: 'kits' },
  { key: 'valorBloco', label: 'Valor por bloco (100%)', kind: 'currency' },
  { key: 'percentualMaximo', label: 'Percentual máximo', kind: 'percent' },
];

export function diffBonusPercentualParams(
  a: BonusPercentualCompareInput,
  b: BonusPercentualCompareInput,
): BonusPercentualDiffRow[] {
  return FIELDS.map(f => {
    const va = a[f.key];
    const vb = b[f.key];
    const bothNum = typeof va === 'number' && typeof vb === 'number';
    const deltaAbs = bothNum ? vb - va : null;
    const deltaPct = bothNum && va !== 0 ? Math.round(((vb - va) / va) * 1000) / 10 : null;
    return { key: f.key, label: f.label, kind: f.kind, a: va ?? null, b: vb ?? null, deltaAbs, deltaPct, changed: va !== vb };
  });
}
