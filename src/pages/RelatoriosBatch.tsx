import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, CheckCircle2, AlertTriangle, RefreshCw, X, ChevronLeft, ChevronRight,
  BarChart3, Target, DollarSign, TrendingUp, ExternalLink, Zap, Eye, Crosshair,
  LayoutGrid, FileText, Shield, BarChart2, Users, Lightbulb, Clock, Loader2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClickUpTaskModal } from "@/components/ClickUpTaskModal";
import {
  fetchBatchClientes, fetchAnaliseCliente, retryCliente, isRevisado, setRevisado, getRevisados,
  formatCurrency, formatNumber, formatPercent, scoreOrder, getPlataformaData,
  formatScore, formatPeriodo, pluralize, formatBatchId, formatAccountDisplay, isAllMetricsZero, resolveScore,
  type ClienteResumo, type AnaliseCompleta, type BatchDetailResponse, type Recomendacao,
} from "@/lib/relatorios-utils";

type StatusFilter = "todos" | "critico" | "atencao" | "saudavel" | "erro";
type PlatformFilter = "todas" | "meta_ads" | "google_ads";

const scoreBadgeStyle = (score: string) => {
  switch (score) {
    case "CRITICO": return "bg-red-500/15 text-red-400 border-red-500/25";
    case "ATENCAO": return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    case "SAUDAVEL": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "SEM_DADOS": return "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";
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

// Generic placeholder for historico resumo
const HISTORICO_PLACEHOLDER = "Analise resumida. Para analise completa com campanhas e criativos, execute o gestor novamente.";

function generateAutoResumo(analise: AnaliseCompleta): string {
  const ac = analise.analiseCompleta;
  const an = ac?.analise;
  const resumo = ac?.resumo;
  const score = an?.score_conta || "";
  const parts: string[] = [];
  if (score) parts.push(`Conta com score **${score}**.`);
  if (resumo) {
    if (resumo.total_investimento && resumo.total_investimento !== "0") parts.push(`Investimento de ${formatCurrency(resumo.total_investimento)}`);
    if (resumo.cpl_geral && resumo.cpl_geral !== "0") parts.push(`CPL de ${formatCurrency(resumo.cpl_geral)}`);
    if (resumo.roas_geral && resumo.roas_geral !== "0") parts.push(`ROAS de ${resumo.roas_geral}x`);
  }
  const alertCount = an?.alertas_criticos?.length || 0;
  const recCount = an?.recomendacoes?.length || 0;
  if (alertCount > 0) parts.push(`${alertCount} alertas críticos identificados`);
  if (recCount > 0) parts.push(`${recCount} recomendações prioritárias`);
  return parts.length > 0 ? parts.join(". ") + "." : "";
}

// Alert text: extract campaign tag prefix
function parseAlertText(text: string): { tag: string | null; body: string } {
  const match = text.match(/^(\[[\[\]\w\s\.\-\/\(\)]+\])\s*(.+)$/s);
  if (match) return { tag: match[1], body: match[2] };
  const multiMatch = text.match(/^((?:\[[^\]]*\]\s*)+)(.+)$/s);
  if (multiMatch) return { tag: multiMatch[1].trim(), body: multiMatch[2].trim() };
  return { tag: null, body: text };
}

// Expandable alert card
const AlertCard = ({ text, variant }: { text: string; variant: "red" | "amber" | "emerald" }) => {
  const [expanded, setExpanded] = useState(false);
  const { tag, body } = parseAlertText(text);
  const colors = {
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-300", tag: "text-red-400/70" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", tag: "text-amber-400/70" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", tag: "text-emerald-400/70" },
  };
  const c = colors[variant];
  const Icon = variant === "red" ? AlertTriangle : variant === "emerald" ? TrendingUp : AlertTriangle;

  return (
    <div
      className={`p-3 rounded-lg ${c.bg} border ${c.border} cursor-pointer transition-all`}
      onClick={() => setExpanded(!expanded)}
    >
      {tag && <p className={`text-[10px] font-mono ${c.tag} mb-1`}>{tag}</p>}
      <div className="flex gap-2">
        <Icon className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
        <p className={`text-sm ${c.text} ${expanded ? "" : "line-clamp-3"}`}>{body}</p>
      </div>
      {!expanded && body.length > 150 && (
        <p className={`text-[10px] ${c.tag} mt-1 text-right`}>ver mais ▾</p>
      )}
    </div>
  );
};

// Account name display component (MELHORIA 10)
const AccountNameDisplay = ({ name, className }: { name: string; className?: string }) => {
  const { display, isNumericId } = formatAccountDisplay(name);
  if (!isNumericId) return <span className={className}>{display}</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} text-muted-foreground`}>{display}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>ID da conta Google Ads — nome não disponível</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const RelatoriosBatch = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("todas");
  const [search, setSearch] = useState("");
  const [revisadosVersion, setRevisadosVersion] = useState(0);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNavList, setDrawerNavList] = useState<ClienteResumo[]>([]);
  const [drawerIdx, setDrawerIdx] = useState(0);
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [analiseLoading, setAnaliseLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [drawerContentKey, setDrawerContentKey] = useState(0);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const drawerIdxRef = useRef(0); // BUG 1: ref to avoid stale closures

  // Undo revisado confirm (MELHORIA 9)
  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false);

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

  const sorted = useMemo(() => {
    return [...clientes].sort((a, b) => scoreOrder(resolveScore(a)) - scoreOrder(resolveScore(b)));
  }, [clientes]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.accountName.toLowerCase().includes(q));
    }
    // Platform filter (MELHORIA 7)
    if (platformFilter !== "todas") {
      list = list.filter(c => {
        if (platformFilter === "meta_ads") return c.meta_ads != null;
        if (platformFilter === "google_ads") return c.google_ads != null;
        return true;
      });
    }
    if (filter !== "todos") {
      list = list.filter(c => {
        const p = getPlataformaData(c);
        if (!p) return filter === "erro";
        if (filter === "erro") {
          const score = resolveScore(c);
          return p.data.status === "error" || score === "SEM_DADOS";
        }
        const score = resolveScore(c);
        if (filter === "critico") return score === "CRITICO";
        if (filter === "atencao") return score === "ATENCAO";
        if (filter === "saudavel") return score === "SAUDAVEL";
        return true;
      });
    }
    return list;
  }, [sorted, search, filter, platformFilter]);

  // Revisados count
  const revisadosCount = useMemo(() => {
    if (!batchId) return 0;
    return clientes.filter(c => {
      const p = getPlataformaData(c);
      return p && isRevisado(batchId, c.customerId, p.plataforma);
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, batchId, revisadosVersion]);

  const isClientRevisado = useCallback((c: ClienteResumo) => {
    if (!batchId) return false;
    const p = getPlataformaData(c);
    return p ? isRevisado(batchId, c.customerId, p.plataforma) : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, revisadosVersion]);

  const loadAnalise = async (c: ClienteResumo) => {
    if (!batchId) return;
    const p = getPlataformaData(c);
    if (!p) return;
    setAnalise(null);
    setAnaliseLoading(true);
    try {
      const data = await fetchAnaliseCliente(batchId, c.customerId, p.plataforma);
      console.log("[DEBUG] analise raw response:", JSON.stringify(data, null, 2).slice(0, 2000));
      console.log("[DEBUG] analiseCompleta keys:", data?.analiseCompleta ? Object.keys(data.analiseCompleta) : "NO analiseCompleta");
      console.log("[DEBUG] analiseCompleta.analise keys:", data?.analiseCompleta?.analise ? Object.keys(data.analiseCompleta.analise) : "NO analise nested");
      setAnalise(data);
    } catch (err) {
      console.error("[DEBUG] loadAnalise error:", err);
      setAnalise(null);
    } finally {
      setAnaliseLoading(false);
    }
  };

  const openDrawer = async (idx: number) => {
    const snapshot = [...filtered];
    setDrawerNavList(snapshot);
    setDrawerIdx(idx);
    drawerIdxRef.current = idx;
    setDrawerOpen(true);
    setClickupCreated(new Set());
    setDrawerContentKey(k => k + 1);
    await loadAnalise(snapshot[idx]);
  };

  // BUG 1 FIX: Navigation uses ref for latest index
  const navDrawer = async (dir: -1 | 1) => {
    const currentIdx = drawerIdxRef.current;
    const nextIdx = currentIdx + dir;
    if (nextIdx < 0 || nextIdx >= drawerNavList.length) return;
    const nextCliente = drawerNavList[nextIdx];
    if (!nextCliente) return;

    setNavLoading(true);
    setDrawerIdx(nextIdx);
    drawerIdxRef.current = nextIdx;
    setClickupCreated(new Set());

    // Scroll to top instantly
    if (drawerScrollRef.current) {
      drawerScrollRef.current.scrollTop = 0;
    }

    const p = getPlataformaData(nextCliente);
    if (!p || !batchId) {
      setNavLoading(false);
      return;
    }

    setAnalise(null);
    setAnaliseLoading(true);
    try {
      const data = await fetchAnaliseCliente(batchId, nextCliente.customerId, p.plataforma);
      setAnalise(data);
      setDrawerContentKey(k => k + 1);
    } catch {
      setAnalise(null);
    } finally {
      setAnaliseLoading(false);
      setNavLoading(false);
    }
  };

  // MELHORIA 9: Toggle revisado with confirm for undo
  const toggleRevisado = () => {
    if (!batchId) return;
    const c = drawerNavList[drawerIdxRef.current];
    if (!c) return;
    const p = getPlataformaData(c);
    if (!p) return;
    const cur = isRevisado(batchId, c.customerId, p.plataforma);
    if (cur) {
      setConfirmUndoOpen(true);
      return;
    }
    setRevisado(batchId, c.customerId, p.plataforma, true);
    setRevisadosVersion(v => v + 1);
  };

  const confirmUndo = () => {
    if (!batchId) return;
    const c = drawerNavList[drawerIdxRef.current];
    if (!c) return;
    const p = getPlataformaData(c);
    if (!p) return;
    setRevisado(batchId, c.customerId, p.plataforma, false);
    setRevisadosVersion(v => v + 1);
    setConfirmUndoOpen(false);
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

  // Current drawer client from snapshot list
  const currentCliente = drawerNavList[drawerIdx] || null;
  const currentP = currentCliente ? getPlataformaData(currentCliente) : null;
  const currentRevisado = batchId && currentCliente && currentP
    ? isRevisado(batchId, currentCliente.customerId, currentP.plataforma)
    : false;
  void revisadosVersion;

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "Todos", value: "todos" },
    { label: "Críticos", value: "critico" },
    { label: "Atenção", value: "atencao" },
    { label: "Saudáveis", value: "saudavel" },
    { label: "Com Erro / Sem Dados", value: "erro" },
  ];

  const platformFilters: { label: string; value: PlatformFilter }[] = [
    { label: "Todas Plataformas", value: "todas" },
    { label: "Meta Ads", value: "meta_ads" },
    { label: "Google Ads", value: "google_ads" },
  ];

  const ac = analise?.analiseCompleta;
  const isGoogleAds = analise?.plataforma === "google_ads";
  // Meta Ads: ac.analise is an object with all fields
  // Google Ads: ac.analise is a STRING (narrative), fields are at ac root level
  const anMeta = ac?.analise && typeof ac.analise === "object" ? ac.analise : null;
  // For Google Ads, we use ac itself as the source for top-level fields
  const an = anMeta || (ac && typeof ac.analise !== "object" ? ac as unknown as typeof ac.analise : null);
  const isHistorico = (analise as any)?.fonte === "historico";

  // Google Ads alertas_criticos are objects {alerta, campanha, grupo, ...}, Meta are strings
  const alertasCriticosRaw: any[] = an?.alertas_criticos || (ac as any)?.alertas_criticos || [];
  const alertasCriticos: string[] = alertasCriticosRaw.map((a: any) => {
    if (typeof a === "string") return a;
    // Google Ads object format
    const parts: string[] = [];
    if (a.campanha) parts.push(`[${a.campanha}${a.grupo ? ` / ${a.grupo}` : ""}]`);
    if (a.alerta) parts.push(a.alerta);
    if (a.dado) parts.push(`Dado: ${a.dado}`);
    if (a.causa_provavel) parts.push(`Causa: ${a.causa_provavel}`);
    if (a.orcamento_diario_sugerido) parts.push(`Orçamento sugerido: ${a.orcamento_diario_sugerido}`);
    return parts.join(" ");
  });

  // Google Ads oportunidades are objects {titulo, descricao, tipo, impacto, campanha, grupo}, Meta are strings
  const oportunidadesRaw: any[] = an?.oportunidades || (ac as any)?.oportunidades || [];
  const oportunidades: string[] = oportunidadesRaw.map((o: any) => {
    if (typeof o === "string") return o;
    const parts: string[] = [];
    if (o.campanha) parts.push(`[${o.campanha}${o.grupo ? ` / ${o.grupo}` : ""}]`);
    if (o.titulo) parts.push(o.titulo);
    if (o.descricao) parts.push(o.descricao);
    if (o.impacto) parts.push(`Impacto: ${o.impacto}`);
    return parts.join(" — ");
  });

  // Google Ads uses recomendacoes_sugeridas, Meta uses recomendacoes
  const recomendacoes: Recomendacao[] = an?.recomendacoes || (ac as any)?.recomendacoes_sugeridas || (ac as any)?.recomendacoes || [];

  // Normalize resumo — Google Ads has different fields
  const resumoNormalized = useMemo(() => {
    const r = ac?.resumo;
    if (!r) return null;
    // If it already has Meta fields, return as-is
    if (r.total_investimento !== undefined) return r;
    // Google Ads resumo: custo7dias, custo30dias, totalCampanhas, conversoes7dias, conversoes30dias
    const gR = r as any;
    return {
      total_investimento: gR.custo7dias || gR.custo30dias || "0",
      total_leads: gR.conversoes7dias || gR.conversoes30dias || 0,
      cpl_geral: "0",
      roas_geral: gR.roas_geral || "0",
      cpa_geral: gR.cpa_geral || "0",
      ctr_medio: gR.ctr_medio || "0",
      frequencia_media: gR.frequencia_media || "—",
      cpm_medio: gR.cpm_medio || "0",
      total_campanhas: gR.totalCampanhas || 0,
      campanhas_criticas: gR.campanhas_criticas || 0,
      campanhas_atencao: gR.campanhas_atencao || 0,
      campanhas_saudaveis: gR.campanhas_saudaveis || 0,
      total_anuncios: gR.total_anuncios || 0,
      anuncios_fatigados: gR.anuncios_fatigados || 0,
      total_compras: gR.total_compras || 0,
      total_conversas: gR.total_conversas || 0,
    } as any;
  }, [ac]);

  const placementInsights = ac?.placement_insights || an?.placement_insights || (ac as any)?.placement_insights || [];
  const demographicInsights = ac?.demographic_insights || an?.demographic_insights || (ac as any)?.demographic_insights || [];
  const alertasTecnicos = ac?.alertas_tecnicos || an?.alertas_tecnicos || (ac as any)?.alertas_tecnicos || [];

  // Google Ads: narrative analise text
  const analiseNarrativa = isGoogleAds && ac?.analise && typeof ac.analise === "string" ? ac.analise as string : null;

  const drawerScore = an?.score_conta || (ac as any)?.score_conta || currentP?.data.score_fiscal || "";
  const canGoPrev = drawerIdx > 0;
  const canGoNext = drawerIdx < drawerNavList.length - 1;

  const resumoExecutivo = useMemo(() => {
    const re = an?.resumo_executivo || (ac as any)?.resumo_executivo;
    if (!re) return "";
    if (isHistorico && (re === HISTORICO_PLACEHOLDER || re.includes("Analise resumida"))) {
      return analise ? generateAutoResumo(analise) : "";
    }
    return re;
  }, [an, ac, isHistorico, analise]);

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header with BUG 5 fix */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/relatorios")} className="gap-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/relatorios")}>Relatórios</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{batchId ? formatBatchId(batchId) : ""}</span>
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

        {/* Filters & Search - with MELHORIA 7 platform filter */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
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
          {/* Platform filter row */}
          <div className="flex flex-wrap gap-2">
            {platformFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setPlatformFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  platformFilter === f.value
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
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
                const score = resolveScore(c);
                const isError = p?.data.status === "error" || c.statusGeral === "error";
                const reviewed = isClientRevisado(c);
                const allZero = p && !isError && isAllMetricsZero(p.data);
                const borderColor = reviewed
                  ? "border-l-[3px] border-l-emerald-500 border-t border-r border-b border-t-border/30 border-r-border/30 border-b-border/30"
                  : isError ? "border border-red-500/30" : score === "CRITICO" ? "border border-red-500/30" : score === "ATENCAO" ? "border border-amber-500/30" : score === "SEM_DADOS" ? "border border-zinc-500/30" : "border border-emerald-500/30";

                return (
                  <motion.div
                    key={`${c.customerId}_${c.meta_ads ? 'meta' : 'google'}_${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    className={`glass-card rounded-2xl p-5 ${borderColor} hover:shadow-lg transition-all group ${reviewed ? "opacity-80" : ""} ${allZero ? "opacity-85" : ""}`}
                  >
                    {/* MELHORIA 8: Zero metrics banner */}
                    {allZero && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Conta sem dados no período
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <AccountNameDisplay name={c.accountName} className="text-base font-bold text-foreground truncate" />
                          {reviewed && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {c.meta_ads && <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border-blue-500/25">Meta Ads</Badge>}
                          {c.google_ads && <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/25">Google Ads</Badge>}
                        </div>
                      </div>
                      {!isError && (
                        <Badge className={`text-[10px] px-2 py-0.5 ${scoreBadgeStyle(score)} font-bold`}>
                          {formatScore(score)}
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

                    {/* Counters - BUG 4: Plural fix */}
                    {p && !isError && (
                      <div className="flex gap-2 mb-3 text-xs">
                        {p.data.recomendacoes?.length > 0 && (
                          <span className="text-blue-400">{pluralize(p.data.recomendacoes.length, 'recomendação', 'recomendações')}</span>
                        )}
                        {p.data.alertas?.length > 0 && (
                          <span className="text-amber-400">{pluralize(p.data.alertas.length, 'alerta', 'alertas')}</span>
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
        <SheetContent side="right" hideCloseButton className="w-full sm:w-[70vw] sm:max-w-[70vw] p-0 flex flex-col">
          {currentCliente && (
            <>
              <SheetHeader className="p-5 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg font-bold truncate">
                      <AccountNameDisplay name={currentCliente.accountName} className="text-lg font-bold" />
                    </SheetTitle>
                    {currentP && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${currentP.plataforma === "meta_ads" ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"}`}>
                          {currentP.plataforma === "meta_ads" ? "Meta Ads" : "Google Ads"}
                        </Badge>
                        {drawerScore && (
                          <Badge className={`text-[10px] px-2 py-0.5 ${scoreBadgeStyle(drawerScore)} font-bold`}>
                            {formatScore(drawerScore)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {/* MELHORIA 9: Undo revisado button */}
                    <Button
                      size="sm"
                      variant={currentRevisado ? "default" : "outline"}
                      onClick={toggleRevisado}
                      className={`text-xs gap-1.5 transition-all ${currentRevisado ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {currentRevisado ? "Revisado ✓" : "Marcar Revisado"}
                      {currentRevisado && <X className="w-3 h-3 ml-1 opacity-70" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDrawerOpen(false)}
                      className="w-9 h-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div ref={drawerScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={drawerContentKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {(analiseLoading || navLoading) && (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Carregando análise...</p>
                      </div>
                    )}

                    {!analiseLoading && !navLoading && !ac && (
                      <div className="text-center py-12 text-muted-foreground">Erro ao carregar análise. Tente novamente.</div>
                    )}

                    {!analiseLoading && !navLoading && ac && (
                      <>
                        {/* Historico banner */}
                        {isHistorico && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Análise resumida. Execute o gestor para ver campanhas e criativos detalhados.</span>
                          </div>
                        )}

                        {/* Section 1 — Header info with BUG 3 period fix */}
                        {(an?.score_justificativa || (ac as any)?.score_justificativa) && (
                          <div className="glass-card rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">{an?.score_justificativa || (ac as any)?.score_justificativa}</p>
                            <p className="text-xs text-muted-foreground/60 mt-2">
                              {ac.data_analise} • Período: {formatPeriodo(ac.periodo || "")}
                            </p>
                          </div>
                        )}

                        <Accordion
                          type="multiple"
                          defaultValue={["resumo_executivo", "metricas", "alertas_criticos", "recomendacoes"]}
                          className="space-y-3"
                        >
                          {/* Section 2 — Resumo Executivo */}
                          {resumoExecutivo && (
                            <AccordionItem value="resumo_executivo" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>📋 Resumo Executivo</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{resumoExecutivo}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {/* Section 3 — Métricas */}
                          {resumoNormalized && (
                            <AccordionItem value="metricas" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>📊 Métricas</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {[
                                    { label: "Investimento", value: formatCurrency(resumoNormalized.total_investimento), icon: DollarSign },
                                    { label: "Leads", value: formatNumber(resumoNormalized.total_leads), icon: Users },
                                    { label: "CPL", value: formatCurrency(resumoNormalized.cpl_geral), icon: Target },
                                    { label: "ROAS", value: `${resumoNormalized.roas_geral}x`, icon: TrendingUp },
                                    { label: "CPA", value: formatCurrency(resumoNormalized.cpa_geral), icon: Target },
                                    { label: "CTR", value: formatPercent(resumoNormalized.ctr_medio), icon: Crosshair },
                                    { label: "Frequência", value: resumoNormalized.frequencia_media, icon: RefreshCw },
                                    { label: "CPM", value: formatCurrency(resumoNormalized.cpm_medio), icon: DollarSign },
                                  ].map(m => (
                                    <div key={m.label} className="bg-secondary/50 rounded-lg p-3">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><m.icon className="w-3 h-3" />{m.label}</div>
                                      <p className="text-sm font-bold text-foreground">{m.value}</p>
                                    </div>
                                  ))}
                                  {!isHistorico && resumoNormalized.total_campanhas > 0 && (
                                    <>
                                      <div className="bg-secondary/50 rounded-lg p-3">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><LayoutGrid className="w-3 h-3" />Campanhas</div>
                                        <p className="text-sm font-bold text-foreground">{resumoNormalized.total_campanhas}</p>
                                        <div className="flex gap-1 mt-1 text-[9px]">
                                          <span className="text-red-400">{resumoNormalized.campanhas_criticas} crít.</span>
                                          <span className="text-amber-400">{resumoNormalized.campanhas_atencao} aten.</span>
                                          <span className="text-emerald-400">{resumoNormalized.campanhas_saudaveis} saud.</span>
                                        </div>
                                      </div>
                                      <div className="bg-secondary/50 rounded-lg p-3">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><Eye className="w-3 h-3" />Anúncios</div>
                                        <p className="text-sm font-bold text-foreground">{resumoNormalized.total_anuncios}</p>
                                        <p className="text-[9px] text-amber-400 mt-1">{resumoNormalized.anuncios_fatigados} fatigados</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {/* Section 4 — Alertas Críticos */}
                          {alertasCriticos.length > 0 && (
                            <AccordionItem value="alertas_criticos" className="rounded-xl overflow-hidden border-none bg-red-500/5 border border-red-500/20">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>🚨 Alertas Críticos ({alertasCriticos.length})</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 space-y-2">
                                {alertasCriticos.map((a, i) => (
                                  <AlertCard key={i} text={a} variant="red" />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {/* Section 5 — Oportunidades */}
                          {(an?.oportunidades?.length ?? 0) > 0 && (
                            <AccordionItem value="oportunidades" className="rounded-xl overflow-hidden border-none bg-emerald-500/5 border border-emerald-500/20">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>💡 Oportunidades ({an?.oportunidades?.length || 0})</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 space-y-2">
                                {(an?.oportunidades || []).map((o, i) => (
                                  <AlertCard key={i} text={o} variant="emerald" />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {/* Section 6 — Recomendações */}
                          {(an?.recomendacoes?.length ?? 0) > 0 && (
                            <AccordionItem value="recomendacoes" className="rounded-xl overflow-hidden border-none bg-blue-500/5 border border-blue-500/20">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>🎯 Recomendações ({an?.recomendacoes?.length || 0})</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <Accordion type="multiple" className="space-y-2">
                                  {(an?.recomendacoes || []).map((rec, i) => (
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
                                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openClickup(rec, i)}>
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
                          {(an?.diagnostico_por_campanha?.length ?? 0) > 0 && (
                            <AccordionItem value="diag_campanha" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>📈 Diagnóstico por Campanha ({an?.diagnostico_por_campanha?.length || 0})</span>
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
                                      {(an?.diagnostico_por_campanha || []).map((d, i) => (
                                        <tr key={i} className="border-b border-border/50">
                                          <td className="py-2 pr-3 font-medium text-foreground max-w-[200px] truncate">{d.nome}</td>
                                          <td className="py-2 pr-3 text-muted-foreground">{d.objetivo}</td>
                                          <td className="py-2 pr-3"><Badge className={`text-[9px] px-1.5 py-0 ${scoreBadgeStyle(d.status)}`}>{formatScore(d.status)}</Badge></td>
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
                          {!isHistorico && an?.diagnostico_criativos && (
                            <AccordionItem value="criativos" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>🎨 Criativos</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 space-y-3">
                                {an?.diagnostico_criativos?.resumo && (
                                  <p className="text-sm text-muted-foreground">{an.diagnostico_criativos.resumo}</p>
                                )}
                                {(an?.diagnostico_criativos?.fatigados?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Fatigados</p>
                                    {(an?.diagnostico_criativos?.fatigados || []).map((f, i) => (
                                      <div key={i} className="text-xs text-muted-foreground pl-3 mb-1">• <strong>{f.nome}</strong>: {f.motivo}</div>
                                    ))}
                                  </div>
                                )}
                                {(an?.diagnostico_criativos?.winners?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-emerald-400 mb-1">🏆 Winners</p>
                                    {(an?.diagnostico_criativos?.winners || []).map((w, i) => (
                                      <div key={i} className="text-xs text-muted-foreground pl-3 mb-1">• <strong>{w.nome}</strong>: {w.motivo}</div>
                                    ))}
                                  </div>
                                )}
                                {an?.diagnostico_criativos?.proximos_testes && (
                                  <div>
                                    <p className="text-xs font-semibold text-blue-400 mb-1">🧪 Próximos testes</p>
                                    <p className="text-sm text-muted-foreground">{an?.diagnostico_criativos?.proximos_testes}</p>
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
                          {an?.projecao && (
                            <AccordionItem value="projecao" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>🔮 Projeção</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                    <p className="text-[10px] text-muted-foreground font-semibold mb-1">Cenário Atual</p>
                                    <p className="text-sm text-muted-foreground">{an?.projecao?.cenario_atual}</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-[10px] text-emerald-400 font-semibold mb-1">Com Otimizações</p>
                                    <p className="text-sm text-muted-foreground">{an?.projecao?.com_otimizacoes}</p>
                                  </div>
                                </div>
                                {(an?.projecao?.roas_esperado || an?.projecao?.reducao_cpa_estimada) && (
                                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                                    {an?.projecao?.roas_esperado && <span>ROAS esperado: <strong className="text-emerald-400">{an.projecao.roas_esperado}</strong></span>}
                                    {an?.projecao?.reducao_cpa_estimada && <span>Redução CPA: <strong className="text-emerald-400">{an.projecao.reducao_cpa_estimada}</strong></span>}
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
                                          <Badge className={`text-[9px] px-1.5 py-0 ${scoreBadgeStyle(camp.status_performance)}`}>{formatScore(camp.status_performance)}</Badge>
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
                          {an?.relatorio_fiscal && (
                            <AccordionItem value="fiscal" className="rounded-xl overflow-hidden border-none glass-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold">
                                <span>📑 Relatório Fiscal</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                                  {an?.relatorio_fiscal}
                                </pre>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer navigation */}
              <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canGoPrev || navLoading || analiseLoading}
                  onClick={() => navDrawer(-1)}
                  className="gap-1 text-xs"
                >
                  {navLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{drawerIdx + 1} de {drawerNavList.length}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canGoNext || navLoading || analiseLoading}
                  onClick={() => navDrawer(1)}
                  className="gap-1 text-xs"
                >
                  Próximo
                  {navLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* MELHORIA 9: Confirm undo dialog */}
      <AlertDialog open={confirmUndoOpen} onOpenChange={setConfirmUndoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar como revisado?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desmarcar este cliente como revisado? Ele voltará a aparecer como pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>Desmarcar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ClickUp Modal */}
      <ClickUpTaskModal
        isOpen={clickupOpen}
        onClose={() => setClickupOpen(false)}
        taskTitle={clickupTitle}
        taskDescription={clickupDesc}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default RelatoriosBatch;
