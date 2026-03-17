import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import CriarCampanha from "./pages/CriarCampanha";
import OtimizarCampanha from "./pages/OtimizarCampanha";
import GestorIA from "./pages/GestorIA";
import GestorMetaAds from "./pages/GestorMetaAds";
import ClientesMeta from "./pages/ClientesMeta";
import GestorCRM from "./pages/GestorCRM";
import Relatorios from "./pages/Relatorios";
import RelatoriosBatch from "./pages/RelatoriosBatch";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import Header from "./components/Header";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>
    <Header />
    <div className="pt-[60px]">{children}</div>
  </AuthGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/criar-campanha" element={<ProtectedRoute><CriarCampanha /></ProtectedRoute>} />
          <Route path="/otimizar-campanha" element={<ProtectedRoute><OtimizarCampanha /></ProtectedRoute>} />
          <Route path="/gestor-ia" element={<ProtectedRoute><GestorIA /></ProtectedRoute>} />
          <Route path="/gestor-meta" element={<ProtectedRoute><GestorMetaAds /></ProtectedRoute>} />
          <Route path="/clientes-meta" element={<ProtectedRoute><ClientesMeta /></ProtectedRoute>} />
          <Route path="/gestor-crm" element={<ProtectedRoute><GestorCRM /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
          <Route path="/relatorios/:batchId" element={<ProtectedRoute><RelatoriosBatch /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
