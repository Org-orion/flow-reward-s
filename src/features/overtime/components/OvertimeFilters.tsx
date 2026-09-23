import { useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ATALHO_LABEL, type AtalhoPeriodo, type FiltrosOvertime } from '../domain/filtros';
import { FAIXA_LABEL, type Faixa } from '../domain/faixas';
import { formatMin } from '../domain/tempo';

const ATALHOS: AtalhoPeriodo[] = ['ontem', 'ultimos7', 'semana_atual', 'mes_atual'];
const FAIXAS: Faixa[] = ['verde', 'amarelo', 'vermelho', 'sem_extra'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Valores oferecidos para o piso de extra — em minutos. */
const MINIMOS = [0, 60, 120, 150, 180, 240];

interface Props {
  filtros: FiltrosOvertime;
  setFiltros: (f: (anterior: FiltrosOvertime) => FiltrosOvertime) => void;
  departamentos: { codigo: string; nome: string }[];
  descricao: string[];
  temFiltroAtivo: boolean;
  aplicarAtalho: (a: AtalhoPeriodo) => void;
  limpar: () => void;
}

/**
 * Barra de filtros do painel e dos relatórios — a MESMA em ambos, porque os
 * dois consomem o mesmo recorte (domain/filtros). Período em destaque; os
 * demais ficam no popover, que é onde eles são usados de vez em quando.
 */
export function OvertimeFilters({
  filtros, setFiltros, departamentos, descricao, temFiltroAtivo, aplicarAtalho, limpar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const definir = <K extends keyof FiltrosOvertime>(k: K, v: FiltrosOvertime[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const alternar = <T,>(lista: T[], valor: T): T[] =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="he-inicio" className="text-xs text-muted-foreground">Início</Label>
          <Input
            id="he-inicio" type="date" className="h-9 w-[150px]"
            value={filtros.inicio}
            max={filtros.fim || undefined}
            onChange={(e) => definir('inicio', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="he-fim" className="text-xs text-muted-foreground">Fim</Label>
          <Input
            id="he-fim" type="date" className="h-9 w-[150px]"
            value={filtros.fim}
            min={filtros.inicio || undefined}
            onChange={(e) => definir('fim', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ATALHOS.map((a) => (
            <Button key={a} variant="outline" size="sm" className="h-9" onClick={() => aplicarAtalho(a)}>
              {ATALHO_LABEL[a]}
            </Button>
          ))}
        </div>

        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Nome ou matrícula"
            value={filtros.busca}
            onChange={(e) => definir('busca', e.target.value)}
          />
        </div>

        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <Button variant={temFiltroAtivo ? 'default' : 'outline'} className="h-9 gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {temFiltroAtivo && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{descricao.length}</Badge>}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-[340px] space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Departamentos</Label>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {departamentos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum departamento no período.</p>
                )}
                {departamentos.map((d) => (
                  <label key={d.codigo} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtros.departamentos.includes(d.codigo)}
                      onCheckedChange={() => definir('departamentos', alternar(filtros.departamentos, d.codigo))}
                    />
                    <span className="min-w-0 truncate">{d.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Faixa</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {FAIXAS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtros.faixas.includes(f)}
                      onCheckedChange={() => definir('faixas', alternar(filtros.faixas, f))}
                    />
                    {FAIXA_LABEL[f]}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="he-acima" className="text-sm font-normal">
                Somente acima do limite
              </Label>
              <Switch
                id="he-acima"
                checked={filtros.somenteAcimaDoLimite}
                onCheckedChange={(v) => definir('somenteAcimaDoLimite', v)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Extra mínimo</Label>
              <Select
                value={String(filtros.minimoExtraMin)}
                onValueChange={(v) => definir('minimoExtraMin', Number(v))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MINIMOS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m === 0 ? 'Sem piso' : `A partir de ${formatMin(m)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {/* Isolar sábado é o uso real: a jornada de 4h faz o sábado
                  produzir extras proporcionalmente maiores. */}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dia da semana</Label>
              <div className="flex flex-wrap gap-1">
                {DIAS.map((rotulo, i) => (
                  <Button
                    key={rotulo}
                    type="button"
                    size="sm"
                    variant={filtros.diasDaSemana.includes(i) ? 'default' : 'outline'}
                    className="h-8 w-11 px-0 text-xs"
                    onClick={() => definir('diasDaSemana', alternar(filtros.diasDaSemana, i))}
                  >
                    {rotulo}
                  </Button>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="sm" className="w-full" onClick={limpar} disabled={!temFiltroAtivo}>
              Limpar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {descricao.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {descricao.map((d) => (
            <Badge key={d} variant="secondary" className="font-normal">{d}</Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={limpar}>
            <X className="h-3 w-3" /> limpar
          </Button>
        </div>
      )}
    </div>
  );
}
