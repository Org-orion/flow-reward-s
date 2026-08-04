import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import HubRH from "./pages/HubRH";
import { Dashboard } from "./pages/Dashboard";
import { Funcionarios } from "./pages/Funcionarios";
import { DSS } from "./pages/DSS";
import { EPI } from "./pages/EPI";
import { FaltasAdvertencias } from "./pages/FaltasAdvertencias";
import { ProducaoSetor } from "./pages/ProducaoSetor";
import { IndicadoresSetor } from "./pages/IndicadoresSetor";
import { IndicadoresGerais } from "./pages/IndicadoresGerais";
import { Setores } from "./pages/cadastros/Setores";
import { Faixas } from "./pages/cadastros/Faixas";
import { Funcoes } from "./pages/cadastros/Funcoes";
import { Categorias } from "./pages/cadastros/Categorias";
import { BasePremiacao } from "./pages/cadastros/BasePremiacao";
import { Empresas } from "./pages/cadastros/Empresas";
import { TiposIndicadores } from "./pages/cadastros/TiposIndicadores";
import { TiposIndicadoresGerais } from "./pages/cadastros/TiposIndicadoresGerais";
import { LocaisDSS } from "./pages/cadastros/LocaisDSS";
import FormulasCalculo from "./pages/cadastros/FormulasCalculo";
import ConfiguracoesKits from "./pages/cadastros/ConfiguracoesKits";
import ConfiguracoesBonusPercentual from "./pages/cadastros/ConfiguracoesBonusPercentual";
import GerarPremiacoes from "./pages/GerarPremiacoes";
import RelatorioPremiacao from "./pages/RelatorioPremiacao";
import CargosSalariosDashboard from "./pages/cargos-salarios/Dashboard";
import Cargos from "./pages/cargos-salarios/Cargos";
import FuncionariosCargosSalarios from "./pages/cargos-salarios/Funcionarios";
import ControleEstoque from "./pages/controle-estoque/ControleEstoque";
import { IndicadoresRH } from "./pages/IndicadoresRH";
import Usuarios from "./pages/cadastros/Usuarios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Hub - admin e rh apenas */}
            <Route path="/" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <HubRH />
              </ProtectedRoute>
            } />

            {/* Premiações - SESMT */}
            <Route path="/premiacoes/dss" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'sesmt']}>
                <MainLayout><DSS /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/epi" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'sesmt']}>
                <MainLayout><EPI /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Premiações - PRODUÇÃO */}
            <Route path="/premiacoes/producao-setor" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'producao']}>
                <MainLayout><ProducaoSetor /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/indicadores-setor" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'producao']}>
                <MainLayout><IndicadoresSetor /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/indicadores-gerais" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'producao']}>
                <MainLayout><IndicadoresGerais /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Premiações - RH/Admin */}
            <Route path="/premiacoes" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Dashboard /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/funcionarios" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Funcionarios /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/faltas-advertencias" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><FaltasAdvertencias /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/gerar-premiacoes" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><GerarPremiacoes /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/relatorio-premiacoes" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><RelatorioPremiacao /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Cadastros - Admin/RH */}
            <Route path="/premiacoes/cadastros/setores" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Setores /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/faixas" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Faixas /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/funcoes" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Funcoes /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/categorias" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Categorias /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/base-premiacao" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><BasePremiacao /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/empresas" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Empresas /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/tipos-indicadores" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><TiposIndicadores /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/tipos-indicadores-gerais" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><TiposIndicadoresGerais /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/locais-dss" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><LocaisDSS /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/formulas-calculo" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><FormulasCalculo /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/configuracoes-kits" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><ConfiguracoesKits /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/premiacoes/cadastros/bonus-percentual" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><ConfiguracoesBonusPercentual /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Cargos e Salários - Admin/RH */}
            <Route path="/cargos-salarios" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><CargosSalariosDashboard /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/cargos-salarios/cargos" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Cargos /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/cargos-salarios/funcionarios" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><FuncionariosCargosSalarios /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/cargos-salarios/cadastros/setores" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh']}>
                <MainLayout><Setores /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Usuários - Admin apenas */}
            <Route path="/cadastros/usuarios" element={
              <ProtectedRoute allowedPerfis={['admin']}>
                <MainLayout><Usuarios /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Controle de Estoque — acesso pela SEÇÃO 'estoque' (admin bypassa). Concessão via Usuários e Acessos. */}
            <Route path="/controle-estoque" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/fardamentos" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/entradas" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/entregas" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/devolucoes" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/troca" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/ajuste" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/movimentacoes" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/alertas" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/estornos" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/controle-estoque/cadastros" element={
              <ProtectedRoute section="estoque">
                <MainLayout><ControleEstoque /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Indicadores RH - landing do módulo */}
            <Route path="/indicadores-rh" element={
              <ProtectedRoute allowedPerfis={['admin', 'rh', 'producao']}>
                <MainLayout><IndicadoresRH /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
