import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  X,
  Building2,
  ChevronDown,
  AlertTriangle,
  Lightbulb,
  ClipboardList,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Brain,
  CheckCircle2,
  Send,
  MessageCircle,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Account {
  id: string;
  name: string;
  customerId: string;
}

interface Alerta {
  campanha: string;
  alerta: string;
  dado: string;
  keywords_afetadas?: string[];
}

interface Oportunidade {
  campanha: string;
  oportunidade: string;
  dado: string;
}

interface Recomendacao {
  prioridade: "alta" | "media" | "baixa";
  campanha: string;
  campanhaId?: string;
  acao: string;
  acaoTipo?: string;
  motivo: string;
  impacto_esperado: string;
  como_executar?: string | null;
  grupo?: string | null;
  grupoId?: string;
  keywords_afetadas?: string[];
  keywordIds?: string[];
  anuncioId?: string;
  parametros?: Record<string, unknown>;
}

interface ExecucaoStatus {
  [index: number]: "idle" | "loading" | "success" | "error";
}

interface ConfirmModal {
  open: boolean;
  recIndex: number | null;
  rec: Recomendacao | null;
  customerId: string;
}

interface Resumo {
  totalCampanhas: number;
  custo7dias: string;
  custo30dias: string;
  conversoes7dias: number;
  conversoes30dias: number;
}

interface RelatorioData {
  resumo: Resumo;
  alertas: Alerta[];
  oportunidades: Oportunidade[];
  recomendacoes: Recomendacao[];
  resumoExecutivo: string;
}

const KeywordChip = ({ keyword, variant = "keyword" }: { keyword: string; variant?: "keyword" | "group" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const styles = variant === "group"
    ? "border-emerald-500/50 bg-emerald-900/30 hover:border-emerald-400 hover:bg-emerald-900/40"
    : "border-yellow-500/40 bg-secondary hover:border-yellow-400 hover:bg-secondary/80";
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono text-foreground transition-all cursor-pointer ${styles}`}
      title="Clique para copiar"
    >
      {copied ? (
        <span className="text-emerald-400">Copiado!</span>
      ) : (
        keyword
      )}
    </button>
  );
};

const ComoExecutarBox = ({ texto }: { texto: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="pt-1">
      <div className="rounded-md border border-muted bg-muted/30 p-2.5 space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">⚙ Como executar:</p>
          <button
            onClick={handleCopy}
            className="text-[10px] px-2 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
          >
            {copied ? "✓ Copiado!" : "Copiar passos"}
          </button>
        </div>
        <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">{texto}</p>
      </div>
    </div>
  );
};

const GestorIA = () => {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsFetched, setAccountsFetched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);

  // Step 2/3 state
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [activeTab, setActiveTab] = useState<"alertas" | "oportunidades" | "recomendacoes">("alertas");
  const [chatOpen, setChatOpen] = useState(false);
  const [resumoExpanded, setResumoExpanded] = useState(false);
  const [execucaoStatus, setExecucaoStatus] = useState<ExecucaoStatus>({});
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ open: false, recIndex: null, rec: null, customerId: "" });

  // Structured context fields
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [conversaoRastreada, setConversaoRastreada] = useState("");
  const [tipoConversao, setTipoConversao] = useState("");
  const [metaCPA, setMetaCPA] = useState("");
  const [ticketMedio, setTicketMedio] = useState("");
  const [taxaFechamento, setTaxaFechamento] = useState("");
  const [margemLucro, setMargemLucro] = useState("");
  const [valorMedioCliente, setValorMedioCliente] = useState("");
  const [ltvEstimado, setLtvEstimado] = useState("");

  const buildContexto = () => {
    const parts: string[] = [];
    if (tipoNegocio) parts.push(`Tipo: ${tipoNegocio}`);
    if (conversaoRastreada) parts.push(`Conversão rastreada: ${conversaoRastreada}`);
    if (tipoConversao) parts.push(`Conversões são: ${tipoConversao}`);
    if (metaCPA) parts.push(`Meta CPA: R$${metaCPA}`);
    if (tipoNegocio === "B2B (venda consultiva)") {
      if (ticketMedio) parts.push(`Ticket médio: R$${ticketMedio}`);
      if (taxaFechamento) parts.push(`Taxa fechamento: ${taxaFechamento}%`);
    } else if (tipoNegocio === "B2C (venda direta)" || tipoNegocio === "E-commerce") {
      if (ticketMedio) parts.push(`Ticket médio: R$${ticketMedio}`);
      if (margemLucro) parts.push(`Margem de lucro: ${margemLucro}%`);
    } else if (tipoNegocio === "Local/Serviço") {
      if (valorMedioCliente) parts.push(`Valor médio por cliente: R$${valorMedioCliente}`);
      if (ltvEstimado) parts.push(`LTV estimado: R$${ltvEstimado}`);
    }
    return parts.join(" | ");
  };

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.customerId.toLowerCase().includes(search.toLowerCase())
      ),
    [accounts, search]
  );

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selectedIds.includes(a.customerId)),
    [accounts, selectedIds]
  );

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(
        "https://principaln8o.gigainteligencia.com.br/webhook/google-ads-accounts"
      );
      if (!res.ok) throw new Error("Erro");
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.accounts)
        ? data.accounts
        : [];
      setAccounts(list);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
      setAccountsFetched(true);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    setStep(2);
    const accountNames: Record<string, string> = {};
    selectedAccounts.forEach((a) => {
      accountNames[a.customerId] = a.name;
    });
    try {
      const res = await fetch(
        "https://appn8o2.gigainteligencia.com.br/webhook/google-ads-gestor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerIds: selectedAccounts.map((a) => a.customerId),
            accountNames,
            ...(buildContexto() ? { contexto: buildContexto() } : {}),
          }),
        }
      );
      if (!res.ok) throw new Error("Erro na análise");
      const rawText = await res.text();
      console.log("[GESTOR-IA] Raw response (text):", rawText);
      console.log("[GESTOR-IA] Response status:", res.status, "Content-Type:", res.headers.get("content-type"));

      // Robust parser — try multiple formats in order
      let data: any = null;
      try {
        // Tentativa 1 e 4: parse do rawText como JSON (pode ser objeto ou string JSON)
        const parsed = JSON.parse(rawText);
        console.log("[GESTOR-IA] Parsed (attempt 1):", typeof parsed, parsed);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // Tentativa 2: parsed.data como objeto
          if (parsed.data && typeof parsed.data === "object") {
            console.log("[GESTOR-IA] Using parsed.data (object)");
            data = parsed.data;
          }
          // Tentativa 3: parsed.data como string JSON
          else if (parsed.data && typeof parsed.data === "string") {
            console.log("[GESTOR-IA] Parsing parsed.data (string)");
            data = JSON.parse(parsed.data);
          }
          // Tentativa 4: usa o próprio objeto parseado
          else {
            console.log("[GESTOR-IA] Using parsed directly");
            data = parsed;
          }
        } else if (typeof parsed === "string") {
          // Tentativa 5: resultado do parse ainda é string — parse duplo
          console.log("[GESTOR-IA] Double-parsing string result");
          data = JSON.parse(parsed);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("[GESTOR-IA] Response is array, using first element");
          data = parsed[0];
        } else {
          data = parsed;
        }
      } catch (parseErr) {
        console.error("[GESTOR-IA] Failed to parse JSON. Raw text was:", JSON.stringify(rawText));
        throw new Error(`Resposta inválida do servidor. Raw: ${rawText.substring(0, 300)}`);
      }
 
      console.log("[GESTOR-IA] Final data to use:", JSON.stringify(data, null, 2));
      console.log("[DEBUG] data completo:", JSON.stringify(data).substring(0, 500));
      console.log("[DEBUG] data.resumo:", data.resumo);
      console.log("[DEBUG] data.campanhas:", data.campanhas?.[0]);

      const resumoData = data.resumo ?? data.analise?.resumo ?? {
        totalCampanhas: 0,
        custo7dias: data.campanhas?.[0]?.['7dias']?.custo ?? "0",
        custo30dias: data.campanhas?.[0]?.['30dias']?.custo ?? "0",
        conversoes7dias: data.campanhas?.[0]?.['7dias']?.conversoes ?? 0,
        conversoes30dias: data.campanhas?.[0]?.['30dias']?.conversoes ?? 0,
      };
      setRelatorio({
        resumo: resumoData,
        alertas: Array.isArray(data.alertas_criticos) ? data.alertas_criticos : [],
        oportunidades: Array.isArray(data.oportunidades) ? data.oportunidades : [],
        recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes : [],
        resumoExecutivo: data.resumo_executivo ?? "",
      });
      setStep(3);
    } catch (err: any) {
      console.error("[GESTOR-IA] Erro na análise:", err);
      setStep(1);
      alert(`Erro ao analisar: ${err?.message || String(err)}`);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedIds([]);
    setRelatorio(null);
    setSearch("");
    setOpenDropdown(false);
    setTipoNegocio("");
    setConversaoRastreada("");
    setTipoConversao("");
    setMetaCPA("");
    setTicketMedio("");
    setTaxaFechamento("");
    setMargemLucro("");
    setValorMedioCliente("");
    setLtvEstimado("");
    setChatMessages([]);
    setChatInput("");
    setActiveTab("alertas");
    setChatOpen(false);
    setResumoExpanded(false);
  };

  const ACAO_MAP: Record<string, string> = {
    "Ajuste de lance por dispositivo (celular/computador/tablet)": "ajuste_lance_dispositivo",
    "Adicionar keyword negativa em campanha": "adicionar_negativa_campanha",
    "Adicionar keyword negativa em grupo": "adicionar_negativa_grupo",
    "Adicionar keyword ativa": "adicionar_keyword",
    "Alterar Target CPA": "alterar_target_cpa",
    "Alterar orçamento": "alterar_orcamento",
    "Pausar grupo de anúncio": "pausar_grupo",
    "Ativar grupo de anúncio": "ativar_grupo",
    "Pausar campanha": "pausar_campanha",
    "Ativar campanha": "ativar_campanha",
    "Pausar keyword": "pausar_keyword",
    "Ativar keyword": "ativar_keyword",
    "Alterar lance de keyword": "alterar_lance_keyword",
    "Pausar anúncio": "pausar_anuncio",
  };

  const DEVICE_MAP: Record<string, string> = {
    celular: "MOBILE",
    computador: "DESKTOP",
    tablet: "TABLET",
  };

  const handleExecutar = async () => {
    const { recIndex, rec, customerId } = confirmModal;
    if (recIndex === null || !rec) return;

    setConfirmModal((prev) => ({ ...prev, open: false }));
    setExecucaoStatus((prev) => ({ ...prev, [recIndex]: "loading" }));

    const mappedAcao = ACAO_MAP[rec.acao] ?? rec.acaoTipo ?? rec.acao;

    let parametros: Record<string, unknown> = rec.parametros ?? {};
    if (mappedAcao === "ajuste_lance_dispositivo" && rec.parametros) {
      const rawDevice = String(rec.parametros.device ?? "").toLowerCase();
      parametros = {
        device: DEVICE_MAP[rawDevice] ?? rec.parametros.device,
        percentual: Number(rec.parametros.percentual ?? 0),
      };
    }

    const body = {
      acao: mappedAcao,
      customerId,
      campanhaId: rec.campanhaId ? String(rec.campanhaId).replace(/\D/g, "") : "",
      campanhaNome: rec.campanha ?? "",
      grupoId: rec.grupoId ? String(rec.grupoId).replace(/\D/g, "") : "",
      grupoNome: rec.grupo ?? "",
      keywordId: rec.keywordIds?.[0] ?? "",
      anuncioId: rec.anuncioId ?? "",
      parametros,
    };

    console.log("[EXECUTAR] Payload:", JSON.stringify(body));

    try {
      const res = await fetch(
        "https://appn8o2.gigainteligencia.com.br/webhook/google-ads-executar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExecucaoStatus((prev) => ({ ...prev, [recIndex]: "success" }));
    } catch (err) {
      console.error("[EXECUTAR] Erro:", err);
      setExecucaoStatus((prev) => ({ ...prev, [recIndex]: "error" }));
    }
  };

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading || !relatorio) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatLoading(true);
    setChatOpen(true);
    try {
      const res = await fetch(
        "https://appn8o2.gigainteligencia.com.br/webhook/google-ads-gestor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            relatorio: JSON.stringify(relatorio),
          }),
        }
      );
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erro: resposta inválida do servidor.\n\nStatus: ${res.status}\nResposta: ${rawText.substring(0, 500)}` },
        ]);
        return;
      }
      if (!res.ok) {
        const errMsg = data.message || data.error || data.detail || JSON.stringify(data);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erro do servidor (${res.status}): ${errMsg}` },
        ]);
        return;
      }
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.resposta ?? "Sem resposta." },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erro de comunicação: ${err?.message || String(err)}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const formatCurrency = (v: number | null | undefined) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const prioridadeBadge = (p: string) => {
    switch (p) {
      case "alta":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Alta</Badge>;
      case "media":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Média</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Baixa</Badge>;
    }
  };

  // Resumo executivo pills generation
  const resumoPills = useMemo(() => {
    if (!relatorio) return [];
    const pills: { icon: string; text: string; color: "green" | "yellow" | "red" | "blue" }[] = [];
    // Tracking
    if (relatorio.resumoExecutivo.toLowerCase().includes("tracking") && relatorio.resumoExecutivo.toLowerCase().includes("correto")) {
      pills.push({ icon: "✅", text: "Tracking OK", color: "green" });
    }
    // CPC pressure
    const cpcMatch = relatorio.resumoExecutivo.match(/CPC[^.]*?(\+?[\d,.]+%)/i);
    if (cpcMatch) {
      pills.push({ icon: "⚠️", text: `Pressão Competitiva CPC ${cpcMatch[1]}`, color: "yellow" });
    }
    // Breakeven
    const beMatch = relatorio.resumoExecutivo.match(/breakeven[^.]*?([\d,.]+)\s*vendas/i);
    if (beMatch) {
      pills.push({ icon: "💰", text: `Breakeven ${beMatch[1]} vendas`, color: "blue" });
    }
    // Campanhas em queda
    const quedaMatch = relatorio.resumoExecutivo.match(/(\d+)\s*campanhas?\s*em\s*queda/i);
    if (quedaMatch) {
      pills.push({ icon: "📉", text: `${quedaMatch[1]} campanhas em queda`, color: "red" });
    }
    // Alertas count
    if (relatorio.alertas.length > 0 && pills.length < 5) {
      pills.push({ icon: "🚨", text: `${relatorio.alertas.length} alertas críticos`, color: "red" });
    }
    return pills;
  }, [relatorio]);

  const pillColorClasses = (color: "green" | "yellow" | "red" | "blue") => {
    switch (color) {
      case "green": return "bg-emerald-900/30 border-emerald-500/40 text-emerald-300";
      case "yellow": return "bg-yellow-900/30 border-yellow-500/40 text-yellow-300";
      case "red": return "bg-red-900/30 border-red-500/40 text-red-300";
      case "blue": return "bg-blue-900/30 border-blue-500/40 text-blue-300";
    }
  };

  // Highlighted resumo text
  const renderResumoText = () => {
    if (!relatorio) return null;
    const allKws = relatorio.recomendacoes.flatMap(r => r.keywords_afetadas ?? []);
    if (allKws.length === 0) return relatorio.resumoExecutivo;
    const escaped = allKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = relatorio.resumoExecutivo.split(regex);
    return parts.map((part, i) =>
      allKws.some(kw => kw.toLowerCase() === part.toLowerCase())
        ? <strong key={i} className="text-foreground font-semibold">{part}</strong>
        : part
    );
  };

  // Tab content renderers
  const renderAlertasContent = () => {
    if (!relatorio) return null;
    return (
      <div className="space-y-4">
        {relatorio.alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta crítico identificado</p>
        ) : (
          relatorio.alertas.map((alerta, i) => (
            <div key={i} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
              <p className="text-sm font-semibold text-foreground">{alerta.campanha}</p>
              <p className="text-sm text-muted-foreground">{alerta.alerta}</p>
              <p className="text-xs text-red-400 font-medium">{alerta.dado}</p>
              {(() => {
                const kws = alerta.keywords_afetadas ??
                  (alerta.alerta.toLowerCase().includes("qs") || alerta.alerta.toLowerCase().includes("quality score")
                    ? relatorio.recomendacoes.find(r => r.campanha === alerta.campanha && r.keywords_afetadas?.length)?.keywords_afetadas
                    : undefined);
                return kws && kws.length > 0 ? (
                  <div className="pt-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Keywords afetadas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kws.map((kw, ki) => (
                        <KeywordChip key={ki} keyword={kw} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderOportunidadesContent = () => {
    if (!relatorio) return null;
    return (
      <div className="space-y-4">
        {relatorio.oportunidades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma oportunidade identificada</p>
        ) : (
          relatorio.oportunidades.map((op, i) => (
            <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
              <p className="text-sm font-semibold text-foreground">{op.campanha}</p>
              <p className="text-sm text-muted-foreground">{op.oportunidade}</p>
              <p className="text-xs text-emerald-400 font-medium">{op.dado}</p>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRecomendacoesContent = () => {
    if (!relatorio) return null;
    const customerId = selectedAccounts[0]?.customerId ?? "";
    return (
      <div className="space-y-4">
        {relatorio.recomendacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma recomendação</p>
        ) : (
          relatorio.recomendacoes.map((rec, i) => {
            const status = execucaoStatus[i] ?? "idle";
            return (
              <div key={i} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {prioridadeBadge(rec.prioridade)}
                    <span className="text-sm font-semibold text-foreground">{rec.campanha}</span>
                  </div>
                  {status === "idle" && (
                    <button
                      onClick={() => setConfirmModal({ open: true, recIndex: i, rec, customerId })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Executar
                    </button>
                  )}
                  {status === "loading" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Executando...
                    </span>
                  )}
                  {status === "success" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      ✅ Executado
                    </span>
                  )}
                  {status === "error" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Falha — faça manualmente
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{rec.acao}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Motivo:</span> {rec.motivo}
                </p>
                <p className="text-xs text-blue-400 font-medium">
                  <span className="text-muted-foreground font-normal">Impacto:</span> {rec.impacto_esperado}
                </p>
                {rec.como_executar && <ComoExecutarBox texto={rec.como_executar} />}
                {rec.grupo && (
                  <div className="pt-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Grupo afetado:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <KeywordChip keyword={rec.grupo} variant="group" />
                    </div>
                  </div>
                )}
                {rec.keywords_afetadas && rec.keywords_afetadas.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Keywords afetadas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.keywords_afetadas.map((kw, ki) => (
                        <KeywordChip key={ki} keyword={kw} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const tabs = [
    { id: "alertas" as const, label: "Alertas Críticos", icon: "⚠️", count: relatorio?.alertas.length ?? 0, color: "text-red-400" },
    { id: "oportunidades" as const, label: "Oportunidades", icon: "💡", count: relatorio?.oportunidades.length ?? 0, color: "text-emerald-400" },
    { id: "recomendacoes" as const, label: "Recomendações", icon: "📋", count: relatorio?.recomendacoes.length ?? 0, color: "text-blue-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-gradient">Gestor</span>{" "}
              <span className="text-foreground">de Tráfego IA</span>
            </h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">
            Análise inteligente das suas campanhas Google Ads
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 — Account Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-2xl p-8 overflow-visible">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Selecione as contas para análise
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Escolha uma ou mais contas Google Ads para o Gestor IA analisar.
                </p>

                {!accountsFetched ? (
                  <div className="flex justify-center py-12">
                    <Button onClick={fetchAccounts} disabled={loadingAccounts} className="gradient-primary text-primary-foreground font-semibold px-6">
                      {loadingAccounts ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Carregando contas...
                        </>
                      ) : (
                        "Carregar contas"
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Multi-select dropdown */}
                    <div className="relative z-30 mb-6">
                      <button
                        onClick={() => setOpenDropdown(!openDropdown)}
                        className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-secondary border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <span className="text-foreground font-medium">
                          {selectedIds.length === 0
                            ? "Selecione contas..."
                            : `${selectedIds.length} conta${selectedIds.length > 1 ? "s" : ""} selecionada${selectedIds.length > 1 ? "s" : ""}`}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ${openDropdown ? "rotate-180" : ""}`}
                        />
                      </button>

                      {openDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input
                              type="text"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Buscar conta..."
                              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                              autoFocus
                            />
                            {search && (
                              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                            <button
                              onClick={() => setSelectedIds(accounts.map((a) => a.customerId))}
                              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              Selecionar Todas
                            </button>
                            <span className="text-border">|</span>
                            <button
                              onClick={() => setSelectedIds([])}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Desmarcar Todas
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {filteredAccounts.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta encontrada</p>
                            ) : (
                              filteredAccounts.map((account) => (
                                <button
                                  key={account.customerId}
                                  onClick={() => toggleAccount(account.customerId)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                                >
                                  <Checkbox
                                    checked={selectedIds.includes(account.customerId)}
                                    className="pointer-events-none"
                                  />
                                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground text-sm">{account.name}</p>
                                    <p className="text-xs text-muted-foreground">{account.customerId}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Selected chips */}
                    <div className="relative z-0">
                      {selectedAccounts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {selectedAccounts.map((a) => (
                            <span
                              key={a.customerId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                            >
                              {a.name}
                              <button onClick={() => toggleAccount(a.customerId)} className="hover:text-primary/70">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                       {/* Structured context form */}
                      <div className="mb-6 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Contexto do cliente</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Tipo de negócio */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                              Tipo de negócio <span className="text-red-400">*</span>
                            </label>
                            <select
                              value={tipoNegocio}
                              onChange={(e) => {
                                setTipoNegocio(e.target.value);
                                setTicketMedio("");
                                setTaxaFechamento("");
                                setMargemLucro("");
                                setValorMedioCliente("");
                                setLtvEstimado("");
                              }}
                              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Selecione...</option>
                              <option value="B2B (venda consultiva)">B2B (venda consultiva)</option>
                              <option value="B2C (venda direta)">B2C (venda direta)</option>
                              <option value="E-commerce">E-commerce</option>
                              <option value="Local/Serviço">Local/Serviço</option>
                            </select>
                          </div>

                          {/* Conversão rastreada */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                              O que você rastreia como conversão? <span className="text-red-400">*</span>
                            </label>
                            <select
                              value={conversaoRastreada}
                              onChange={(e) => setConversaoRastreada(e.target.value)}
                              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Selecione...</option>
                              <option value="Clique no WhatsApp">Clique no WhatsApp</option>
                              <option value="Envio de formulário">Envio de formulário</option>
                              <option value="Ligação telefônica">Ligação telefônica</option>
                              <option value="Compra online">Compra online</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>

                          {/* Suas conversões são */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                              Suas conversões são: <span className="text-red-400">*</span>
                            </label>
                            <select
                              value={tipoConversao}
                              onChange={(e) => setTipoConversao(e.target.value)}
                              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Selecione...</option>
                              <option value="Lead - Formulário preenchido">Lead - Formulário preenchido</option>
                              <option value="Lead - Clique no WhatsApp">Lead - Clique no WhatsApp</option>
                              <option value="Lead - Ligação telefônica">Lead - Ligação telefônica</option>
                              <option value="Venda - Compra online confirmada">Venda - Compra online confirmada</option>
                              <option value="Venda - Contrato assinado">Venda - Contrato assinado</option>
                              <option value="Local - Visita à loja">Local - Visita à loja</option>
                              <option value="Local - Ligação para agendamento">Local - Ligação para agendamento</option>
                            </select>
                            {tipoConversao && (tipoConversao.startsWith("Lead") || tipoConversao.startsWith("Local")) && (
                              <p className="mt-1.5 text-xs text-yellow-400">
                                ⚠️ Conversões de contato não representam receita confirmada. O sistema calculará custo por lead vs meta de CPA.
                              </p>
                            )}
                            {tipoConversao && tipoConversao.startsWith("Venda") && (
                              <p className="mt-1.5 text-xs text-emerald-400">
                                ✅ Conversões de venda permitem cálculo de ROI/ROAS real.
                              </p>
                            )}
                          </div>

                          {/* Meta CPA */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                              Meta de CPA (R$) <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="number"
                              value={metaCPA}
                              onChange={(e) => setMetaCPA(e.target.value)}
                              placeholder="Ex: 300"
                              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>

                        {/* Conditional fields */}
                        {tipoNegocio === "B2B (venda consultiva)" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ticket médio (R$)</label>
                              <input
                                type="number"
                                value={ticketMedio}
                                onChange={(e) => setTicketMedio(e.target.value)}
                                placeholder="Ex: 75000"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Taxa de fechamento estimada (%)</label>
                              <input
                                type="number"
                                value={taxaFechamento}
                                onChange={(e) => setTaxaFechamento(e.target.value)}
                                placeholder="Ex: 10"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                          </motion.div>
                        )}

                        {(tipoNegocio === "B2C (venda direta)" || tipoNegocio === "E-commerce") && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ticket médio (R$)</label>
                              <input
                                type="number"
                                value={ticketMedio}
                                onChange={(e) => setTicketMedio(e.target.value)}
                                placeholder="Ex: 150"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Margem de lucro (%)</label>
                              <input
                                type="number"
                                value={margemLucro}
                                onChange={(e) => setMargemLucro(e.target.value)}
                                placeholder="Ex: 30"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                          </motion.div>
                        )}

                        {tipoNegocio === "Local/Serviço" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Valor médio por cliente (R$)</label>
                              <input
                                type="number"
                                value={valorMedioCliente}
                                onChange={(e) => setValorMedioCliente(e.target.value)}
                                placeholder="Ex: 500"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">LTV estimado (R$)</label>
                              <input
                                type="number"
                                value={ltvEstimado}
                                onChange={(e) => setLtvEstimado(e.target.value)}
                                placeholder="Ex: 3000"
                                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      <Button
                        onClick={handleAnalyze}
                        disabled={selectedIds.length === 0 || !tipoNegocio || !conversaoRastreada || !tipoConversao || !metaCPA}
                        className="gradient-primary text-primary-foreground font-semibold px-8 glow-primary"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Analisar com IA
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Loading */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-32 space-y-6"
            >
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center glow-primary-strong animate-pulse">
                <Brain className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Gestor IA analisando suas campanhas...
                </h2>
                <p className="text-muted-foreground">
                  Isso pode levar alguns segundos
                </p>
              </div>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </motion.div>
          )}

          {/* STEP 3 — Report */}
          {step === 3 && relatorio && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Metric cards with trend */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(() => {
                  const custo7 = parseFloat(relatorio.resumo.custo7dias ?? "0");
                  const custo30 = parseFloat(relatorio.resumo.custo30dias ?? "0");
                  const conv7 = relatorio.resumo.conversoes7dias ?? 0;
                  const conv30 = relatorio.resumo.conversoes30dias ?? 0;
                  const cpa = conv7 > 0 ? custo7 / conv7 : 0;
                  return [
                    { label: "Investido 7d", value: formatCurrency(custo7), icon: DollarSign },
                    { label: "Investido 30d", value: formatCurrency(custo30), icon: DollarSign },
                    { label: "Conversões 7d", value: conv7.toString(), icon: Target },
                    { label: "Conversões 30d", value: conv30.toString(), icon: Target },
                    { label: "CPA Médio", value: formatCurrency(cpa), icon: TrendingUp },
                  ];
                })().map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{card.label}</span>
                      </div>
                      <p className="text-base font-bold text-foreground">{card.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Resumo Executivo — pills + expandable */}
              {relatorio.resumoExecutivo && (
                <div className="glass-card rounded-2xl p-5 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h3 className="text-base font-bold text-foreground">Resumo Executivo</h3>
                    </div>
                  </div>
                  {/* Pills */}
                  {resumoPills.length > 0 && (
                    <div className="flex flex-wrap gap-[8px] mb-3">
                      {resumoPills.map((pill, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 ${pillColorClasses(pill.color)}`}
                        >
                          <span>{pill.icon}</span>
                          {pill.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Expandable text */}
                  <AnimatePresence>
                    {resumoExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-2 border-t border-border">
                          {renderResumoText()}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setResumoExpanded(!resumoExpanded)}
                    className="mt-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    {resumoExpanded ? (
                      <>Ocultar análise <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Ver análise completa <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </div>
              )}

              {/* Horizontal tabs */}
              <div className="space-y-0">
                <div className="flex border-b border-border">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? `${tab.color}`
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 h-5 ${
                          activeTab === tab.id
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {tab.count}
                      </Badge>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="pt-5 max-h-[60vh] overflow-y-auto pr-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {activeTab === "alertas" && renderAlertasContent()}
                      {activeTab === "oportunidades" && renderOportunidadesContent()}
                      {activeTab === "recomendacoes" && renderRecomendacoesContent()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Collapsible Chat */}
              <div className="glass-card rounded-2xl border-border overflow-hidden">
                {!chatOpen ? (
                  <div className="flex items-center justify-between p-4 h-[60px]">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      <h3 className="text-base font-bold text-foreground">Chat com Gestor IA</h3>
                    </div>
                    <Button
                      onClick={() => setChatOpen(true)}
                      size="sm"
                      className="gradient-primary text-primary-foreground font-semibold px-4"
                    >
                      Perguntar
                    </Button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ height: 60 }}
                    animate={{ height: "auto" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <h3 className="text-base font-bold text-foreground">Chat com Gestor IA</h3>
                      </div>
                      <button
                        onClick={() => setChatOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-4 pb-4 space-y-3">
                      <div className="h-56 overflow-y-auto space-y-3 rounded-xl bg-secondary/50 p-4">
                        {chatMessages.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Faça perguntas sobre o relatório gerado
                          </p>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-line ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border border-border text-foreground"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Pensando...
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                          placeholder="Pergunte algo sobre o relatório..."
                          className="flex-1 h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
                          disabled={chatLoading}
                        />
                        <Button
                          onClick={handleChatSend}
                          disabled={!chatInput.trim() || chatLoading}
                          size="icon"
                          className="gradient-primary text-primary-foreground shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Nova Análise */}
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  onClick={handleReset}
                  className="gradient-primary text-primary-foreground font-semibold px-8 glow-primary"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nova Análise
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Execution Modal */}
      {confirmModal.open && confirmModal.rec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmModal((p) => ({ ...p, open: false }))}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Confirmar execução</h3>
                <p className="text-sm text-muted-foreground">Revise os detalhes antes de confirmar</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Campanha:</span>
                <span className="text-foreground font-medium">{confirmModal.rec.campanha}</span>
              </div>
              {confirmModal.rec.grupo && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Grupo:</span>
                  <span className="text-foreground font-medium">{confirmModal.rec.grupo}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Ação:</span>
                <span className="text-foreground font-medium">{confirmModal.rec.acaoTipo ?? confirmModal.rec.acao}</span>
              </div>
              {confirmModal.rec.keywords_afetadas && confirmModal.rec.keywords_afetadas.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Keywords:</span>
                  <span className="text-foreground">{confirmModal.rec.keywords_afetadas.slice(0, 3).join(", ")}{confirmModal.rec.keywords_afetadas.length > 3 ? ` +${confirmModal.rec.keywords_afetadas.length - 3}` : ""}</span>
                </div>
              )}
              {confirmModal.rec.parametros && Object.keys(confirmModal.rec.parametros).length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Parâmetros:</span>
                  <span className="text-foreground font-mono text-xs">{JSON.stringify(confirmModal.rec.parametros)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Conta:</span>
                <span className="text-foreground font-mono text-xs">{confirmModal.customerId}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Esta ação será executada diretamente na conta Google Ads via API. Verifique os detalhes antes de confirmar.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmModal((p) => ({ ...p, open: false }))}
                className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecutar}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Confirmar e Executar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GestorIA;
