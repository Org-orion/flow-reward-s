import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMin } from '../domain/tempo';
import { dataBR, dataCurta, nomeDiaSemanaCurto } from '../domain/agregacoes';
import type {
  LinhaDepartamento, LinhaDia, LinhaRanking, MatrizDeptoDia, ResumoExecutivo,
} from '../domain/agregacoes';
import { FaixaBadge, FAIXA_CLASSE } from './FaixaBadge';

/**
 * Tabelas do painel — as mesmas seções 3 a 6 do relatório impresso, com os
 * mesmos números, porque consomem as mesmas funções de agregação.
 *
 * A diretoria lê em formato tabular; gráfico é opcional e secundário, por isso
 * não há nenhum aqui.
 */

const num = 'text-right font-mono tabular-nums';
const vazio = (v: number) => (v > 0 ? String(v) : '—');

export function TabelaDepartamentos({ linhas, total }: { linhas: LinhaDepartamento[]; total: ResumoExecutivo }) {
  if (!linhas.length) return <Vazio />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Departamento</TableHead>
            <TableHead className="text-right">Funcion.</TableHead>
            <TableHead className="text-right">Lançam.</TableHead>
            <TableHead className="text-right">Horas extras</TableHead>
            <TableHead className="text-right">Sem extra</TableHead>
            <TableHead className="text-right">Verde</TableHead>
            <TableHead className="text-right">Amarelo</TableHead>
            <TableHead className="text-right">Vermelho</TableHead>
            <TableHead className="text-right">Ocorr.</TableHead>
            <TableHead className="text-right">Func. acima</TableHead>
            <TableHead className="text-right">Horas nas ocorr.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((d) => (
            <TableRow key={d.codigo}>
              <TableCell className="font-medium">{d.nome}</TableCell>
              <TableCell className={num}>{d.funcionarios}</TableCell>
              <TableCell className={num}>{d.lancamentos}</TableCell>
              <TableCell className={num}>{formatMin(d.extrasMin)}</TableCell>
              <TableCell className={cn(num, 'text-muted-foreground')}>{d.semExtra}</TableCell>
              <TableCell className={num}>{vazio(d.verdes)}</TableCell>
              <TableCell className={num}>{vazio(d.amarelas)}</TableCell>
              <TableCell className={num}>{vazio(d.vermelhas)}</TableCell>
              <TableCell className={cn(num, 'font-semibold')}>{d.ocorrencias}</TableCell>
              <TableCell className={num}>{d.funcionariosAcima}</TableCell>
              <TableCell className={num}>{formatMin(d.extrasNasOcorrenciasMin)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 border-primary/40 bg-muted/50 font-semibold hover:bg-muted/50">
            <TableCell>Total geral</TableCell>
            <TableCell className={num}>{total.funcionarios}</TableCell>
            <TableCell className={num}>{total.lancamentos}</TableCell>
            <TableCell className={num}>{formatMin(total.extrasMin)}</TableCell>
            <TableCell className={num}>{total.faixas.sem_extra}</TableCell>
            <TableCell className={num}>{total.faixas.verde}</TableCell>
            <TableCell className={num}>{total.faixas.amarelo}</TableCell>
            <TableCell className={num}>{total.faixas.vermelho}</TableCell>
            <TableCell className={num}>{total.ocorrencias}</TableCell>
            <TableCell className={num}>{total.funcionariosAcima}</TableCell>
            <TableCell className={num}>{formatMin(total.extrasNasOcorrenciasMin)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function TabelaDias({ linhas }: { linhas: LinhaDia[] }) {
  if (!linhas.length) return <Vazio />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dia</TableHead>
            <TableHead>Semana</TableHead>
            <TableHead className="text-right">Lançam. com extra</TableHead>
            <TableHead className="text-right">Horas extras</TableHead>
            <TableHead className="text-right">Ocorr. acima do limite</TableHead>
            <TableHead className="text-right">Horas nas ocorr.</TableHead>
            <TableHead className="text-right">Faixa vermelha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((d) => (
            <TableRow key={d.data}>
              <TableCell className="font-mono tabular-nums">{dataBR(d.data)}</TableCell>
              <TableCell className="capitalize">{d.diaSemana}</TableCell>
              <TableCell className={num}>{d.lancamentosComExtra}</TableCell>
              <TableCell className={num}>{formatMin(d.extrasMin)}</TableCell>
              <TableCell className={num}>{d.ocorrencias}</TableCell>
              <TableCell className={num}>{formatMin(d.extrasNasOcorrenciasMin)}</TableCell>
              <TableCell className={num}>{vazio(d.vermelhas)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TabelaMatriz({ matriz }: { matriz: MatrizDeptoDia }) {
  if (!matriz.departamentos.length) return <Vazio />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Departamento</TableHead>
            {matriz.dias.map((d) => (
              <TableHead key={d} className="text-right">
                <span className="font-mono tabular-nums">{dataCurta(d)}</span>
                <span className="block text-[10px] font-normal opacity-70">{nomeDiaSemanaCurto(d)}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">Total ocorr.</TableHead>
            <TableHead className="text-right">Total horas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matriz.departamentos.map((dep) => (
            <TableRow key={dep.codigo}>
              <TableCell className="font-medium">{dep.nome}</TableCell>
              {matriz.dias.map((dia) => {
                const c = matriz.celulas.get(`${dep.codigo}|${dia}`);
                if (!c) return <TableCell key={dia} className="text-right text-muted-foreground">—</TableCell>;
                return (
                  <TableCell key={dia} className="text-right">
                    <span
                      className={cn(
                        'inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-xs tabular-nums',
                        FAIXA_CLASSE[c.temVermelha ? 'vermelho' : 'amarelo'],
                      )}
                    >
                      {c.ocorrencias} · {formatMin(c.extrasMin)}
                    </span>
                  </TableCell>
                );
              })}
              <TableCell className={cn(num, 'font-semibold')}>{dep.totalOcorrencias}</TableCell>
              <TableCell className={num}>{formatMin(dep.totalExtrasMin)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 border-primary/40 bg-muted/50 font-semibold hover:bg-muted/50">
            <TableCell>Total</TableCell>
            {matriz.dias.map((dia) => {
              let ocorr = 0;
              let min = 0;
              for (const dep of matriz.departamentos) {
                const c = matriz.celulas.get(`${dep.codigo}|${dia}`);
                if (c) { ocorr += c.ocorrencias; min += c.extrasMin; }
              }
              return (
                <TableCell key={dia} className={num}>
                  {ocorr ? `${ocorr} · ${formatMin(min)}` : '—'}
                </TableCell>
              );
            })}
            <TableCell className={num}>{matriz.totalOcorrencias}</TableCell>
            <TableCell className={num}>{formatMin(matriz.totalExtrasMin)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function TabelaRanking({ linhas, limiteVermelhoMin }: { linhas: LinhaRanking[]; limiteVermelhoMin: number }) {
  if (!linhas.length) {
    return <Vazio mensagem="Nenhum funcionário ultrapassou o limite no recorte selecionado." />;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead className="text-right">Ocorr.</TableHead>
            <TableHead className="text-right">Amarelo</TableHead>
            <TableHead className="text-right">Vermelho</TableHead>
            <TableHead className="text-right">Horas nas ocorr.</TableHead>
            <TableHead className="text-right">Maior extra</TableHead>
            <TableHead className="text-right">Dia do maior</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.matricula}>
              <TableCell className={num}>{l.posicao}</TableCell>
              <TableCell className="font-medium">{l.nome}</TableCell>
              <TableCell className="text-muted-foreground">{l.departamentoNome}</TableCell>
              <TableCell className={num}>{l.ocorrencias}</TableCell>
              <TableCell className={num}>{vazio(l.amarelas)}</TableCell>
              <TableCell className={num}>{vazio(l.vermelhas)}</TableCell>
              <TableCell className={cn(num, 'font-semibold')}>{formatMin(l.extrasNasOcorrenciasMin)}</TableCell>
              <TableCell className="text-right">
                <FaixaBadge
                  faixa={l.maiorExtraMin > limiteVermelhoMin ? 'vermelho' : 'amarelo'}
                  minutos={l.maiorExtraMin}
                />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{dataBR(l.diaDoMaior)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Vazio({ mensagem = 'Nenhum lançamento no recorte selecionado.' }: { mensagem?: string }) {
  return <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">{mensagem}</p>;
}
