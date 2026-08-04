// Permissões de edição/exclusão do bônus percentual — PURO.
//
// Esta regra REMUNERA (o processamento calcula as bases de kits por ela a partir da
// vigência cadastrada). Portanto vale o mesmo padrão das Configurações Kits: apenas
// regras PROGRAMADAS e NÃO UTILIZADAS podem ser alteradas. A vigente, as históricas
// e qualquer uma que já tenha governado um processamento são protegidas — o caminho
// é criar uma nova vigência, preservando a auditabilidade do que foi pago.
export {
  canEditVigencia as canEditBonusPercentual,
  canDeleteVigencia as canDeleteBonusPercentual,
  vigenciaProtectionReason as bonusPercentualProtectionReason,
} from '@/domain/vigencias/vigenciaProtecao';
