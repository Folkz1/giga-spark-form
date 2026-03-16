import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, CheckCircle2, AlertTriangle, RefreshCw, X, ChevronLeft, ChevronRight,
  BarChart3, Target, DollarSign, TrendingUp, ExternalLink, Zap, Eye, Crosshair,
  LayoutGrid, FileText, Shield, BarChart2, Users, Lightbulb, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ClickUpTaskModal } from "@/components/ClickUpTaskModal";
import {
  fetchBatchClientes, fetchAnaliseCliente, retryCliente, isRevisado, setRevisado, getRevisados,
  formatCurrency, formatNumber, formatPercent, scoreOrder, getPlataformaData,
  type ClienteResumo, type AnaliseCompleta, type BatchDetailResponse, type Recomendacao,
} from "@/lib/relatorios-utils";

type StatusFilter = "todos" | "critico" | "atencao" | "saudavel" | "erro";

const scoreBadgeStyle = (score: string) => {
  switch (score) {
    case "CRITICO": return "bg-red-500/15 text-red-400 border-red-500/25";
    case "ATENCAO": return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    case "SAUDAVEL": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    default: return "bg-secondary text-muted-foreground";
  }
};

const prioridadeBadge = (p: string) => {
  switch (p) {
    case "urgent": return "bg-red-500/15 text-red-400 border-red-500/25";
    case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/25";
    case "medium": return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    default: return "bg-secondary text-muted-foreground";
  }
};

const tipoBadge = (t: string) => {
  const map: Record<string, string> = {
    TRACKING: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    CRIATIVO: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    PAUSAR: "bg-red-500/15 text-red-400 border-red-500/25",
    OTIMIZACAO: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    TESTAR: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    ESCALAR: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    CORRIGIR: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  };
  return map[t] || "bg-secondary text-muted-foreground";
};

const placementStatusBadge = (s: string) => {
  const map: Record<string, string> = {
    escalar: "bg-emerald-500/15 text-emerald-400",
    manter: "bg-blue-500/15 text-blue-400",
    testar: "bg-amber-500/15 text-amber-400",
    pausar: "bg-red-500/15 text-red-400",
  };
  return map[s] || "bg-secondary text-muted-foreground";
};

const RelatoriosBatch = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [revisadosState, setRevisadosState] = useState(0);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerIdx, setDrawerIdx] = useState(0);
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [analiseLoading, setAnaliseLoading] = useState(false);

  // ClickUp
  const [clickupOpen, setClickupOpen] = useState(false);
  const [clickupTitle, setClickupTitle] = useState("");
  const [clickupDesc, setClickupDesc] = useState("");
  const [clickupCreated, setClickupCreated] = useState<Set<string>>(new Set());

  const clientes = detail?.clientes || [];

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchBatchClientes(batchId);
      setDetail(data);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const getScore = (c: ClienteResumo): string => {
    const p = getPlataformaData(c);
    return p?.data.score_fiscal || "SAUDAVEL";
  };

  const sorted = useMemo(() => {
    return [...clientes].sort((a, b) => scoreOrder(getScore(a)) - scoreOrder(getScore(b)));
  }, [clientes]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.accountName.toLowerCase().includes(q));
    }
    if (filter !== "todos") {
      list = list.filter(c => {
        const p = getPlataformaData(c);
        if (!p) return filter === "erro";
        if (filter === "erro") return p.data.status === "error";
        const score = p.data.score_fiscal;
        if (filter === "critico") return score === "CRITICO";
        if (filter === "atencao") return score === "ATENCAO";
        if (filter === "saudavel") return score === "SAUDAVEL";
        return true;
      });
    }
    return list;
  }, [sorted, search, filter]);

  const revisadosCount = useMemo(() => {
    if (!batchId) return 0;
    return clientes.filter(c => {
      const p = getPlataformaData(c);
      return p && isRevisado(batchId, c.customerId, p.plataforma);
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, batchId, revisadosState]);

  const openDrawer = async (idx: number) => {
    setDrawerIdx(idx);
    setDrawerOpen(true);
    setClickupCreated(new Set());
    await loadAnalise(filtered[idx]);
  };

  const loadAnalise = async (c: ClienteResumo) => {
    if (!batchId) return;
    const p = getPlataformaData(c);
    if (!p) return;
    setAnalise(null);
    setAnaliseLoading(true);
    try {
      const data = await fetchAnaliseCliente(batchId, c.customerId, p.plataforma);
      setAnalise(data);
    } catch {
      setAnalise(null);
    } finally {
      setAnaliseLoading(false);
    }
  };

  const navDrawer = (dir: -1 | 1) => {
    const next = drawerIdx + dir;
    if (next >= 0 && next < filtered.length) {
      setDrawerIdx(next);
      setClickupCreated(new Set());
      loadAnalise(filtered[next]);
    }
  };

  const toggleRevisado = () => {
    if (!batchId) return;
    const c = filtered[drawerIdx];
    if (!c) return;
    const p = getPlataformaData(c);
    if (!p) return;
    const cur = isRevisado(batchId, c.customerId, p.plataforma);
    setRevisado(batchId, c.customerId, p.plataforma, !cur);
    setRevisadosState(s => s + 1);
  };

  const handleRetry = async (c: ClienteResumo) => {
    if (!batchId) return;
    const p = getPlataformaData(c);
    if (!p) return;
    try {
      await retryCliente(batchId, c.customerId, p.plataforma);
      load();
    } catch {}
  };

  const openClickup = (rec: Recomendacao, idx: number) => {
    const desc = [
      rec.diagnostico ? `📋 Diagnóstico:\n${rec.diagnostico}` : "",
      rec.acao ? `🎯 Ação:\n${rec.acao}` : "",
      rec.como_executar ? `📝 Como executar:\n${rec.como_executar.split(";").map((s, i) => `${i + 1}. ${s.trim()}`).join("\n")}` : "",
      rec.impacto_esperado ? `📈 Impacto esperado:\n${rec.impacto_esperado}` : "",
      rec.angulos_criativo ? `🎨 Ângulos de criativo:\n${rec.angulos_criativo}` : "",
      rec.prerequisito ? `⚠️ Pré-requisito:\n${rec.prerequisito}` : "",
    ].filter(Boolean).join("\n\n");
    setClickupTitle(rec.titulo);
    setClickupDesc(desc);
    setClickupOpen(true);
  };

  const currentCliente = filtered[drawerIdx];
  const currentP = currentCliente ? getPlataformaData(currentCliente) : null;
  const currentRevisado = batchId && currentCliente && currentP ? isRevisado(batchId, currentCliente.customerId, currentP.plataforma) : false;

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "Todos", value: "todos" },
    { label: "Críticos", value: "critico" },
    { label: "Atenção", value: "atencao" },
    { label: "Saudáveis", value: "saudavel" },
    { label: "Com Erro", value: "erro" },
  ];

  const ac = analise?.analiseCompleta;
  const an = ac?.analise;
  const isHistorico = (analise as any)?.fonte === "historico";

  // Use root-level insights (more complete per spec)
  const placementInsights = ac?.placement_insights || an?.placement_insights || [];
  const demographicInsights = ac?.demographic_insights || an?.demographic_insights || [];
  const alertasTecnicos = ac?.alertas_tecnicos || an?.alertas_tecnicos || [];

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
            <span className="text-foreground font-medium">Batch {batchId}</span>
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
            <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-secondary/50 border-border/50" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
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
                const p = getPlataformaData(c);
                const score = p?.data.score_fiscal || "";
                const isError = p?.data.status === "error" || c.statusGeral === "error";
                const borderColor = isError ? "border-red-500/30" : score === "CRITICO" ? "border-red-500/30" : score === "ATENCAO" ? "border-amber-500/30" : "border-emerald-500/30";

                return (
                  <motion.div
                    key={c.customerId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    className={`glass-card rounded-2xl p-5 border ${borderColor} hover:shadow-lg transition-all group`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-foreground truncate">{c.accountName}</h3>
                        <div className="flex gap-1.5 mt-1">
                          {c.meta_ads && <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border-blue-500/25">Meta Ads</Badge>}
                          {c.google_ads && <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/25">Google Ads</Badge>}
                        </div>
                      </div>
                      {score && !isError && (
                        <Badge className={`text-[10px] px-2 py-0.5 ${scoreBadgeStyle(score)} font-bold`}>
                          {score}
                        </Badge>
                      )}
                      {isError && (
                        <Badge className="text-[10px] px-2 py-0.5 bg-red-500/15 text-red-400 border-red-500/25 font-bold">ERRO</Badge>
                      )}
                    </div>

                    {/* Metrics */}
                    {p && !isError && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Invest.</div>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(p.data.investimento)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />CPA</div>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(p.data.cpa)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" />CTR</div>
                          <p className="text-sm font-bold text-foreground">{formatPercent(p.data.ctr)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Conv.</div>
                          <p className="text-sm font-bold text-foreground">{formatNumber(p.data.conversoes)}</p>
                        </div>
                      </div>
                    )}

                    {/* Counters */}
                    {p && !isError && (
                      <div className="flex gap-2 mb-3 text-xs">
                        {p.data.recomendacoes?.length > 0 && (
                          <span className="text-blue-400">{p.data.recomendacoes.length} recomendações</span>
                        )}
                        {p.data.alertas?.length > 0 && (
                          <span className="text-amber-400">{p.data.alertas.length} alertas</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isError ? (
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleRetry(c)}>
                          <RefreshCw className="w-3.5 h-3.5" /> Reprocessar
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => openDrawer(idx)}>
                          <BarChart3 className="w-3.5 h-3.5" /> Ver Análise
                        </Button>
                      )}
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

      {/* ─── Analysis Drawer ─── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[70vw] sm:max-w-[70vw] p-0 flex flex-col [&_button.absolute]:hidden">
          {currentCliente && (
            <>
              <SheetHeader className="p-5 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg font-bold truncate">
                      {currentCliente.accountName}
                    </SheetTitle>
                    {currentP && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border-blue-500/25">
                          {currentP.plataforma === "meta_ads" ? "Meta Ads" : "Google Ads"}
                        </Badge>
                        {(() => {
                          const score = an?.score_conta || currentP.data.score_fiscal;
                          return score ? (
                            <Badge className={`text-[10px] px-2 py-0.5 ${scoreBadgeStyle(score)} font-bold`}>
                              {score}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                    )}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDrawerOpen(false)}
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {analiseLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                )}

                {!analiseLoading && !ac && (
                  <div className="text-center py-12 text-muted-foreground">Erro ao carregar análise. Tente novamente.</div>
                )}

                {!analiseLoading && ac && an && (
                  <>
                    {isHistorico && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Análise resumida. Execute o gestor para ver campanhas e criativos detalhados.</span>
                      </div>
                    )}
                  <>
                    {/* Section 1 — Header info */}
                    {an.score_justificativa && (
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">{an.score_justificativa}</p>
                        <p className="text-xs text-muted-foreground/60 mt-2">{ac.data_analise} • Período: {ac.periodo}</p>
                      </div>
                    )}

                    <Accordion
                      type="multiple"
                      defaultValue={["resumo_executivo", "metricas", "alertas_criticos", "recomendacoes"]}
                      className="space-y-3"
                    >
                      {/* Section 2 — Resumo Executivo */}
                      {an.resumo_executivo && (
                        <AccordionItem value="resumo_executivo" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📋 Resumo Executivo</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{an.resumo_executivo}</p>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 3 — Métricas */}
                      {ac.resumo && (
                        <AccordionItem value="metricas" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📊 Métricas</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {[
                                { label: "Investimento", value: formatCurrency(ac.resumo.total_investimento), icon: DollarSign },
                                { label: "Leads", value: formatNumber(ac.resumo.total_leads), icon: Users },
                                { label: "CPL", value: formatCurrency(ac.resumo.cpl_geral), icon: Target },
                                { label: "ROAS", value: `${ac.resumo.roas_geral}x`, icon: TrendingUp },
                                { label: "CPA", value: formatCurrency(ac.resumo.cpa_geral), icon: Target },
                                { label: "CTR", value: formatPercent(ac.resumo.ctr_medio), icon: Crosshair },
                                { label: "Frequência", value: ac.resumo.frequencia_media, icon: RefreshCw },
                                { label: "CPM", value: formatCurrency(ac.resumo.cpm_medio), icon: DollarSign },
                              ].map(m => (
                                <div key={m.label} className="bg-secondary/50 rounded-lg p-3">
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><m.icon className="w-3 h-3" />{m.label}</div>
                                  <p className="text-sm font-bold text-foreground">{m.value}</p>
                                </div>
                              ))}
                              <div className="bg-secondary/50 rounded-lg p-3">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><LayoutGrid className="w-3 h-3" />Campanhas</div>
                                <p className="text-sm font-bold text-foreground">{ac.resumo.total_campanhas}</p>
                                <div className="flex gap-1 mt-1 text-[9px]">
                                  <span className="text-red-400">{ac.resumo.campanhas_criticas}c</span>
                                  <span className="text-amber-400">{ac.resumo.campanhas_atencao}a</span>
                                  <span className="text-emerald-400">{ac.resumo.campanhas_saudaveis}s</span>
                                </div>
                              </div>
                              <div className="bg-secondary/50 rounded-lg p-3">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><Eye className="w-3 h-3" />Anúncios</div>
                                <p className="text-sm font-bold text-foreground">{ac.resumo.total_anuncios}</p>
                                <p className="text-[9px] text-amber-400 mt-1">{ac.resumo.anuncios_fatigados} fatigados</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 4 — Alertas Críticos */}
                      {an.alertas_criticos?.length > 0 && (
                        <AccordionItem value="alertas_criticos" className="rounded-xl overflow-hidden border-none bg-red-500/5 border border-red-500/20">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>🚨 Alertas Críticos ({an.alertas_criticos.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 space-y-2">
                            {an.alertas_criticos.map((a, i) => (
                              <div key={i} className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{a}</p>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 5 — Oportunidades */}
                      {an.oportunidades?.length > 0 && (
                        <AccordionItem value="oportunidades" className="rounded-xl overflow-hidden border-none bg-emerald-500/5 border border-emerald-500/20">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>💡 Oportunidades ({an.oportunidades.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 space-y-2">
                            {an.oportunidades.map((o, i) => (
                              <div key={i} className="flex gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-300">{o}</p>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 6 — Recomendações */}
                      {an.recomendacoes?.length > 0 && (
                        <AccordionItem value="recomendacoes" className="rounded-xl overflow-hidden border-none bg-blue-500/5 border border-blue-500/20">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>🎯 Recomendações ({an.recomendacoes.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <Accordion type="multiple" className="space-y-2">
                              {an.recomendacoes.map((rec, i) => (
                                <AccordionItem key={i} value={`rec-${i}`} className="rounded-lg overflow-hidden border border-border/50 bg-secondary/30">
                                  <AccordionTrigger className="px-3 py-2.5 hover:no-underline text-xs">
                                    <div className="flex items-center gap-2 flex-wrap flex-1 text-left">
                                      <Badge className={`text-[9px] px-1.5 py-0 ${prioridadeBadge(rec.prioridade)}`}>{rec.prioridade}</Badge>
                                      <Badge className={`text-[9px] px-1.5 py-0 ${tipoBadge(rec.tipo)}`}>{rec.tipo}</Badge>
                                      <span className="font-medium text-foreground">{rec.titulo}</span>
                                      {rec.urgencia && <span className="text-[9px] text-red-400 font-bold">{rec.urgencia}</span>}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-3 space-y-3">
                                    {rec.diagnostico && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Diagnóstico</p>
                                        <p className="text-sm text-muted-foreground">{rec.diagnostico}</p>
                                      </div>
                                    )}
                                    {rec.acao && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Ação</p>
                                        <p className="text-sm text-muted-foreground">{rec.acao}</p>
                                      </div>
                                    )}
                                    {rec.como_executar && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Como executar</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                          {rec.como_executar.split(";").map((step, si) => (
                                            <li key={si} className="text-sm text-muted-foreground">{step.trim()}</li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                    {rec.impacto_esperado && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Impacto esperado</p>
                                        <p className="text-sm text-emerald-400">{rec.impacto_esperado}</p>
                                      </div>
                                    )}
                                    {rec.angulos_criativo && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Ângulos de criativo</p>
                                        <p className="text-sm text-muted-foreground">{rec.angulos_criativo}</p>
                                      </div>
                                    )}
                                    {rec.prerequisito && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Pré-requisito</p>
                                        <p className="text-sm text-amber-400">{rec.prerequisito}</p>
                                      </div>
                                    )}
                                    {clickupCreated.has(`rec-${i}`) ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Tarefa criada</span>
                                    ) : (
                                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { openClickup(rec, i); }}>
                                        <Zap className="w-3.5 h-3.5" /> Criar tarefa ClickUp
                                      </Button>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 7 — Diagnóstico por Campanha */}
                      {an.diagnostico_por_campanha?.length > 0 && (
                        <AccordionItem value="diag_campanha" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📈 Diagnóstico por Campanha ({an.diagnostico_por_campanha.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left py-2 pr-3">Campanha</th>
                                    <th className="text-left py-2 pr-3">Objetivo</th>
                                    <th className="text-left py-2 pr-3">Status</th>
                                    <th className="text-left py-2 pr-3">Causa raiz</th>
                                    <th className="text-left py-2">Ação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {an.diagnostico_por_campanha.map((d, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                      <td className="py-2 pr-3 font-medium text-foreground max-w-[200px] truncate">{d.nome}</td>
                                      <td className="py-2 pr-3 text-muted-foreground">{d.objetivo}</td>
                                      <td className="py-2 pr-3"><Badge className={`text-[9px] px-1.5 py-0 ${scoreBadgeStyle(d.status)}`}>{d.status}</Badge></td>
                                      <td className="py-2 pr-3 text-muted-foreground max-w-[200px]">{d.causa_raiz}</td>
                                      <td className="py-2 text-muted-foreground max-w-[200px]">{d.acao_principal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 8 — Criativos */}
                      {!isHistorico && an.diagnostico_criativos && (
                        <AccordionItem value="criativos" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>🎨 Criativos</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 space-y-3">
                            {an.diagnostico_criativos.resumo && (
                              <p className="text-sm text-muted-foreground">{an.diagnostico_criativos.resumo}</p>
                            )}
                            {an.diagnostico_criativos.fatigados?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Fatigados</p>
                                {an.diagnostico_criativos.fatigados.map((f, i) => (
                                  <div key={i} className="text-xs text-muted-foreground pl-3 mb-1">• <strong>{f.nome}</strong>: {f.motivo}</div>
                                ))}
                              </div>
                            )}
                            {an.diagnostico_criativos.winners?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-emerald-400 mb-1">🏆 Winners</p>
                                {an.diagnostico_criativos.winners.map((w, i) => (
                                  <div key={i} className="text-xs text-muted-foreground pl-3 mb-1">• <strong>{w.nome}</strong>: {w.motivo}</div>
                                ))}
                              </div>
                            )}
                            {an.diagnostico_criativos.proximos_testes && (
                              <div>
                                <p className="text-xs font-semibold text-blue-400 mb-1">🧪 Próximos testes</p>
                                <p className="text-sm text-muted-foreground">{an.diagnostico_criativos.proximos_testes}</p>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 9 — Posicionamento */}
                      {placementInsights.length > 0 && (
                        <AccordionItem value="placement" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📍 Posicionamento ({placementInsights.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left py-2 pr-3">Posicionamento</th>
                                    <th className="text-left py-2 pr-3">Status</th>
                                    <th className="text-left py-2 pr-3">CPA</th>
                                    <th className="text-left py-2 pr-3">Conversões</th>
                                    <th className="text-left py-2">Recomendação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {placementInsights.map((p, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                      <td className="py-2 pr-3 text-foreground">{p.posicionamento}</td>
                                      <td className="py-2 pr-3"><Badge className={`text-[9px] px-1.5 py-0 ${placementStatusBadge(p.status)}`}>{p.status}</Badge></td>
                                      <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(p.cpa)}</td>
                                      <td className="py-2 pr-3 text-muted-foreground">{p.conversoes}</td>
                                      <td className="py-2 text-muted-foreground max-w-[200px]">{p.recomendacao}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 10 — Demográficos */}
                      {demographicInsights.length > 0 && (
                        <AccordionItem value="demographics" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>👥 Demográficos ({demographicInsights.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left py-2 pr-3">Segmento</th>
                                    <th className="text-left py-2 pr-3">Status</th>
                                    <th className="text-left py-2 pr-3">CPA</th>
                                    <th className="text-left py-2">Recomendação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {demographicInsights.map((d, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                      <td className="py-2 pr-3 text-foreground">{d.segmento}</td>
                                      <td className="py-2 pr-3"><Badge className={`text-[9px] px-1.5 py-0 ${placementStatusBadge(d.status)}`}>{d.status}</Badge></td>
                                      <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(d.cpa)}</td>
                                      <td className="py-2 text-muted-foreground max-w-[250px]">{d.recomendacao}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 11 — Alertas Técnicos */}
                      {alertasTecnicos.length > 0 && (
                        <AccordionItem value="alertas_tec" className="rounded-xl overflow-hidden border-none bg-amber-500/5 border border-amber-500/20">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>⚙️ Alertas Técnicos ({alertasTecnicos.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 space-y-2">
                            {alertasTecnicos.map((a, i) => (
                              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400">{a.tipo}</Badge>
                                  <span className="text-xs text-foreground font-medium">{a.campanha}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{a.descricao}</p>
                                <p className="text-xs text-amber-400">🔧 {a.acao_imediata}</p>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 12 — Projeção */}
                      {an.projecao && (
                        <AccordionItem value="projecao" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>🔮 Projeção</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Cenário Atual</p>
                                <p className="text-sm text-muted-foreground">{an.projecao.cenario_atual}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-[10px] text-emerald-400 font-semibold mb-1">Com Otimizações</p>
                                <p className="text-sm text-muted-foreground">{an.projecao.com_otimizacoes}</p>
                              </div>
                            </div>
                            {(an.projecao.roas_esperado || an.projecao.reducao_cpa_estimada) && (
                              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                                {an.projecao.roas_esperado && <span>ROAS esperado: <strong className="text-emerald-400">{an.projecao.roas_esperado}</strong></span>}
                                {an.projecao.reducao_cpa_estimada && <span>Redução CPA: <strong className="text-emerald-400">{an.projecao.reducao_cpa_estimada}</strong></span>}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 13 — Campanhas */}
                      {!isHistorico && ac.campanhas?.length > 0 && (
                        <AccordionItem value="campanhas" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📣 Campanhas ({ac.campanhas.length})</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <Accordion type="multiple" className="space-y-2">
                              {ac.campanhas.map((camp, i) => (
                                <AccordionItem key={i} value={`camp-${i}`} className="rounded-lg overflow-hidden border border-border/50 bg-secondary/30">
                                  <AccordionTrigger className="px-3 py-2.5 hover:no-underline text-xs">
                                    <div className="flex items-center gap-2 flex-1 text-left">
                                      <Badge className={`text-[9px] px-1.5 py-0 ${scoreBadgeStyle(camp.status_performance)}`}>{camp.status_performance}</Badge>
                                      <span className="font-medium text-foreground truncate">{camp.nome}</span>
                                      <span className="text-muted-foreground">{camp.tipo_campanha}</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-3 space-y-2">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                                      <div><span className="text-muted-foreground">Gasto:</span> <strong>{formatCurrency(camp.metricas.spend)}</strong></div>
                                      <div><span className="text-muted-foreground">Leads:</span> <strong>{camp.metricas.leads}</strong></div>
                                      <div><span className="text-muted-foreground">CPM:</span> <strong>{formatCurrency(camp.metricas.cpm)}</strong></div>
                                      <div><span className="text-muted-foreground">CTR:</span> <strong>{camp.metricas.ctr}%</strong></div>
                                      <div><span className="text-muted-foreground">Alcance:</span> <strong>{formatNumber(camp.metricas.reach)}</strong></div>
                                      <div><span className="text-muted-foreground">Freq:</span> <strong>{camp.metricas.frequency}</strong></div>
                                      <div><span className="text-muted-foreground">Budget:</span> <strong>{camp.budget_utilization}%</strong></div>
                                    </div>
                                    {camp.alertas?.length > 0 && (
                                      <div className="space-y-1">
                                        {camp.alertas.map((a, ai) => (
                                          <p key={ai} className="text-xs text-amber-400">⚠️ {a}</p>
                                        ))}
                                      </div>
                                    )}
                                    {camp.gerenciador_url && (
                                      <a href={camp.gerenciador_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                        <ExternalLink className="w-3 h-3" /> Abrir no Gerenciador
                                      </a>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Section 14 — Relatório Fiscal */}
                      {an.relatorio_fiscal && (
                        <AccordionItem value="fiscal" className="rounded-xl overflow-hidden border-none glass-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                            <span>📑 Relatório Fiscal</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                              {an.relatorio_fiscal}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </>
                )}
              </div>

              {/* Footer navigation */}
              <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
                <Button size="sm" variant="outline" disabled={drawerIdx <= 0} onClick={() => navDrawer(-1)} className="gap-1 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{drawerIdx + 1} de {filtered.length}</span>
                <Button size="sm" variant="outline" disabled={drawerIdx >= filtered.length - 1} onClick={() => navDrawer(1)} className="gap-1 text-xs">
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ClickUp Modal */}
      <ClickUpTaskModal
        isOpen={clickupOpen}
        onClose={() => setClickupOpen(false)}
        taskTitle={clickupTitle}
        taskDescription={clickupDesc}
        onSuccess={() => {
          // Mark as created (we track by the last opened rec index through clickupTitle)
        }}
      />
    </div>
  );
};

export default RelatoriosBatch;
