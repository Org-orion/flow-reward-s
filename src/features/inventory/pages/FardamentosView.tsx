import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, PackagePlus, Plus, MoreVertical, Download, RefreshCw, Settings, AlertTriangle, Boxes } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { definirAtivoCadastro } from '../services/cadastrosApi';
import { useInventoryScreen } from '../hooks/useInventoryScreen';
import { FardamentosStats } from '../components/fardamentos/FardamentosStats';
import { FardamentosFilters } from '../components/fardamentos/FardamentosFilters';
import { FardamentosTable } from '../components/fardamentos/FardamentosTable';
import { FardamentosTableSkeleton } from '../components/fardamentos/FardamentosSkeleton';
import { FardamentoDetailsDrawer } from '../components/fardamentos/FardamentoDetailsDrawer';
import { InventorySidePanel } from '../components/fardamentos/InventorySidePanel';
import { FILTROS_VAZIO, aplicarFiltros, type Filtros } from '../components/fardamentos/filtros';
import { situacaoDaLinha, SITUACAO_LABEL } from '../components/fardamentos/situacao';
import type { FardamentoRow } from '../types/db.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

export function FardamentosView() {
  const acesso = useResourceAccess('est_fardamentos');
  const navigate = useNavigate();
  const { toast } = useToast();
  const screen = useInventoryScreen();

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIO);
  const [buscaRaw, setBuscaRaw] = useState('');
  const [drawer, setDrawer] = useState<{ f: FardamentoRow; aba: string } | null>(null);
  const [confirmInativar, setConfirmInativar] = useState<FardamentoRow | null>(null);
  const [salvando, setSalvando] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  // Debounce da busca (350ms) — não consulta o banco (filtro client-side), mas evita re-render por tecla.
  useEffect(() => {
    const t = setTimeout(() => setFiltros((prev) => ({ ...prev, busca: buscaRaw })), 350);
    return () => clearTimeout(t);
  }, [buscaRaw]);

  const rows = useMemo(() => aplicarFiltros(screen.fardamentos, filtros), [screen.fardamentos, filtros]);

  const setFiltro = <K extends keyof Filtros>(key: K, value: Filtros[K]) => setFiltros((p) => ({ ...p, [key]: value }));
  const limpar = () => { setFiltros(FILTROS_VAZIO); setBuscaRaw(''); };
  const abrir = (f: FardamentoRow, aba = 'resumo') => setDrawer({ f, aba });
  const verUnidades = () => painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const toggleAtivo = (f: FardamentoRow) => {
    if (!acesso.podeEditar) return;
    if (f.variante.ativo !== false) { setConfirmInativar(f); return; }
    aplicarAtivo(f, true);
  };
  const aplicarAtivo = async (f: FardamentoRow, ativo: boolean) => {
    if (!acesso.podeEditar) return;
    setSalvando(true);
    try {
      await definirAtivoCadastro('variantes', f.variante.id, ativo);
      toast({ title: ativo ? 'Fardamento reativado.' : 'Fardamento inativado.' });
      setConfirmInativar(null);
      screen.refetch();
    } catch (e) {
      toast({ title: 'Não foi possível concluir', description: (e as Error).message, variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  const exportarCsv = () => {
    const cab = ['Item', 'Código', 'Categoria', 'Modelo', 'Tamanho', 'Saldo total', 'Mínimo', 'Situação'];
    const linhas = rows.map((f) => [
      f.variante.nome, f.variante.codigo_interno, f.categoriaNome ?? '', f.modeloNome ?? '', f.tamanhoRotulo ?? '',
      String(f.saldoTotal), String(f.variante.estoque_minimo_padrao ?? 0), SITUACAO_LABEL[situacaoDaLinha(f)],
    ]);
    const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fardamentos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/entradas')}>
        <PackagePlus className="h-4 w-4" /> <span className="hidden sm:inline">Registrar entrada</span>
      </Button>
      <Button className="gap-2" onClick={() => navigate('/controle-estoque/cadastros')}>
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo fardamento</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {acesso.podeExportar && <DropdownMenuItem onClick={exportarCsv} disabled={rows.length === 0}><Download className="mr-2 h-4 w-4" /> Exportar CSV</DropdownMenuItem>}
          <DropdownMenuItem onClick={screen.refetch}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/cadastros')}><Settings className="mr-2 h-4 w-4" /> Cadastros de estoque</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6">
      <PageHeader icon={Shirt} title="Fardamentos" description="Controle de itens, saldos e disponibilidade por local de estoque." actions={acoes} />

      <FardamentosStats
        stats={screen.stats} loading={screen.loading} loadingMov={screen.loadingMov}
        onFiltrarAlerta={() => setFiltro('situacao', 'ATENCAO')}
        onFiltrarSemEstoque={() => setFiltro('situacao', 'SEM_ESTOQUE')}
        onVerUnidades={verUnidades}
      />

      <FardamentosFilters
        filtros={filtros} buscaRaw={buscaRaw} opcoes={screen.opcoes}
        resultado={rows.length} total={screen.fardamentos.length}
        onSetBusca={setBuscaRaw} onSetFiltro={setFiltro} onLimpar={limpar}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Itens" description="Variantes de fardamento e seus saldos.">
          {screen.error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-foreground">Não foi possível carregar os fardamentos</p>
              <Button variant="outline" size="sm" onClick={screen.refetch}>Tentar novamente</Button>
            </div>
          ) : screen.loading ? (
            <FardamentosTableSkeleton />
          ) : screen.fardamentos.length === 0 ? (
            <EmptyState icon={Boxes} title="Nenhum fardamento cadastrado"
              description="Cadastre categorias, modelos, tamanhos e variantes para começar a controlar o estoque."
              action={<Button className="gap-2" onClick={() => navigate('/controle-estoque/cadastros')}><Plus className="h-4 w-4" /> Novo fardamento</Button>} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Boxes} title="Nenhum item corresponde aos filtros"
              description="Ajuste ou limpe os filtros para ver os itens."
              action={<Button variant="outline" onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <FardamentosTable rows={rows} ultimaMov={screen.ultimaMovPorVariante} loadingMov={screen.loadingMov} onOpen={abrir} onToggleAtivo={toggleAtivo} />
          )}
        </SectionCard>

        <div ref={painelRef} className="scroll-mt-4">
          <InventorySidePanel
            fardamentos={screen.fardamentos} movimentacoes={screen.movimentacoes} porUnidade={screen.porUnidade}
            loading={screen.loading} loadingMov={screen.loadingMov} onOpen={(f) => abrir(f)}
          />
        </div>
      </div>

      <FardamentoDetailsDrawer fardamento={drawer?.f ?? null} abaInicial={drawer?.aba} onOpenChange={(o) => { if (!o) setDrawer(null); }} />

      <AlertDialog open={confirmInativar !== null} onOpenChange={(o) => { if (!o) setConfirmInativar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar fardamento</AlertDialogTitle>
            <AlertDialogDescription>
              Inativar <strong>{confirmInativar?.variante.nome}</strong>? Ele deixa de aparecer nas operações,
              mas o saldo e o histórico são preservados. Você pode reativá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (confirmInativar) aplicarAtivo(confirmInativar, false); }} disabled={salvando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
