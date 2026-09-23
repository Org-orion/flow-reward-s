import { useLocation } from 'react-router-dom';
import { OvertimeProvider } from './OvertimeContext';
import { PainelView } from '../pages/PainelView';
import { ImportarView } from '../pages/ImportarView';
import { RelatoriosView } from '../pages/RelatoriosView';
import { HistoricoView } from '../pages/HistoricoView';
import { ConfiguracoesView } from '../pages/ConfiguracoesView';

type OvertimeView = 'painel' | 'importar' | 'relatorios' | 'historico' | 'configuracoes';
const VALIDAS = new Set<string>(['importar', 'relatorios', 'historico', 'configuracoes']);

/** Deriva a view do primeiro segmento após /horas-extras (raiz = painel). */
function viewDaRota(pathname: string): OvertimeView {
  const seg = pathname.replace(/^\/horas-extras\/?/, '').split('/')[0];
  return (VALIDAS.has(seg) ? seg : 'painel') as OvertimeView;
}

/**
 * Shell do módulo Horas Extras. A navegação entre telas fica na AppSidebar
 * global; aqui só resolvemos a rota para a view. A configuração do módulo
 * (faixas e rótulos) é carregada uma vez pelo provider e compartilhada — ver
 * OvertimeContext.
 */
export function OvertimeShell() {
  const { pathname } = useLocation();
  const view = viewDaRota(pathname);

  return (
    <OvertimeProvider>
      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {view === 'importar' ? <ImportarView />
          : view === 'relatorios' ? <RelatoriosView />
          : view === 'historico' ? <HistoricoView />
          : view === 'configuracoes' ? <ConfiguracoesView />
          : <PainelView />}
      </div>
    </OvertimeProvider>
  );
}
