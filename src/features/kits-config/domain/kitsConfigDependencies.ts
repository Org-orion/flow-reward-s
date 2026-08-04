// Utilização e retroatividade — agregação EM LOTE (sem N+1). Puro.
//
// Não há FK resultado→config. A utilização é derivada: para cada competência já
// processada (distinta em resultados de kits), qual config a governa (seleção por
// vigência). Isso marca as configs efetivamente aplicadas.
//
// A lógica é compartilhada com a central de Bônus Percentual e vive em
// `@/domain/premiacao/usoConfigPorCompetencia`. Este módulo mantém os nomes usados
// pela feature.
export {
  competenciasProcessadas,
  buildConfigUsage,
  competenciasAfetadasPorRetroatividade,
  type CompetenciaStats,
} from '@/domain/premiacao/usoConfigPorCompetencia';
