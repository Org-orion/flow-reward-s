import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Plus, RefreshCw, Download, MoreVertical, EyeOff, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { formatDateTimeBR } from '@/lib/dateTime';
import { formatNumberBR } from '@/lib/formatters';
import { useInventoryMasterData } from '../hooks/useInventoryMasterData';
import { buildConfigs } from '../components/masterdata/masterConfigs';
import { MasterDataStats } from '../components/masterdata/MasterDataStats';
import { MasterDataTabs, type TabItem } from '../components/masterdata/MasterDataTabs';
import { MasterDataToolbar } from '../components/masterdata/MasterDataToolbar';
import { MasterDataTable } from '../components/masterdata/MasterDataTable';
import { MasterDataDetailsDrawer } from '../components/masterdata/MasterDataDetailsDrawer';
import { MasterDataForm } from '../components/masterdata/MasterDataForm';
import {
  ativoDe, norm, proximoCodigo, tituloRegistro,
  type MasterKey, type MasterCtx, type Ordenacao, type Row, type StatusFiltro,
} from '../components/masterdata/masterShared';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const KEYS: MasterKey[] = ['categorias', 'modelos', 'tamanhos', 'variantes', 'unidades', 'fornecedores'];
const TAB_LABEL: Record<MasterKey, string> = {
  categorias: 'Categorias', modelos: 'Modelos', tamanhos: 'Tamanhos', variantes: 'Variantes', unidades: 'Locais', fornecedores: 'Fornecedores',
};
const TITULO_ABA: Record<MasterKey, string> = {
  categorias: 'Categorias', modelos: 'Modelos', tamanhos: 'Tamanhos', variantes: 'Variantes', unidades: 'Locais de estoque', fornecedores: 'Fornecedores',
};
const TAB_PLACEHOLDER: Record<MasterKey, string> = {
  categorias: 'Buscar por nome...',
  modelos: 'Buscar por nome, categoria ou descrição...',
  tamanhos: 'Buscar por rótulo ou tipo...',
  variantes: 'Buscar por nome, código, categoria, modelo, tamanho ou código de barras...',
  unidades: 'Buscar por código, nome, empresa ou setor...',
  fornecedores: 'Buscar por nome, razão social, CNPJ, contato ou e-mail...',
};

/** Impacto textual da inativação, por tipo de cadastro (usa vínculos/saldo reais). */
function impactoInativar(key: MasterKey, r: Row, ctx: MasterCtx): string {
  const id = String(r.id);
  if (key === 'categorias') return `Os ${formatNumberBR(ctx.modelosDaCategoria(id).length)} modelo(s) vinculados permanecem. A categoria deixa de aparecer para novos vínculos.`;
  if (key === 'modelos') return `As ${formatNumberBR(ctx.variantesDoModelo(id).length)} variante(s) vinculadas permanecem. O modelo deixa de aceitar novas variantes.`;
  if (key === 'tamanhos') return `${formatNumberBR(ctx.variantesDoTamanho(id))} variante(s) usam este tamanho e permanecem inalteradas.`;
  if (key === 'variantes') { const sal = ctx.saldoVariante(id); return sal > 0 ? `Este item possui ${formatNumberBR(sal)} peça(s) em estoque. Inativar impede novas operações; o saldo e o histórico são preservados.` : 'O item deixa de aparecer em novas operações. O histórico é preservado.'; }
  if (key === 'unidades') { const agg = ctx.unidadeAgg(id); return agg.pecas > 0 ? `Este local possui ${formatNumberBR(agg.pecas)} peça(s) em estoque. Inativar impede novas operações; o saldo e o histórico são preservados.` : 'O local deixa de aceitar novas operações. O histórico é preservado.'; }
  const vinc = ctx.variantesDoFornecedor(id); return `${formatNumberBR(vinc.total)} item(ns) vinculado(s) permanecem. O fornecedor deixa de aparecer para novos vínculos.`;
}

/** Colunas de exportação por aba (texto puro, a partir dos dados reais). */
function linhasExport(key: MasterKey, rows: Row[], ctx: MasterCtx): { header: string[]; linhas: string[][] } {
  const st = (r: Row) => (ativoDe(r) ? 'Ativo' : 'Inativo');
  const g = (r: Row, k: string) => String(r[k] ?? '');
  if (key === 'categorias') return { header: ['Nome', 'Modelos', 'Variantes ativas', 'Status'], linhas: rows.map((r) => [g(r, 'nome'), String(ctx.modelosDaCategoria(String(r.id)).length), String(ctx.variantesAtivasDaCategoria(String(r.id))), st(r)]) };
  if (key === 'modelos') return { header: ['Nome', 'Categoria', 'Variantes', 'Status'], linhas: rows.map((r) => [g(r, 'nome'), ctx.categoriaNome(g(r, 'categoria_id')), String(ctx.variantesDoModelo(String(r.id)).length), st(r)]) };
  if (key === 'tamanhos') return { header: ['Rótulo', 'Tipo', 'Ordem', 'Variantes', 'Status'], linhas: rows.map((r) => [g(r, 'rotulo'), g(r, 'tipo') === 'CALCADO' ? 'Calçado' : 'Roupa', g(r, 'ordem'), String(ctx.variantesDoTamanho(String(r.id))), st(r)]) };
  if (key === 'variantes') return { header: ['Item', 'Código', 'Código de barras', 'Categoria', 'Modelo', 'Tamanho', 'Custo', 'Mínimo', 'Saldo total', 'Status'], linhas: rows.map((r) => { const catId = ctx.modelos.find((m) => m.id === g(r, 'modelo_id'))?.categoria_id; return [g(r, 'nome'), g(r, 'codigo_interno'), g(r, 'codigo_barras'), ctx.categoriaNome(catId), ctx.modeloNome(g(r, 'modelo_id')), ctx.tamanhoLabel(g(r, 'tamanho_id')), g(r, 'custo_unitario'), g(r, 'estoque_minimo_padrao'), String(ctx.saldoVariante(String(r.id))), st(r)]; }) };
  if (key === 'unidades') return { header: ['Código', 'Nome', 'Empresa', 'Setor', 'Peças', 'Itens', 'Status'], linhas: rows.map((r) => { const a = ctx.unidadeAgg(String(r.id)); return [g(r, 'codigo'), g(r, 'nome'), ctx.empresaNome(g(r, 'empresa_id')), ctx.setorNome(g(r, 'setor_id')), String(a.pecas), String(a.itens), st(r)]; }) };
  return { header: ['Razão social', 'Nome fantasia', 'CNPJ', 'Contato', 'E-mail', 'Telefone', 'Itens vinculados', 'Status'], linhas: rows.map((r) => [g(r, 'razao_social'), g(r, 'nome_fantasia'), g(r, 'cnpj'), g(r, 'contato'), g(r, 'email'), g(r, 'telefone'), String(ctx.variantesDoFornecedor(String(r.id)).total), st(r)]) };
}

/** Central de dados-mestre do Controle de Estoque (categorias, modelos, tamanhos, variantes, locais, fornecedores). */
export function CadastrosView() {
  const data = useInventoryMasterData();
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('est_cadastros');
  const [sp, setSp] = useSearchParams();

  const tabParam = sp.get('tab') as MasterKey | null;
  const tab: MasterKey = tabParam && KEYS.includes(tabParam) ? tabParam : 'categorias';
  const setTab = (k: MasterKey) => { const next = new URLSearchParams(sp); next.set('tab', k); setSp(next, { replace: true }); };

  // Estado da barra de ferramentas (por sessão de aba).
  const [buscaRaw, setBuscaRaw] = useState('');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('todos');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('nome');
  const [soPendencias, setSoPendencias] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { const t = setTimeout(() => setBusca(buscaRaw), 300); return () => clearTimeout(t); }, [buscaRaw]);
  // Reset ao trocar de aba.
  useEffect(() => { setBuscaRaw(''); setBusca(''); setStatus('todos'); setSoPendencias(false); setOrdenacao('nome'); setPage(1); }, [tab]);
  // Reset de página ao mudar filtros.
  useEffect(() => { setPage(1); }, [busca, status, soPendencias, ordenacao]);

  // Diálogos.
  const [form, setForm] = useState<{ open: boolean; editing: Row | null }>({ open: false, editing: null });
  const [detalhe, setDetalhe] = useState<Row | null>(null);
  const [inativar, setInativar] = useState<Row | null>(null);
  const [excluir, setExcluir] = useState<Row | null>(null);

  const configs = useMemo(() => buildConfigs(data.ctx, data.opcoes), [data.ctx, data.opcoes]);
  const cfg = configs[tab];

  const tabItems: TabItem[] = useMemo(() => KEYS.map((k) => {
    const c = configs[k];
    return { key: k, label: TAB_LABEL[k], icon: c.icon, count: c.rows.length, pendencias: c.rows.filter((r) => c.pendencias(r).length > 0).length };
  }), [configs]);

  // Filtragem + ordenação + paginação da aba ativa.
  const filtradas = useMemo(() => {
    const q = norm(busca.trim());
    let rows = cfg.rows.filter((r) => {
      if (status === 'ativos' && !ativoDe(r)) return false;
      if (status === 'inativos' && ativoDe(r)) return false;
      if (soPendencias && cfg.pendencias(r).length === 0) return false;
      if (q && !cfg.searchText(r).includes(q)) return false;
      return true;
    });
    const nome = (r: Row) => tituloRegistro(tab, r);
    const upd = (r: Row) => String(r.updated_at ?? r.created_at ?? '');
    rows = [...rows].sort((a, b) => {
      if (ordenacao === 'recentes') return upd(b).localeCompare(upd(a));
      if (ordenacao === 'pendencias') { const d = cfg.pendencias(b).length - cfg.pendencias(a).length; if (d !== 0) return d; }
      return nome(a).localeCompare(nome(b), 'pt-BR');
    });
    return rows;
  }, [cfg, tab, busca, status, soPendencias, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const pagina = useMemo(() => filtradas.slice((page - 1) * pageSize, page * pageSize), [filtradas, page, pageSize]);
  const pendenciasAba = useMemo(() => cfg.rows.filter((r) => cfg.pendencias(r).length > 0).length, [cfg]);
  const temFiltro = buscaRaw.trim() !== '' || status !== 'todos' || soPendencias || ordenacao !== 'nome';
  const limpar = () => { setBuscaRaw(''); setBusca(''); setStatus('todos'); setSoPendencias(false); setOrdenacao('nome'); };

  // Código automático (só na criação): UN (não editável) / VAR (editável).
  const defaults = useMemo<Record<string, unknown> | undefined>(() => {
    if (tab === 'unidades') return { codigo: proximoCodigo(data.ctx.unidades.map((u) => u.codigo), 'UN') };
    if (tab === 'variantes') return { codigo_interno: proximoCodigo(data.ctx.variantes.map((v) => v.codigo_interno), 'VAR') };
    return undefined;
  }, [tab, data.ctx.unidades, data.ctx.variantes]);

  const salvar = async (valores: Record<string, unknown>): Promise<boolean> => {
    const payload = { ...valores };
    if (tab === 'tamanhos' && !form.editing) {
      const maxOrdem = data.ctx.tamanhos.reduce((m, t) => Math.max(m, Number(t.ordem ?? 0)), 0);
      payload.ordem = maxOrdem + 1;
    }
    return form.editing ? data.atualizar(tab, String(form.editing.id), payload) : data.criar(tab, payload);
  };

  const confirmarInativar = async () => { if (!inativar) return; const ok = await data.setAtivo(tab, String(inativar.id), false); if (ok) { setInativar(null); setDetalhe(null); } };
  const confirmarExcluir = async () => { if (!excluir) return; const ok = await data.excluir(tab, String(excluir.id)); if (ok) { setExcluir(null); setDetalhe(null); } };
  const reativar = async (r: Row) => { const ok = await data.setAtivo(tab, String(r.id), true); if (ok) setDetalhe(null); };

  const exportar = () => {
    const { header, linhas } = linhasExport(tab, filtradas, data.ctx);
    const csv = [header, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cadastro-${tab}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const podeCriar = !cfg.criarBloqueado && acesso.podeCriar;
  const botaoNovo = (
    <Button className="gap-2" onClick={() => setForm({ open: true, editing: null })} disabled={!podeCriar}>
      <Plus className="h-4 w-4" /> {cfg.novoLabel}
    </Button>
  );

  const acoes = (
    <div className="flex items-center gap-2">
      {podeCriar ? botaoNovo : (
        <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><span tabIndex={0}>{botaoNovo}</span></TooltipTrigger><TooltipContent>{cfg.criarBloqueado}</TooltipContent></Tooltip></TooltipProvider>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {acesso.podeExportar && <DropdownMenuItem onClick={exportar} disabled={filtradas.length === 0}><Download className="mr-2 h-4 w-4" /> Exportar cadastro</DropdownMenuItem>}
          <DropdownMenuItem onClick={data.refetch}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar dados</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatus('inativos')}><EyeOff className="mr-2 h-4 w-4" /> Ver registros inativos</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <PageHeader icon={Settings} title="Cadastros do estoque" description="Gerencie categorias, modelos, tamanhos, variantes, locais de estoque e fornecedores." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{formatNumberBR(data.totais.registros)} registros</span>
        <span>{formatNumberBR(data.totais.ativos)} ativos</span>
        <span className={pendenciasAba > 0 ? 'text-status-warning' : undefined}>{formatNumberBR(pendenciasAba)} pendência(s) em {TAB_LABEL[tab].toLowerCase()}</span>
        <span>Atualizado {formatDateTimeBR(data.atualizadoEm.toISOString())}</span>
      </div>

      <MasterDataTabs tabs={tabItems} active={tab} onChange={setTab} />

      {data.error ? (
        <SectionCard title="Cadastros do estoque"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar os cadastros</p><Button variant="outline" size="sm" onClick={data.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : (
        <>
          <MasterDataStats indicators={cfg.indicators} loading={data.loading} />

          <MasterDataToolbar
            placeholder={TAB_PLACEHOLDER[tab]} buscaRaw={buscaRaw} onBusca={setBuscaRaw}
            status={status} onStatus={setStatus} ordenacao={ordenacao} onOrdenacao={setOrdenacao}
            soPendencias={soPendencias} onSoPendencias={setSoPendencias}
            resultado={filtradas.length} total={cfg.rows.length} onLimpar={limpar} temFiltro={temFiltro}
          />

          <SectionCard title={TITULO_ABA[tab]} description="Clique numa linha para ver detalhes, vínculos e auditoria." noBodyPadding>
            <div className="p-5">
              {data.loading ? (
                <div className="space-y-2.5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : cfg.rows.length === 0 ? (
                <EmptyState icon={cfg.icon} title={cfg.emptyTitle} description={cfg.emptyDescription}
                  action={podeCriar ? <Button onClick={() => setForm({ open: true, editing: null })}><Plus className="mr-2 h-4 w-4" /> {cfg.novoLabel}</Button> : undefined} />
              ) : filtradas.length === 0 ? (
                <EmptyState icon={cfg.icon} title="Nenhum resultado com os filtros" description="Ajuste a busca, o status ou limpe os filtros." action={<Button variant="outline" onClick={limpar}>Limpar filtros</Button>} />
              ) : (
                <MasterDataTable
                  cfg={cfg} pagina={pagina} total={filtradas.length}
                  page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPaginas={totalPaginas} isAdmin={isAdmin}
                  onView={setDetalhe} onEdit={(r) => setForm({ open: true, editing: r })}
                  onInativar={setInativar} onReativar={reativar} onExcluir={setExcluir}
                />
              )}
            </div>
          </SectionCard>
        </>
      )}

      <MasterDataDetailsDrawer
        row={detalhe} cfg={cfg} ctx={data.ctx} isAdmin={isAdmin}
        onOpenChange={(o) => { if (!o) setDetalhe(null); }}
        onEdit={(r) => { setDetalhe(null); setForm({ open: true, editing: r }); }}
        onInativar={setInativar} onReativar={reativar} onExcluir={setExcluir}
      />

      <MasterDataForm
        open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        title={`${form.editing ? 'Editar' : cfg.novoLabel} — ${form.editing ? tituloRegistro(tab, form.editing) : 'novo registro'}`}
        layout={cfg.formLayout} fields={cfg.fields} initial={form.editing} defaults={defaults} saving={data.saving} onSubmit={salvar}
      />

      <AlertDialog open={inativar !== null} onOpenChange={(o) => { if (!o) setInativar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar {cfg.singular}</AlertDialogTitle>
            <AlertDialogDescription>
              Inativar <strong>{inativar ? tituloRegistro(tab, inativar) : ''}</strong>? {inativar && impactoInativar(tab, inativar, data.ctx)} Você pode reativar depois — nada é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={data.saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmarInativar(); }} disabled={data.saving}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={excluir !== null} onOpenChange={(o) => { if (!o) setExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {cfg.singular}</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir definitivamente <strong>{excluir ? tituloRegistro(tab, excluir) : ''}</strong>? Esta ação não pode ser desfeita. Se houver registros vinculados, o sistema recusa a exclusão — nesse caso, inative o item em vez de excluí-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={data.saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmarExcluir(); }} disabled={data.saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
