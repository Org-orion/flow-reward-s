import { BonusPercentualShell } from '@/features/bonus-percentual/components/BonusPercentualShell';

/**
 * Rota /premiacoes/cadastros/bonus-percentual — Bônus Percentual por Kits.
 * A orquestração vive na feature `bonus-percentual`; esta página apenas monta o
 * shell. Cadastro separado das Configurações de Kits e sem efeito no motor
 * (`src/domain/premiacao/calculoPremiacao.ts`).
 */
const ConfiguracoesBonusPercentual = () => <BonusPercentualShell />;

export default ConfiguracoesBonusPercentual;
