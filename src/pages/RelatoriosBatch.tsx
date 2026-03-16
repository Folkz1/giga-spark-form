import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, CheckCircle2, Clock, AlertTriangle, RefreshCw, ExternalLink,
  TrendingUp, TrendingDown, Minus, X, ChevronLeft, ChevronRight, BarChart3,
  Target, DollarSign, Percent, FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  fetchBatchClientes, fetchAnaliseCliente, retryCliente, isRevisado, setRevisado, getRevisados,
  formatCurrency, type ClienteResumo, type AnaliseCompleta,
} from "@/lib/relatorios-utils";

type StatusFilter = "todos" | "pendentes" | "revisados" | "erro";

const platformIcon = (p: string) => {
  if (p === "google_ads") return "🔵";
  if (p === "meta_ads") return "🟣";
  return "🔵🟣";
};

const platformLabel = (p: string) => {
  if (p === "google_ads") return "Google Ads";
  if (p === "meta_ads") return "Meta Ads";
  return "Google & Meta";
};

const tendenciaIcon = (t?: string) => {
  if (t === "up") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (t === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const RelatoriosBatch = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [revisadosState, setRevisadosState] = useState(0); // trigger re-renders

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerIdx, setDrawerIdx] = useState(0);
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [analiseLoading, setAnaliseLoading] = useState(false);

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchBatchClientes(batchId);
      setClientes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const getEffectiveStatus = useCallback((c: ClienteResumo) => {
    if (batchId && isRevisado(batchId, c.customerId, c.plataforma)) return "revisado";
    return c.status;
  }, [batchId, revisadosState]);

  const filtered = useMemo(() => {
    let list = clientes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.nomeCliente.toLowerCase().includes(q));
    }
    if (filter !== "todos") {
      list = list.filter(c => {
        const s = getEffectiveStatus(c);
        if (filter === "pendentes") return s === "pronto" || s === "processando";
        if (filter === "revisados") return s === "revisado";
        if (filter === "erro") return s === "erro";
        return true;
      });
    }
    return list;
  }, [clientes, search, filter, getEffectiveStatus]);

  const revisadosCount = useMemo(() => {
    if (!batchId) return 0;
    return clientes.filter(c => getEffectiveStatus(c) === "revisado").length;
  }, [clientes, batchId, getEffectiveStatus]);

  // Drawer logic
  const openDrawer = async (idx: number) => {
    setDrawerIdx(idx);
    setDrawerOpen(true);
    await loadAnalise(filtered[idx]);
  };

  const loadAnalise = async (c: ClienteResumo) => {
    if (!batchId) return;
    setAnalise(null);
    setAnaliseLoading(true);
    try {
      const data = await fetchAnaliseCliente(batchId, c.customerId, c.plataforma);
      setAnalise(data);
    } catch {
      setAnalise({ raw: "Erro ao carregar análise. Tente novamente." });
    } finally {
      setAnaliseLoading(false);
    }
  };

  const navDrawer = (dir: -1 | 1) => {
    const next = drawerIdx + dir;
    if (next >= 0 && next < filtered.length) {
      setDrawerIdx(next);
      loadAnalise(filtered[next]);
    }
  };

  const toggleRevisado = () => {
    if (!batchId) return;
    const c = filtered[drawerIdx];
    if (!c) return;
    const currentlyRevisado = isRevisado(batchId, c.customerId, c.plataforma);
    setRevisado(batchId, c.customerId, c.plataforma, !currentlyRevisado);
    setRevisadosState(s => s + 1);
  };

  const handleRetry = async (c: ClienteResumo) => {
    if (!batchId) return;
    try {
      await retryCliente(batchId, c.customerId, c.plataforma);
      load();
    } catch {}
  };

  const currentCliente = filtered[drawerIdx];
  const currentRevisado = batchId && currentCliente ? isRevisado(batchId, currentCliente.customerId, currentCliente.plataforma) : false;

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "Todos", value: "todos" },
    { label: "Pendentes", value: "pendentes" },
    { label: "Revisados", value: "revisados" },
    { label: "Com Erro", value: "erro" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "revisado":
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Revisado</Badge>;
      case "pronto":
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs"><Clock className="w-3 h-3 mr-1" />Pronto para revisão</Badge>;
      case "processando":
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-xs"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case "erro":
        return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return null;
    }
  };

  const sections: { key: keyof AnaliseCompleta; emoji: string; title: string; accent?: string }[] = [
    { key: "visaoGeral", emoji: "📊", title: "Visão Geral" },
    { key: "performanceCampanhas", emoji: "📈", title: "Performance de Campanhas" },
    { key: "recomendacoes", emoji: "🎯", title: "Recomendações", accent: "bg-blue-500/5 border border-blue-500/20" },
    { key: "alertas", emoji: "⚠️", title: "Alertas", accent: "bg-amber-500/5 border border-amber-500/20" },
    { key: "orcamento", emoji: "💰", title: "Orçamento" },
  ];

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/relatorios")} className="gap-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/relatorios")}>Relatórios</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Batch {batchId?.substring(0, 8)}</span>
          </div>
        </div>

        {/* Progress */}
        {!loading && clientes.length > 0 && (
          <div className="glass-card rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso de revisão</span>
              <span className="text-sm font-bold text-primary">{revisadosCount} de {clientes.length} revisados</span>
            </div>
            <Progress value={(revisadosCount / clientes.length) * 100} className="h-2.5 bg-secondary" />
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex flex-wrap gap-2 flex-1">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary/50 border-border/50"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-medium mb-4">{error}</p>
            <Button onClick={load} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> Tentar novamente</Button>
          </div>
        )}

        {/* Client grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((c, idx) => {
                const status = getEffectiveStatus(c);
                const borderColor = status === "revisado" ? "border-emerald-500/30" : status === "erro" ? "border-red-500/30" : status === "processando" ? "border-blue-500/30" : "border-amber-500/30";
                return (
                  <motion.div
                    key={`${c.customerId}-${c.plataforma}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    className={`glass-card rounded-2xl p-5 border ${borderColor} hover:shadow-lg transition-all group`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate">{c.nomeCliente}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{platformIcon(c.plataforma)} {platformLabel(c.plataforma)}</p>
                      </div>
                      {statusBadge(status)}
                    </div>

                    {/* Metrics */}
                    {c.resumoMetricas && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {c.resumoMetricas.investimento != null && (
                          <div className="bg-secondary/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5"><DollarSign className="w-3 h-3" />Investimento</div>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(c.resumoMetricas.investimento)}</p>
                          </div>
                        )}
                        {c.resumoMetricas.cpa != null && (
                          <div className="bg-secondary/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5"><Target className="w-3 h-3" />CPA</div>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(c.resumoMetricas.cpa)}</p>
                          </div>
                        )}
                        {c.resumoMetricas.cpl != null && (
                          <div className="bg-secondary/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5"><Target className="w-3 h-3" />CPL</div>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(c.resumoMetricas.cpl)}</p>
                          </div>
                        )}
                        {c.resumoMetricas.roas != null && (
                          <div className="bg-secondary/50 rounded-lg p-2.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5"><Percent className="w-3 h-3" />ROAS</div>
                            <p className="text-sm font-bold text-foreground">{c.resumoMetricas.roas.toFixed(2)}x</p>
                          </div>
                        )}
                        {c.resumoMetricas.tendencia && (
                          <div className="bg-secondary/50 rounded-lg p-2.5 flex items-center gap-2">
                            {tendenciaIcon(c.resumoMetricas.tendencia)}
                            <span className="text-xs text-muted-foreground">
                              {c.resumoMetricas.tendencia === "up" ? "Melhorou" : c.resumoMetricas.tendencia === "down" ? "Piorou" : "Estável"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {status === "erro" ? (
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleRetry(c)}>
                          <RefreshCw className="w-3.5 h-3.5" /> Reprocessar
                        </Button>
                      ) : status !== "processando" ? (
                        <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => openDrawer(idx)}>
                          <BarChart3 className="w-3.5 h-3.5" /> Ver Análise Completa
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && clientes.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado com os filtros atuais.</div>
        )}
      </div>

      {/* Analysis Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[70vw] sm:max-w-[70vw] p-0 flex flex-col">
          {currentCliente && (
            <>
              {/* Drawer Header */}
              <SheetHeader className="p-5 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg font-bold truncate">
                      {platformIcon(currentCliente.plataforma)} {currentCliente.nomeCliente}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{platformLabel(currentCliente.plataforma)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={currentRevisado ? "default" : "outline"}
                      onClick={toggleRevisado}
                      className={`text-xs gap-1.5 transition-all ${currentRevisado ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {currentRevisado ? "Revisado ✓" : "Marcar Revisado"}
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {analiseLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                )}

                {!analiseLoading && analise && (
                  <Accordion type="multiple" defaultValue={sections.map(s => s.key)} className="space-y-3">
                    {sections.map(sec => {
                      const content = analise[sec.key];
                      if (!content) return null;
                      return (
                        <AccordionItem key={sec.key} value={sec.key} className={`rounded-xl overflow-hidden border-none ${sec.accent || "glass-card"}`}>
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>{sec.emoji} {sec.title}</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="prose prose-invert prose-sm max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {content}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                    {analise.raw && !sections.some(s => analise[s.key]) && (
                      <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                        {analise.raw}
                      </div>
                    )}
                  </Accordion>
                )}
              </div>

              {/* Drawer footer */}
              <div className="border-t border-border p-4 flex items-center justify-between shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={drawerIdx <= 0}
                  onClick={() => navDrawer(-1)}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{drawerIdx + 1} de {filtered.length} clientes</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={drawerIdx >= filtered.length - 1}
                  onClick={() => navDrawer(1)}
                  className="gap-1 text-xs"
                >
                  Próximo <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RelatoriosBatch;
