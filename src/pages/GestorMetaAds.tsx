import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BarChart2, Settings, Play, Loader2, AlertTriangle,
  Lightbulb, ChevronDown, ChevronUp, DollarSign, TrendingUp, Target,
  Users, Eye, MousePointer, Layers, CheckCircle2, X, Trash2,
  ExternalLink, Clock, Zap, Pause, ArrowUpRight, RefreshCw, Palette,
  Star, Award, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getClientesMeta, type ClienteMeta } from "./ClientesMeta";

/* ─── Types ─── */
interface MetaResumo {
  total_investimento: string; total_receita: string; roas_geral: string;
  cpa_geral: string; cpl_geral: string; total_compras: number; total_leads: number;
  frequencia_media: string; cpm_medio: string; total_campanhas: number;
  campanhas_ativas: number; campanhas_criticas: number; campanhas_atencao: number;
  campanhas_saudaveis: number; adsets_learning_limited: number; adsets_aprendendo: number;
  total_adsets: number; total_anuncios: number; anuncios_criticos: number;
  anuncios_bons: number; anuncios_fatigados: number;
  tipo_campanha?: string; objetivo?: string; objetivo_predominante?: string;
  cpl?: string | number; custo_por_lead?: string | number; cpl_conversas?: string | number;
  total_conversas?: number; conversas_iniciadas?: number;
}

interface MetaAnalise {
  resumo_executivo: string;
  score_conta: "CRITICO" | "ATENCAO" | "SAUDAVEL" | "ESCALA";
  alertas_criticos: string[];
  oportunidades: string[];
  diagnostico_por_campanha: { nome: string; status: string; diagnostico: string; acao_principal: string }[];
  diagnostico_criativos: { resumo: string; fatigados: any[]; winners: any[]; recomendacao: string };
  recomendacoes: { titulo: string; prioridade: string; tipo: string; diagnostico: string; acao: string; impacto_esperado: string; urgencia: string }[];
  projecao: { cenario_atual: string; com_otimizacoes: string; roas_esperado: string; reducao_cpa_estimada: string };
}

interface MetaCampanha {
  id: string; nome: string; status: string;
  metricas: Record<string, any>;
  alertas: string[];
  status_performance: string;
}

interface MetaAnuncio {
  id: string; nome: string;
  rankings: Record<string, string>;
  metricas: Record<string, any>;
  diagnostico_fadiga: string;
}

interface MetaTarefa {
  nome: string; descricao: string; prioridade: string;
  prioridade_texto: string; tipo: string; urgencia: string;
  impacto_esperado?: string;
  por_que_fazer?: string;
  como_executar?: string;
}

interface MetaData {
  status: string; cliente: string; data_analise: string; periodo: string;
  resumo: MetaResumo; alertas: string[];
  analise: MetaAnalise; campanhas: MetaCampanha[];
  adsets: any[]; anuncios: MetaAnuncio[];
  tarefas_sugeridas: MetaTarefa[];
}

/* ─── Translation Maps ─── */
const PERIODO_LABELS: Record<string, string> = {
  today: "Hoje", yesterday: "Ontem", last_7d: "Últimos 7 dias",
  last_14d: "Últimos 14 dias", last_28d: "Últimos 28 dias",
  last_30d: "Últimos 30 dias", last_90d: "Últimos 90 dias",
  this_month: "Este mês", last_month: "Mês passado",
};

const PRIORIDADE_LABELS: Record<string, string> = {
  urgent: "URGENTE", high: "ALTA", normal: "NORMAL", low: "BAIXA",
};

const TIPO_LABELS: Record<string, string> = {
  CRIATIVO: "🎨 CRIATIVO", TRACKING: "📡 RASTREAMENTO", ESTRUTURA: "🏗️ ESTRUTURA",
  OTIMIZACAO: "⚡ OTIMIZAÇÃO", ANALISE: "🔍 ANÁLISE",
  PAUSAR: "PAUSAR", ESCALAR: "ESCALAR", TESTAR: "TESTAR",
  CORRIGIR: "CORRIGIR", CONSOLIDAR: "CONSOLIDAR", RENOVAR: "RENOVAR",
};

const FADIGA_LABELS: Record<string, string> = {
  SAUDAVEL: "✅ Saudável", HOOK_FRACO: "⚠️ Gancho Fraco",
  RETENCAO_FRACA: "⚠️ Retenção Fraca", CRIATIVO_FRACO: "🔴 Criativo Fraco",
  SATURADO: "🔴 Saturado — Trocar", RANKINGS_BAIXOS: "🔴 Baixa Qualidade",
  SEM_DADOS: "⚪ Sem dados suficientes",
};

const RANKING_LABELS: Record<string, string> = {
  ABOVE_AVERAGE: "✅ Acima da Média", AVERAGE: "➖ Na Média",
  BELOW_AVERAGE: "🔴 Abaixo da Média",
};

function translateRanking(val: string): string | null {
  if (!val || val === "N/A") return null;
  const upper = val.toUpperCase().replace(/\s+/g, "_");
  if (upper.includes("ABOVE")) return RANKING_LABELS.ABOVE_AVERAGE;
  if (upper.includes("BELOW")) return RANKING_LABELS.BELOW_AVERAGE;
  if (upper === "AVERAGE") return RANKING_LABELS.AVERAGE;
  return val;
}

const PUBLICO_LABELS: Record<string, string> = {
  BROAD: "Público Amplo", INTERESSE: "Público por Interesse", LOOKALIKE: "Público Similar",
};

const METRIC_TOOLTIPS: Record<string, string> = {
  "CPM": "Quanto você paga para seu anúncio ser visto 1.000 vezes. Quanto menor, melhor.",
  "CTR": "% das pessoas que viram o anúncio e clicaram. Acima de 1% é bom.",
  "ROAS": "Para cada R$1 investido, quanto voltou em vendas. Acima de 3x é saudável.",
  "CPL": "Quanto custou cada lead ou venda gerada.",
  "CPA": "Quanto custou cada lead ou venda gerada.",
  "Hook": "% das pessoas que assistiram pelo menos 3 segundos do vídeo. Abaixo de 15% significa que o início do vídeo não está prendendo atenção.",
  "Hold": "% de quem ficou nos 3s iniciais e continuou assistindo. Abaixo de 25% significa que o corpo do vídeo não está entregando o que o início prometeu.",
  "ThruPlay": "% das pessoas que assistiram o vídeo completo. Acima de 3% é bom.",
  "Frequência": "Quantas vezes em média a mesma pessoa viu seu anúncio. Acima de 3.5x a audiência começa a cansar.",
  "Orçamento": "% do orçamento que foi efetivamente gasto. Abaixo de 80% indica que o Meta está com dificuldade de entregar — audiência pequena ou qualidade do pixel baixa.",
  "Learning": "Conjuntos de anúncios que não conseguiram dados suficientes para o Meta otimizar. Precisa aumentar orçamento ou consolidar campanhas.",
};

/* ─── Metric label translations ─── */
function translateMetricLabel(label: string): string {
  const map: Record<string, string> = {
    "CPM": "CPM — Custo por 1.000 Exibições",
    "CTR": "CTR — Taxa de Cliques",
    "CPC": "CPC — Custo por Clique",
    "CPL": "CPL — Custo por Lead",
    "ROAS": "ROAS — Retorno do Investimento",
    "CPA": "CPA — Custo por Venda",
    "CPA/CPL": "CPA — Custo por Venda",
    "Hook Rate": "Atenção Inicial (3s)",
    "Hold Rate": "Retenção do Vídeo",
    "ThruPlay Rate": "Assistiu até o Final",
    "Impressões": "Total de Exibições",
    "Alcance": "Pessoas Alcançadas",
    "Cliques Saída": "Cliques para o Site/WhatsApp",
    "Frequência": "Frequência Média (vezes que viram o anúncio)",
    "Conversas Iniciadas": "Conversas no WhatsApp",
    "Conversas": "Conversas no WhatsApp",
  };
  return map[label] || label;
}

function getTooltipForLabel(label: string): string | null {
  if (label.includes("CPM")) return METRIC_TOOLTIPS.CPM;
  if (label.includes("CTR")) return METRIC_TOOLTIPS.CTR;
  if (label.includes("ROAS")) return METRIC_TOOLTIPS.ROAS;
  if (label.includes("CPL") || label.includes("CPA")) return METRIC_TOOLTIPS.CPL;
  if (label.includes("Atenção") || label.includes("Hook")) return METRIC_TOOLTIPS.Hook;
  if (label.includes("Retenção") || label.includes("Hold")) return METRIC_TOOLTIPS.Hold;
  if (label.includes("Assistiu") || label.includes("ThruPlay")) return METRIC_TOOLTIPS.ThruPlay;
  if (label.includes("Frequência")) return METRIC_TOOLTIPS.Frequência;
  if (label.includes("Orçamento")) return METRIC_TOOLTIPS.Orçamento;
  if (label.includes("Aprendizado") || label.includes("Learning")) return METRIC_TOOLTIPS.Learning;
  return null;
}

/* ─── Constants ─── */
const PERIODOS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_28d", label: "Últimos 28 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "last_90d", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

const LOADING_MSGS = [
  "🔍 Buscando campanhas...",
  "📊 Analisando Ad Sets...",
  "🎨 Avaliando criativos...",
  "🤖 IA processando análise...",
  "✨ Finalizando recomendações...",
];

const SCORE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICO: { bg: "bg-red-500/20", text: "text-red-400", label: "🔴 CRÍTICO" },
  ATENCAO: { bg: "bg-orange-500/20", text: "text-orange-400", label: "🟡 ATENÇÃO" },
  SAUDAVEL: { bg: "bg-green-500/20", text: "text-green-400", label: "🟢 SAUDÁVEL" },
  ESCALA: { bg: "bg-purple-500/20", text: "text-purple-400", label: "🚀 PRONTO PARA ESCALAR" },
};

const PRIORIDADE_STYLES: Record<string, string> = {
  urgent: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-muted text-muted-foreground",
};

const TIPO_STYLES: Record<string, string> = {
  PAUSAR: "bg-red-500/20 text-red-400",
  ESCALAR: "bg-green-500/20 text-green-400",
  TESTAR: "bg-blue-500/20 text-blue-400",
  CORRIGIR: "bg-orange-500/20 text-orange-400",
  CONSOLIDAR: "bg-purple-500/20 text-purple-400",
  RENOVAR: "bg-cyan-500/20 text-cyan-400",
  CRIATIVO: "bg-pink-500/20 text-pink-400",
  TRACKING: "bg-yellow-500/20 text-yellow-400",
  ESTRUTURA: "bg-indigo-500/20 text-indigo-400",
  OTIMIZACAO: "bg-amber-500/20 text-amber-400",
  ANALISE: "bg-teal-500/20 text-teal-400",
};

const URGENCIA_STYLES: Record<string, string> = {
  HOJE: "bg-red-500/20 text-red-400",
  "3-7 DIAS": "bg-orange-500/20 text-orange-400",
  "2-4 SEMANAS": "bg-blue-500/20 text-blue-400",
};

function getConfig() {
  const stored = localStorage.getItem("meta_config");
  if (stored) return JSON.parse(stored);
  return {
    webhookAnalise: "https://principaln8o.gigainteligencia.com.br/webhook/gestor-meta-ads",
    webhookTarefa: "https://principaln8o.gigainteligencia.com.br/webhook/gestor-meta-criar-tarefa",
  };
}

function saveHistorico(entry: any) {
  const historico = JSON.parse(localStorage.getItem("meta_historico") || "[]");
  historico.unshift(entry);
  localStorage.setItem("meta_historico", JSON.stringify(historico.slice(0, 30)));
}

/* ─── Main Component ─── */
const GestorMetaAds = () => {
  const navigate = useNavigate();

  // State
  const [clientes, setClientes] = useState<ClienteMeta[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteMeta | null>(null);
  const [periodo, setPeriodo] = useState("last_28d");
  const [contexto, setContexto] = useState({ tipo: "LOCAL" as string, metaRoas: "", metaCpa: "", contexto: "" });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [data, setData] = useState<MetaData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState(getConfig());
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [clickupModal, setClickupModal] = useState<{ tarefa: MetaTarefa; index: number } | null>(null);
  const [clickupForm, setClickupForm] = useState({ titulo: "", descricao: "", prioridade: "normal", listId: "" });
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoBanner, setHistoricoBanner] = useState<string | null>(null);

  useEffect(() => { setClientes(getClientesMeta()); }, []);

  useEffect(() => {
    if (selectedCliente) {
      setContexto({
        tipo: selectedCliente.tipo,
        metaRoas: selectedCliente.metaRoas,
        metaCpa: selectedCliente.metaCpa,
        contexto: selectedCliente.contexto,
      });
    }
  }, [selectedCliente]);

  // Loading messages rotation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MSGS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedCliente) { toast.error("Selecione um cliente"); return; }
    setLoading(true); setLoadingMsg(0); setData(null); setHistoricoBanner(null);

    const config = getConfig();
    const timeout = setTimeout(() => {
      setLoading(false);
      toast.error("A análise demorou mais que o esperado. Tente novamente.");
    }, 300000);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 295000);
      const res = await fetch(config.webhookAnalise, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ad_account_id: selectedCliente.adAccountId,
          cliente_nome: selectedCliente.nome,
          periodo, tipo_negocio: contexto.tipo,
          meta_roas: contexto.metaRoas || null,
          meta_cpa: contexto.metaCpa || null,
          contexto: contexto.contexto || "",
          list_id: selectedCliente.listClickupId,
        }),
      });

      let raw = await res.text();
      clearTimeout(fetchTimeout);
      let parsed: any;

      // Handle n8n/MCP array wrapper
      try {
        const arr = JSON.parse(raw);

        if (Array.isArray(arr)) {
          if (arr[0]?.json) {
            parsed = arr[0].json;
          } else if (arr[0]?.content?.[0]?.text) {
            const inner = arr[0].content[0].text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
            parsed = JSON.parse(inner);
          } else {
            parsed = arr[0];
          }
        } else {
          parsed = arr;
        }
      } catch {
        parsed = JSON.parse(raw);
      }

      setData(parsed as MetaData);

      // Save to history
      saveHistorico({
        id: Date.now(),
        cliente: selectedCliente.nome,
        data: new Date().toLocaleDateString("pt-BR"),
        periodo,
        score: parsed.analise?.score_conta,
        resumo: parsed.resumo,
        analise: parsed.analise,
        campanhas: parsed.campanhas,
        adsets: parsed.adsets,
        anuncios: parsed.anuncios,
        tarefas_sugeridas: parsed.tarefas_sugeridas,
      });

      toast.success("Análise concluída!");
    } catch (err: any) {
      toast.error("❌ Erro ao buscar dados. Verifique sua conexão e tente novamente.");
      console.error("[META-ADS] Erro:", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [selectedCliente, periodo, contexto]);

  const saveConfig = () => {
    localStorage.setItem("meta_config", JSON.stringify(configForm));
    setConfigOpen(false);
    toast.success("Configurações salvas!");
  };

  const loadFromHistory = (entry: any) => {
    setData({
      status: "success", cliente: entry.cliente,
      data_analise: entry.data, periodo: entry.periodo,
      resumo: entry.resumo, alertas: [],
      analise: entry.analise, campanhas: entry.campanhas || [],
      adsets: entry.adsets || [], anuncios: entry.anuncios || [],
      tarefas_sugeridas: entry.tarefas_sugeridas || [],
    });
    setHistoricoBanner(`📁 Análise salva em ${entry.data} — não é tempo real`);
    setHistoricoOpen(false);
    setActiveTab(0);
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTask = (idx: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const openClickup = (tarefa: MetaTarefa, index: number) => {
    setClickupModal({ tarefa, index });
    setClickupForm({
      titulo: tarefa.nome,
      descricao: `Diagnóstico: ${tarefa.descricao}\n\nAção: ${tarefa.tipo}\n\nImpacto: ${tarefa.impacto_esperado || ""}`,
      prioridade: tarefa.prioridade || "normal",
      listId: selectedCliente?.listClickupId || "",
    });
  };

  const createClickupTask = async () => {
    if (!clickupModal) return;
    const config = getConfig();
    try {
      await fetch(config.webhookTarefa, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: clickupForm.listId,
          cliente: selectedCliente?.nome || data?.cliente || "",
          tarefas: [{ nome: clickupForm.titulo, descricao: clickupForm.descricao, prioridade: clickupForm.prioridade }],
        }),
      });
      toast.success("✅ Tarefa criada no ClickUp!");
      setClickupModal(null);
    } catch {
      toast.error("Erro ao criar tarefa no ClickUp");
    }
  };

  const score = data?.analise?.score_conta;
  const scoreStyle = score ? SCORE_STYLES[score] || SCORE_STYLES.ATENCAO : null;

  /* ─── Render ─── */
  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Gestor Meta Ads IA</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistoricoOpen(true)}>
              <Clock className="w-4 h-4 mr-1" /> Histórico
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/clientes-meta")}>
              <Users className="w-4 h-4 mr-1" /> Clientes
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setConfigOpen(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[200px] flex-1">
                <Label className="text-xs text-muted-foreground mb-1">Cliente</Label>
                <Select
                  value={selectedCliente?.id?.toString() || ""}
                  onValueChange={v => setSelectedCliente(clientes.find(c => c.id.toString() === v) || null)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar Cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs text-muted-foreground mb-1">Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={loading || !selectedCliente}
                className="bg-[#1877F2] hover:bg-[#1565c0] text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                EXECUTAR ANÁLISE
              </Button>
            </div>

            {/* Context fields */}
            {selectedCliente && (
              <div className="flex flex-wrap gap-3 items-end border-t border-border pt-3">
                <div className="min-w-[120px]">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={contexto.tipo} onValueChange={v => setContexto({ ...contexto, tipo: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["LOCAL", "B2C", "ECOMMERCE", "B2B"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label className="text-xs text-muted-foreground">Meta ROAS</Label>
                  <Input className="h-8 text-xs" placeholder="3.0x" value={contexto.metaRoas} onChange={e => setContexto({ ...contexto, metaRoas: e.target.value })} />
                </div>
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Meta CPA/CPL</Label>
                  <Input className="h-8 text-xs" placeholder="R$50" value={contexto.metaCpa} onChange={e => setContexto({ ...contexto, metaCpa: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Contexto</Label>
                    <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => setContexto({ ...contexto, contexto: "Produto/serviço: Portas laqueadas premium | Ticket médio: R$1.800 | Raio de atendimento: 17km | Público-alvo: Proprietários reformando imóvel, 30-55 anos | Diferencial: Acabamento superior, não fazemos porta popular | Observações: Campanha local, vendas via WhatsApp" })}>Ver exemplo</button>
                  </div>
                  <Input className="h-8 text-xs" placeholder="Produto/serviço: | Ticket médio: R$ | Raio de atendimento: km | Público-alvo: | Diferencial: | Observações:" value={contexto.contexto} onChange={e => setContexto({ ...contexto, contexto: e.target.value })} />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Quanto mais contexto, mais precisa é a análise da IA</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-[#1877F2] mb-4" />
            <p className="text-lg text-foreground animate-pulse">{LOADING_MSGS[loadingMsg]}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BarChart2 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">Selecione um cliente e execute a análise</p>
          </div>
        )}

        {/* Results */}
        {!loading && data && (
          <>
            {/* Historic banner */}
            {historicoBanner && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">
                {historicoBanner}
              </div>
            )}

            {/* Score bar */}
            {scoreStyle && (
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-3 py-1 rounded-full font-semibold ${scoreStyle.bg} ${scoreStyle.text}`}>
                  {scoreStyle.label}
                </span>
                <span className="text-muted-foreground">
                  Cliente: <span className="text-foreground font-medium">{data.cliente}</span> | Período: {PERIODO_LABELS[data.periodo] || data.periodo} | {data.data_analise}
                </span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {["Resumo", "Campanhas", "Criativos", "Tarefas"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === i
                      ? "border-[#1877F2] text-[#1877F2]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {i === 3 && data.tarefas_sugeridas?.length > 0 && (
                    <span className="ml-1.5 bg-[#1877F2]/20 text-[#1877F2] text-xs px-1.5 py-0.5 rounded-full">
                      {data.tarefas_sugeridas.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                {/* ─── TAB 0: RESUMO ─── */}
                {activeTab === 0 && data.resumo && (
                  <div className="space-y-4">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard icon={DollarSign} label="Investimento" value={`R$ ${Number(data.resumo.total_investimento || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      <MetricCard icon={TrendingUp} label="ROAS — Retorno do Investimento" value={
                        (() => {
                          const roas = data.resumo.roas_geral;
                          const objetivo = (data.resumo.tipo_campanha || data.resumo.objetivo || "").toString().toUpperCase();
                          const isVendas = objetivo.includes("VENDA") || objetivo.includes("SALE") || objetivo.includes("PURCHASE");
                          const roasStr = String(roas || "0").replace(/x$/i, "");
                          if ((roasStr === "0" || roasStr === "0.00") && !isVendas) {
                            const cpl = data.resumo.cpl || data.resumo.custo_por_lead;
                            return cpl ? <span className="flex flex-col items-center"><span>N/A</span><span className="text-xs text-muted-foreground">CPL: R${Number(cpl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></span> : "N/A";
                          }
                          return `${roas || "0"}x`;
                        })()
                      } tooltip={METRIC_TOOLTIPS.ROAS} />
                      <MetricCard icon={Layers} label="Campanhas" value={
                        <span className="flex gap-1.5 text-sm">
                          <span className="text-green-400">🟢{data.resumo.campanhas_saudaveis || 0}</span>
                          <span className="text-orange-400">🟡{data.resumo.campanhas_atencao || 0}</span>
                          <span className="text-red-400">🔴{data.resumo.campanhas_criticas || 0}</span>
                        </span>
                      } />
                      <MetricCard icon={AlertTriangle} label="Alertas" value={`${data.alertas?.length || data.analise?.alertas_criticos?.length || 0} críticos`} accent="text-red-400" />
                    </div>

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(() => {
                        const cpmVal = parseFloat(String(data.resumo.cpm_medio || "0").replace(",", "."));
                        const cpmStatus: "green" | "yellow" | "red" = cpmVal < 22 ? "green" : cpmVal <= 38 ? "yellow" : "red";
                        return <MiniMetric label="CPM — Custo por 1.000 Exibições" value={`R$ ${data.resumo.cpm_medio || "0"}`} status={cpmStatus} tooltip={METRIC_TOOLTIPS.CPM} />;
                      })()}
                      {(() => {
                        const freqVal = parseFloat(String(data.resumo.frequencia_media || "0").replace(",", "."));
                        const freqStatus: "green" | "yellow" | "red" = freqVal < 3.0 ? "green" : freqVal <= 3.5 ? "yellow" : "red";
                        return <MiniMetric label="Frequência Média (vezes que viram o anúncio)" value={data.resumo.frequencia_media || "0"} status={freqStatus} tooltip={METRIC_TOOLTIPS.Frequência} />;
                      })()}
                      {(() => {
                        const isMsg = String(data.resumo.objetivo_predominante || "").toUpperCase() === "MENSAGENS" && (data.resumo.total_conversas ?? 0) > 0;
                        const cplVal = isMsg ? Number(data.resumo.cpl_conversas || data.resumo.cpl || 0) : Number(data.resumo.cpl_geral || data.resumo.cpl || 0);
                        const metaCpa = parseFloat(String(data.resumo.cpa_geral || "0").replace(",", "."));
                        let cplStatus: "green" | "yellow" | "red" | "gray" = "gray";
                        if (metaCpa > 0 && cplVal > 0) {
                          cplStatus = cplVal <= metaCpa ? "green" : cplVal <= metaCpa * 1.2 ? "yellow" : "red";
                        }
                        return (
                          <MiniMetric
                            label={isMsg ? "Conversas no WhatsApp" : "Total Leads/Compras"}
                            value={
                              isMsg
                                ? <span className="flex flex-col items-center"><span>{data.resumo.total_conversas}</span>{data.resumo.cpl_conversas && <span className="text-xs text-muted-foreground">CPL R${Number(data.resumo.cpl_conversas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}</span>
                                : `${data.resumo.total_leads || 0} / ${data.resumo.total_compras || 0}`
                            }
                            status={cplStatus}
                            tooltip={METRIC_TOOLTIPS.CPL}
                          />
                        );
                      })()}
                      {(() => {
                        const llVal = Number(data.resumo.adsets_learning_limited || 0);
                        const llStatus: "green" | "yellow" | "red" = llVal === 0 ? "green" : llVal === 1 ? "yellow" : "red";
                        return <MiniMetric label="Conjuntos em Aprendizado Limitado" value={String(llVal)} status={llStatus} tooltip={METRIC_TOOLTIPS.Learning} />;
                      })()}
                    </div>

                    {/* Alerts */}
                    {(data.analise?.alertas_criticos?.length > 0 || data.alertas?.length > 0) && (
                      <Card className="border-red-500/30 bg-red-500/5">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <span className="font-semibold text-red-400">Alertas Críticos</span>
                          </div>
                          <ul className="space-y-1.5">
                            {(data.analise?.alertas_criticos || data.alertas || []).map((a: any, i: number) => (
                              <li key={i} className="text-sm text-red-300/80 flex gap-2">
                                <span>⚠️</span><span>{typeof a === "string" ? a : a?.msg || a?.texto || JSON.stringify(a)}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Executive summary */}
                    {data.analise?.resumo_executivo && (
                      <Card className="border-[#1877F2]/30 bg-[#1877F2]/5">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-[#1877F2] mb-2">Resumo Executivo da IA</h3>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{data.analise.resumo_executivo}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Opportunities */}
                    {data.analise?.oportunidades?.length > 0 && (
                      <Card className="border-green-500/30 bg-green-500/5">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-green-400 mb-2">Oportunidades detectadas</h3>
                          <ul className="space-y-1.5">
                            {data.analise.oportunidades.map((o: any, i: number) => (
                              <li key={i} className="text-sm text-green-300/80 flex gap-2">
                                <span>💡</span><span>{typeof o === "string" ? o : o?.msg || o?.texto || JSON.stringify(o)}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Projection */}
                    {data.analise?.projecao && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-3">Projeção</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-muted/50 rounded-lg p-3">
                              <span className="text-xs text-muted-foreground">Cenário atual</span>
                              <p className="text-sm text-foreground mt-1">
                                {(() => {
                                  const periodDays: Record<string, number> = {
                                    today: 1, yesterday: 1, last_7d: 7, last_14d: 14,
                                    last_28d: 28, last_30d: 30, last_90d: 90, this_month: new Date().getDate(),
                                    last_month: new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate(),
                                  };
                                  const dias = periodDays[data.periodo] || 28;
                                  const investimento = Number(data.resumo.total_investimento || 0);
                                  const diaria = investimento / dias;
                                  const projecao30 = diaria * 30;
                                  return `Se nada mudar, em 30 dias a campanha vai gastar aproximadamente R$${projecao30.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                })()}
                              </p>
                            </div>
                            <div className="bg-green-500/10 rounded-lg p-3">
                              <span className="text-xs text-green-400">Com otimizações</span>
                              <p className="text-sm text-foreground mt-1">{data.analise.projecao.com_otimizacoes}</p>
                            </div>
                          </div>
                          <div className="flex gap-6 mt-3">
                            <div>
                              <span className="text-xs text-muted-foreground">ROAS esperado</span>
                              <p className="text-lg font-bold text-green-400">{data.analise.projecao.roas_esperado}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Redução CPA estimada</span>
                              <p className="text-lg font-bold text-green-400">{data.analise.projecao.reducao_cpa_estimada}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* ─── TAB 1: CAMPANHAS ─── */}
                {activeTab === 1 && (
                  <div className="space-y-3">
                    {(data.campanhas || [])
                      .sort((a, b) => {
                        const order: Record<string, number> = { CRITICO: 0, ATENCAO: 1, SAUDAVEL: 2, ESCALA: 3 };
                        return (order[a.status_performance] ?? 4) - (order[b.status_performance] ?? 4);
                      })
                      .map(camp => {
                        const open = expandedCampaigns.has(camp.id);
                        const st = SCORE_STYLES[camp.status_performance] || SCORE_STYLES.ATENCAO;
                        const m = camp.metricas || {};
                        const diag = data.analise?.diagnostico_por_campanha?.find(d => d.nome === camp.nome);
                        const tipo = ((camp as any).tipo_campanha || m.tipo_campanha || m.objetivo || m.objective || "").toString().toUpperCase();
                        const isMsg = tipo.includes("MENSAG") || tipo.includes("MESSAGE");
                        const isLeads = !isMsg && (tipo.includes("LEAD"));
                        const isTrafego = !isMsg && !isLeads && (tipo.includes("TRAFEGO") || tipo.includes("TRAFFIC") || tipo.includes("LINK_CLICK"));
                        const isAwareness = !isMsg && !isLeads && !isTrafego && (tipo.includes("AWARENESS") || tipo.includes("ALCANCE") || tipo.includes("REACH"));
                        const isNonSales = isMsg || isLeads || isTrafego || isAwareness;

                        const headerMetric = isMsg
                          ? `Conversas: ${m.conversas_iniciadas || m.conversas || m.messaging_conversations_started || 0} | CPL R$${Number(m.custo_por_conversa || m.cpl || m.cost_per_conversation || 0).toFixed(2)}`
                          : isLeads
                          ? `Leads: ${m.leads || m.total_leads || 0} | CPL R$${Number(m.cpl || m.cost_per_lead || 0).toFixed(2)}`
                          : isTrafego
                          ? `Cliques: ${Number(m.outbound_clicks || m.clicks || 0).toLocaleString()} | CPC R$${Number(m.cpc || m.cost_per_click || 0).toFixed(2)}`
                          : isAwareness
                          ? `Alcance: ${Number(m.reach || 0).toLocaleString()} | CPM R$${Number(m.cpm || 0).toFixed(2)}`
                          : `ROAS ${m.roas || "—"}x`;

                        return (
                          <Card key={camp.id} className="overflow-hidden">
                            <button onClick={() => toggleCampaign(camp.id)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                              {(camp as any).gerenciador_url ? (
                                <a
                                  href={(camp as any).gerenciador_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-foreground flex-1 truncate hover:underline inline-flex items-center gap-1"
                                >
                                  {camp.nome}
                                  <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                                </a>
                              ) : (
                                <span className="font-medium text-foreground flex-1 truncate">{camp.nome}</span>
                              )}
                              <span className="text-sm text-muted-foreground">R$ {Number(m.spend || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              <span className="text-sm text-muted-foreground">{headerMetric}</span>
                              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>

                            <AnimatePresence>
                              {open && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="p-4 pt-0 space-y-3 border-t border-border">
                                    {/* Metrics grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                      {(() => {
                                        const base: [string, string][] = [
                                          ["Investimento", `R$ ${Number(m.spend || 0).toFixed(2)}`],
                                        ];
                                        if (isMsg) {
                                          base.push(
                                            ["Conversas no WhatsApp", String(m.conversas_iniciadas || m.conversas || m.messaging_conversations_started || 0)],
                                            ["CPL — Custo por Lead", `R$ ${Number(m.custo_por_conversa || m.cpl || m.cost_per_conversation || 0).toFixed(2)}`],
                                          );
                                        } else if (isLeads) {
                                          base.push(
                                            ["Leads", String(m.leads || m.total_leads || 0)],
                                            ["CPL — Custo por Lead", `R$ ${Number(m.cpl || m.cost_per_lead || 0).toFixed(2)}`],
                                          );
                                        } else if (isTrafego) {
                                          base.push(
                                            ["Cliques para o Site/WhatsApp", Number(m.outbound_clicks || m.clicks || 0).toLocaleString()],
                                            ["CPC — Custo por Clique", `R$ ${Number(m.cpc || m.cost_per_click || 0).toFixed(2)}`],
                                          );
                                        } else if (isAwareness) {
                                          base.push(
                                            ["Pessoas Alcançadas", Number(m.reach || 0).toLocaleString()],
                                            ["CPM — Custo por 1.000 Exibições", `R$ ${Number(m.cpm || 0).toFixed(2)}`],
                                          );
                                        } else {
                                          base.push(
                                            ["Receita", `R$ ${Number(m.revenue || 0).toFixed(2)}`],
                                            ["ROAS — Retorno do Investimento", `${m.roas || "—"}x`],
                                            ["CPA — Custo por Venda", `R$ ${Number(m.cpa || m.cpl || 0).toFixed(2)}`],
                                          );
                                        }
                                        base.push(
                                          ["Total de Exibições", Number(m.impressions || 0).toLocaleString()],
                                          ["Pessoas Alcançadas", Number(m.reach || 0).toLocaleString()],
                                          ["Frequência Média (vezes que viram o anúncio)", m.frequency || "—"],
                                          ["CPM — Custo por 1.000 Exibições", `R$ ${Number(m.cpm || 0).toFixed(2)}`],
                                          ["CTR — Taxa de Cliques", `${m.ctr || "—"}%`],
                                          ["Cliques para o Site/WhatsApp", Number(m.outbound_clicks || m.clicks || 0).toLocaleString()],
                                        );
                                        // Deduplicate by label
                                        const seen = new Set<string>();
                                        return base.filter(([l]) => { if (seen.has(l)) return false; seen.add(l); return true; })
                                          .map(([label, val]) => {
                                            const tip = getTooltipForLabel(label);
                                            return (
                                              <Tooltip key={label}>
                                                <TooltipTrigger asChild>
                                                  <div className="bg-muted/30 rounded p-2 cursor-default">
                                                    <span className="text-muted-foreground block">{label}</span>
                                                    <span className="text-foreground font-medium">{val}</span>
                                                  </div>
                                                </TooltipTrigger>
                                                {tip && <TooltipContent side="top" className="max-w-xs text-xs"><p>{tip}</p></TooltipContent>}
                                              </Tooltip>
                                            );
                                          });
                                      })()}
                                    </div>

                                    {/* Video metrics */}
                                    {(m.hook_rate || m.hold_rate) && (
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="bg-muted/30 rounded p-2 cursor-default">
                                              <span className="text-muted-foreground">Atenção Inicial (3s)</span>
                                              <span className="text-foreground font-medium block">{m.hook_rate || "—"}%</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-xs"><p>{METRIC_TOOLTIPS.Hook}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="bg-muted/30 rounded p-2 cursor-default">
                                              <span className="text-muted-foreground">Retenção do Vídeo</span>
                                              <span className="text-foreground font-medium block">{m.hold_rate || "—"}%</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-xs"><p>{METRIC_TOOLTIPS.Hold}</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="bg-muted/30 rounded p-2 cursor-default">
                                              <span className="text-muted-foreground">Assistiu até o Final</span>
                                              <span className="text-foreground font-medium block">{m.thruplay_rate || "—"}%</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-xs"><p>{METRIC_TOOLTIPS.ThruPlay}</p></TooltipContent>
                                        </Tooltip>
                                      </div>
                                    )}

                                    {/* Ad Sets (Conjuntos de Anúncios) */}
                                    {(() => {
                                      const campAdsets = (data.adsets || []).filter((as: any) =>
                                        as.campaign_id === camp.id || as.campanha_id === camp.id || as.campanha === camp.nome
                                      );
                                      if (campAdsets.length === 0) return null;
                                      return (
                                        <div className="space-y-1.5">
                                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                            <Layers className="w-3 h-3" /> Conjuntos de Anúncios ({campAdsets.length})
                                          </span>
                                          {campAdsets.map((as: any, ai: number) => {
                                            const am = as.metricas || as;
                                            return (
                                              <div key={ai} className="bg-muted/20 rounded-lg p-3 border border-border/30 space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                  {as.gerenciador_url ? (
                                                    <a
                                                      href={as.gerenciador_url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-sm font-medium text-foreground hover:underline inline-flex items-center gap-1 truncate"
                                                    >
                                                      {as.nome || as.name || `Conjunto ${ai + 1}`}
                                                      <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                                                    </a>
                                                  ) : (
                                                    <span className="text-sm font-medium text-foreground truncate">{as.nome || as.name || `Conjunto ${ai + 1}`}</span>
                                                  )}
                                                  {as.status && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{as.status}</span>}
                                                </div>
                                                <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 text-xs">
                                                  {[
                                                    ["Investimento", `R$ ${Number(am.spend || 0).toFixed(2)}`],
                                                    ["Total de Exibições", Number(am.impressions || 0).toLocaleString()],
                                                    ["Pessoas Alcançadas", Number(am.reach || 0).toLocaleString()],
                                                    ["CPM", `R$ ${Number(am.cpm || 0).toFixed(2)}`],
                                                    ["CTR", `${am.ctr || "—"}%`],
                                                  ].map(([label, val]) => (
                                                    <div key={label as string} className="bg-muted/30 rounded p-1.5">
                                                      <span className="text-muted-foreground block text-[10px]">{label}</span>
                                                      <span className="text-foreground font-medium">{val}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}

                                    {/* Alerts */}
                                    {camp.alertas?.length > 0 && (
                                      <div className="bg-red-500/5 rounded p-3">
                                        <span className="text-xs font-semibold text-red-400">Alertas</span>
                                        <ul className="mt-1 space-y-0.5">
                                          {camp.alertas.map((a: any, i) => (
                                            <li key={i} className="text-xs text-red-300/80">⚠️ {typeof a === "string" ? a : a?.msg || a?.texto || JSON.stringify(a)}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* AI diagnosis */}
                                    {diag && (
                                      <div className="bg-[#1877F2]/5 rounded p-3 space-y-2">
                                        <span className="text-xs font-semibold text-[#1877F2]">Diagnóstico IA</span>
                                        <p className="text-xs text-foreground/80">{diag.diagnostico}</p>
                                        <div className="bg-[#1877F2]/10 rounded p-2">
                                          <span className="text-xs text-[#1877F2] font-medium">Ação principal:</span>
                                          <p className="text-xs text-foreground/80 mt-0.5">{diag.acao_principal}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Card>
                        );
                      })}
                    {(!data.campanhas || data.campanhas.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada</p>
                    )}
                  </div>
                )}

                {/* ─── TAB 2: CRIATIVOS ─── */}
                {activeTab === 2 && (
                  <div className="space-y-4">
                    {/* Creative summary */}
                    {data.analise?.diagnostico_criativos?.resumo && (
                      <Card className="border-[#1877F2]/30">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-[#1877F2] mb-2">Resumo geral dos criativos</h3>
                          <p className="text-sm text-foreground/80">{data.analise.diagnostico_criativos.resumo}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Winners */}
                    {data.analise?.diagnostico_criativos?.winners?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" /> Winners
                        </h3>
                        <div className="space-y-2">
                          {data.analise.diagnostico_criativos.winners.map((w: any, i: number) => {
                            const isVideo = w.metricas?.hook_rate != null && w.metricas?.hook_rate !== "" && w.metricas?.hook_rate !== "N/A";
                            const nome = typeof w === "string" ? w : w.nome || w.name || "";
                            const isCarrossel = /carrossel|carousel/i.test(nome);
                            const tipoBadge = isVideo ? "🎬 Vídeo" : isCarrossel ? "🎠 Carrossel" : "🖼️ Imagem";
                            return (
                              <Card key={i} className="border-green-500/20 bg-green-500/5">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">BOM</span>
                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">{tipoBadge}</span>
                                    <span className="text-sm text-foreground flex-1">{typeof w === "string" ? w : w.nome || w.name || JSON.stringify(w)}</span>
                                  </div>
                                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                                    {w.roas && <span>ROAS {w.roas}x</span>}
                                    {w.ctr && <span>CTR {w.ctr}%</span>}
                                    {w.metricas?.cpm && <span>CPM R${w.metricas.cpm}</span>}
                                    {w.metricas?.frequency && <span>Frequência {w.metricas.frequency}</span>}
                                    {isVideo && w.metricas?.hook_rate && <span>Atenção Inicial {w.metricas.hook_rate}%</span>}
                                    {isVideo && w.metricas?.hold_rate && <span>Retenção {w.metricas.hold_rate}%</span>}
                                    {isVideo && w.metricas?.thruplay_rate && <span>Assistiu até o Final {w.metricas.thruplay_rate}%</span>}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fatigued / Problem ads */}
                    {data.analise?.diagnostico_criativos?.fatigados?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Atenção / Fadiga
                        </h3>
                        <div className="space-y-2">
                          {data.analise.diagnostico_criativos.fatigados.map((f: any, i: number) => {
                            const fadigaColors: Record<string, string> = {
                              SATURADO: "bg-red-500/20 text-red-400",
                              HOOK_FRACO: "bg-orange-500/20 text-orange-400",
                              RETENCAO_FRACA: "bg-orange-500/20 text-orange-400",
                              CRIATIVO_FRACO: "bg-red-500/20 text-red-400",
                              RANKINGS_BAIXOS: "bg-red-500/20 text-red-400",
                              SAUDAVEL: "bg-green-500/20 text-green-400",
                              SEM_DADOS: "bg-muted text-muted-foreground",
                            };
                            const isVideo = f.metricas?.hook_rate != null && f.metricas?.hook_rate !== "" && f.metricas?.hook_rate !== "N/A";
                            const nome = typeof f === "string" ? f : f.nome || f.name || "";
                            const isCarrossel = /carrossel|carousel/i.test(nome);
                            const tipoBadge = isVideo ? "🎬 Vídeo" : isCarrossel ? "🎠 Carrossel" : "🖼️ Imagem";
                            // For images, hide video-only fatigue diagnoses
                            const fadigaKey = f.diagnostico_fadiga;
                            const hideForImage = !isVideo && (fadigaKey === "HOOK_FRACO" || fadigaKey === "RETENCAO_FRACA");
                            const displayFadiga = hideForImage ? "CRIATIVO_FRACO" : fadigaKey;
                            return (
                              <Card key={i} className="border-orange-500/20">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${fadigaColors[displayFadiga] || "bg-orange-500/20 text-orange-400"}`}>
                                      {FADIGA_LABELS[displayFadiga] || displayFadiga || "ATENÇÃO"}
                                    </span>
                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">{tipoBadge}</span>
                                    <span className="text-sm text-foreground font-medium">{nome}</span>
                                  </div>
                                  {f.rankings && (
                                    <div className="flex gap-3 text-xs flex-wrap">
                                      {Object.entries(f.rankings).map(([k, v]) => {
                                        const translated = translateRanking(v as string);
                                        if (!translated) return null;
                                        return (
                                          <span key={k} className="text-muted-foreground">
                                            {k.replace(/_/g, " ")}: {translated}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {f.metricas && (
                                    <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                                      {f.metricas.ctr && <span>CTR {f.metricas.ctr}%</span>}
                                      {f.metricas.cpm && <span>CPM R${f.metricas.cpm}</span>}
                                      {f.metricas.frequency && <span>Frequência {f.metricas.frequency}</span>}
                                      {f.metricas.investimento && <span>Investimento R${f.metricas.investimento}</span>}
                                      {isVideo && f.metricas.hook_rate && <span>Atenção Inicial {f.metricas.hook_rate}%</span>}
                                      {isVideo && f.metricas.hold_rate && <span>Retenção {f.metricas.hold_rate}%</span>}
                                      {isVideo && f.metricas.thruplay_rate && <span>Assistiu até o Final {f.metricas.thruplay_rate}%</span>}
                                    </div>
                                  )}
                                  {f.recomendacao && <p className="text-xs text-orange-300/80">{f.recomendacao}</p>}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Creative recommendation */}
                    {data.analise?.diagnostico_criativos?.recomendacao && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-2">Recomendação geral de criativos</h3>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{data.analise.diagnostico_criativos.recomendacao}</p>
                        </CardContent>
                      </Card>
                    )}

                    {!data.analise?.diagnostico_criativos && !data.anuncios?.length && (
                      <p className="text-center text-muted-foreground py-8">Nenhum dado de criativos disponível</p>
                    )}

                    {/* Individual ads fallback */}
                    {!data.analise?.diagnostico_criativos && data.anuncios?.length > 0 && (
                      <div className="space-y-2">
                        {data.anuncios.map((an, i) => {
                          const isVideo = an.metricas?.hook_rate != null && an.metricas?.hook_rate !== "" && an.metricas?.hook_rate !== "N/A";
                          const isCarrossel = /carrossel|carousel/i.test(an.nome);
                          const tipoBadge = isVideo ? "🎬 Vídeo" : isCarrossel ? "🎠 Carrossel" : "🖼️ Imagem";
                          const fadigaKey = an.diagnostico_fadiga;
                          const hideForImage = !isVideo && (fadigaKey === "HOOK_FRACO" || fadigaKey === "RETENCAO_FRACA");
                          const displayFadiga = hideForImage ? "CRIATIVO_FRACO" : fadigaKey;
                          return (
                            <Card key={i}>
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-foreground">{an.nome}</span>
                                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">{tipoBadge}</span>
                                  {displayFadiga && (
                                    <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs">
                                      {FADIGA_LABELS[displayFadiga] || displayFadiga}
                                    </span>
                                  )}
                                </div>
                                {an.metricas && (
                                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                                    {an.metricas.ctr && <span>CTR {an.metricas.ctr}%</span>}
                                    {an.metricas.cpm && <span>CPM R${an.metricas.cpm}</span>}
                                    {an.metricas.frequency && <span>Frequência {an.metricas.frequency}</span>}
                                    {isVideo && an.metricas.hook_rate && <span>Atenção Inicial {an.metricas.hook_rate}%</span>}
                                    {isVideo && an.metricas.hold_rate && <span>Retenção {an.metricas.hold_rate}%</span>}
                                    {isVideo && an.metricas.thruplay_rate && <span>Assistiu até o Final {an.metricas.thruplay_rate}%</span>}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: TAREFAS ─── */}
                {activeTab === 3 && (
                  <div className="space-y-3">
                    {data.tarefas_sugeridas?.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          💡 {data.tarefas_sugeridas.length} tarefas sugeridas pela IA
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            if (selectedTasks.size === data.tarefas_sugeridas.length) {
                              setSelectedTasks(new Set());
                            } else {
                              setSelectedTasks(new Set(data.tarefas_sugeridas.map((_, i) => i)));
                            }
                          }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {selectedTasks.size === data.tarefas_sugeridas.length ? "Desmarcar todas" : "Selecionar todas"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(data.tarefas_sugeridas || []).map((tarefa, i) => {
                      const expanded = expandedTasks.has(i);
                      const porQueFazer = tarefa.por_que_fazer?.trim();
                      const comoExecutar = tarefa.como_executar?.trim();
                      // Split como_executar by ";" into numbered steps
                      const execSteps = comoExecutar
                        ? comoExecutar.split(";").map(s => s.trim().replace(/^\d+\.\s*/, "")).filter(Boolean)
                        : [];

                      return (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedTasks.has(i)}
                                onCheckedChange={() => {
                                  setSelectedTasks(prev => {
                                    const next = new Set(prev);
                                    next.has(i) ? next.delete(i) : next.add(i);
                                    return next;
                                  });
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {tarefa.prioridade && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PRIORIDADE_STYLES[tarefa.prioridade] || PRIORIDADE_STYLES.normal}`}>
                                      {PRIORIDADE_LABELS[tarefa.prioridade] || tarefa.prioridade_texto || tarefa.prioridade}
                                    </span>
                                  )}
                                  {tarefa.tipo && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_STYLES[tarefa.tipo] || "bg-blue-500/20 text-blue-400"}`}>
                                      {TIPO_LABELS[tarefa.tipo] || tarefa.tipo}
                                    </span>
                                  )}
                                  {tarefa.urgencia && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${URGENCIA_STYLES[tarefa.urgencia] || "bg-blue-500/20 text-blue-400"}`}>
                                      {tarefa.urgencia}
                                    </span>
                                  )}
                                </div>

                                {/* Task title */}
                                <span className="font-medium text-foreground text-sm block">{tarefa.nome}</span>

                                {/* Por que fazer */}
                                {porQueFazer && (
                                  <div className="mt-1">
                                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 mb-0.5">
                                      ⚠️ Por que fazer:
                                    </span>
                                    <p className="text-xs text-muted-foreground">{porQueFazer}</p>
                                  </div>
                                )}

                                {/* Como executar */}
                                {execSteps.length > 0 && (
                                  <div className="bg-muted/40 rounded-lg p-3 mt-1 border border-border/50">
                                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 mb-1.5">
                                      📋 Como executar:
                                    </span>
                                    <ol className="space-y-1">
                                      {execSteps.map((step, si) => (
                                        <li key={si} className="text-xs text-foreground/70 flex gap-1.5">
                                          <span className="text-blue-400/70 font-medium shrink-0">{si + 1}.</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {expanded && (
                                  <div className="text-xs text-foreground/70 bg-muted/30 rounded p-2 mt-1 whitespace-pre-line">
                                    <strong>Ação:</strong> {TIPO_LABELS[tarefa.tipo] || tarefa.tipo}<br />
                                    <strong>Impacto esperado:</strong> {tarefa.impacto_esperado || "—"}
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => toggleTask(i)} className="text-xs h-7 px-2">
                                    {expanded ? "Ocultar detalhes" : "Ver detalhes"}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => openClickup(tarefa, i)} className="text-xs h-7 px-2">
                                    + ClickUp
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {(!data.tarefas_sugeridas || data.tarefas_sugeridas.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">Nenhuma tarefa sugerida</p>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ─── Config Modal ─── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Webhook Análise Meta Ads</Label>
              <Input value={configForm.webhookAnalise} onChange={e => setConfigForm({ ...configForm, webhookAnalise: e.target.value })} />
            </div>
            <div>
              <Label>Webhook Criar Tarefa ClickUp</Label>
              <Input value={configForm.webhookTarefa} onChange={e => setConfigForm({ ...configForm, webhookTarefa: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveConfig}>💾 Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ClickUp Modal ─── */}
      <Dialog open={!!clickupModal} onOpenChange={() => setClickupModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Tarefa no ClickUp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={clickupForm.titulo} onChange={e => setClickupForm({ ...clickupForm, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={4} value={clickupForm.descricao} onChange={e => setClickupForm({ ...clickupForm, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={clickupForm.prioridade} onValueChange={v => setClickupForm({ ...clickupForm, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lista ClickUp ID</Label>
                <Input value={clickupForm.listId} onChange={e => setClickupForm({ ...clickupForm, listId: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClickupModal(null)}>Cancelar</Button>
            <Button onClick={createClickupTask}>✓ Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── History Modal ─── */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Análises</DialogTitle></DialogHeader>
          <HistoryList onLoad={loadFromHistory} />
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};

/* ─── Sub-components ─── */
function MetricCard({ icon: Icon, label, value, accent, tooltip }: { icon: any; label: string; value: React.ReactNode; accent?: string; tooltip?: string }) {
  const card = (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#1877F2]" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`text-lg font-bold ${accent || "text-foreground"}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }
  return card;
}

function MiniMetric({ label, value, status, tooltip }: { label: string; value: React.ReactNode; status?: "green" | "yellow" | "red" | "gray"; tooltip?: string }) {
  const dot = status ? {
    green: "bg-green-400",
    yellow: "bg-yellow-400",
    red: "bg-red-400",
    gray: "bg-muted-foreground/50",
  }[status] : null;
  const content = (
    <div className={`bg-muted/30 rounded-lg p-3 cursor-default ${dot ? `border-l-2 ${status === "green" ? "border-green-400" : status === "yellow" ? "border-yellow-400" : status === "red" ? "border-red-400" : "border-muted-foreground/50"}` : ""}`}>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
        {dot && <span className={`inline-block w-2 h-2 rounded-full ${dot} flex-shrink-0`} />}
        {value}
      </span>
    </div>
  );
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

function HistoryList({ onLoad }: { onLoad: (entry: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("meta_historico") || "[]"));
  }, []);

  const remove = (id: number) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem("meta_historico", JSON.stringify(updated));
  };

  if (items.length === 0) return <p className="text-center text-muted-foreground py-4">Nenhuma análise salva</p>;

  return (
    <div className="space-y-2">
      {items.map(item => {
        const st = SCORE_STYLES[item.score] || SCORE_STYLES.ATENCAO;
        return (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground">{item.cliente}</span>
              <span className="text-xs text-muted-foreground ml-2">{item.data} · {PERIODO_LABELS[item.periodo] || item.periodo}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onLoad(item)}>Ver</Button>
            <Button variant="ghost" size="sm" onClick={() => remove(item.id)} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default GestorMetaAds;
