import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Loader2, RefreshCw, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { useOvertime } from '../components/OvertimeContext';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { OvertimeFilters } from '../components/OvertimeFilters';
import { IndicadoresResumo } from '../components/IndicadoresResumo';
import { AlertasPanel } from '../components/AlertasPanel';
import { FaixaLegenda } from '../components/FaixaBadge';
import {
  TabelaDepartamentos, TabelaDias, TabelaMatriz, TabelaRanking,
} from '../components/OvertimeTabelas';
import { rotuloPeriodo } from '../domain/filtros';
import { formatMin } from '../domain/tempo';

export function PainelView() {
  const acesso = useResourceAccess('he_painel');
  const navigate = useNavigate();
  const { limites, rotulos, carregando: carregandoConfig } = useOvertime();
  const d = useOvertimeData(limites, rotulos);
  const [aba, setAba] = useState('departamentos');

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => void d.recarregar()} disabled={d.carregando}>
        <RefreshCw className={d.carregando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        <span className="hidden sm:inline">Atualizar</span>
      </Button>
      {acesso.podeExportar && (
        <Button className="gap-2" onClick={() => navigate('/horas-extras/relatorios')}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Gerar relatório</span>
        </Button>
      )}
    </div>
  );

  const semDados = !d.carregando && !carregandoConfig && d.brutos.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Horas Extras"
        description={`Ponto diário por departamento · ${rotuloPeriodo(d.filtros.inicio, d.filtros.fim)}`}
        actions={acoes}
      />

      <SectionCard>
        <OvertimeFilters
          filtros={d.filtros}
          setFiltros={d.setFiltros}
          departamentos={d.departamentosDoPeriodo}
          descricao={d.descricaoFiltros}
          temFiltroAtivo={d.temFiltroAtivo}
          aplicarAtalho={d.aplicarAtalho}
          limpar={d.limparFiltros}
        />
      </SectionCard>

      {d.carregando && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando o período…
        </div>
      )}

      {semDados && (
        <EmptyState
          icon={Upload}
          title="Nenhum ponto importado neste período"
          description="Escolha outro período ou importe a exportação do Secullum para começar."
          action={<Button onClick={() => navigate('/horas-extras/importar')}>Importar ponto</Button>}
        />
      )}

      {!d.carregando && d.brutos.length > 0 && (
        <>
          <AlertasPanel alertas={d.alertas} />

          <IndicadoresResumo
            resumo={d.painel.resumo}
            verdeMaxMin={limites.verdeMaxMin}
            amareloMaxMin={limites.amareloMaxMin}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <FaixaLegenda contagens={d.painel.resumo.faixas} />
            <p className="text-xs text-muted-foreground">
              {d.lancamentos.length} de {d.brutos.length} lançamentos no filtro ·{' '}
              {formatMin(d.painel.resumo.extrasMin)} de horas extras
            </p>
          </div>

          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="departamentos">Por departamento</TabsTrigger>
              <TabsTrigger value="dias">Por dia</TabsTrigger>
              <TabsTrigger value="matriz">Departamento × dia</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="departamentos" className="mt-4">
              <SectionCard
                title="Consolidado por departamento"
                description="Ordenado pelo volume de horas extras."
                noBodyPadding
              >
                <TabelaDepartamentos linhas={d.painel.departamentos} total={d.painel.resumo} />
              </SectionCard>
            </TabsContent>

            <TabsContent value="dias" className="mt-4">
              <SectionCard
                title="Horas extras por dia"
                description="Sábado tem jornada de 4h, por isso apresenta extras proporcionalmente maiores."
                noBodyPadding
              >
                <TabelaDias linhas={d.painel.dias} />
              </SectionCard>
            </TabsContent>

            <TabsContent value="matriz" className="mt-4">
              <SectionCard
                title="Ocorrências acima do limite — departamento × dia"
                description="Cada célula traz ocorrências · horas. Em vermelho, quando há ocorrência acima da faixa amarela."
                noBodyPadding
              >
                <TabelaMatriz matriz={d.painel.matriz} />
              </SectionCard>
            </TabsContent>

            <TabsContent value="ranking" className="mt-4">
              <SectionCard
                title={`Funcionários acima de ${formatMin(limites.verdeMaxMin)}`}
                description="Ordenado pelas horas acumuladas nas ocorrências do período."
                noBodyPadding
              >
                <TabelaRanking linhas={d.painel.ranking} limiteVermelhoMin={limites.amareloMaxMin} />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
