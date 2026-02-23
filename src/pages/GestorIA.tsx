// GestorIA v2.9.1 - fix parseSteps numeração duplicada
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
  ListTodo,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  causa_provavel?: string;
  como_executar?: string;
  termos_negativar?: string[];
  keywords_adicionar?: string[];
  adGroupId?: string;
}

interface Oportunidade {
  campanha: string;
  oportunidade: string;
  dado: string;
  grupo?: string | null;
  potencial_estimado?: string;
  causa_provavel?: string;
  como_executar?: string;
  termos_negativar?: string[];
  keywords_adicionar?: string[];
  adGroupId?: string;
}

interface Recomendacao {
  prioridade: "alta" | "media" | "baixa";
  campanha: string;
  acao: string;
  motivo: string;
  impacto_esperado: string;
  como_executar?: string | null;
  grupo?: string | null;
  termos_negativar?: string[];
  keywords_adicionar?: string[];
  adGroupId?: string;
}

interface Resumo {
  totalCampanhas: number;
  custo7dias: string;
  custo30dias: string;
  conversoes7dias: number;
  conversoes30dias: number;
}

interface AdGroup {
  id: string;
  nome: string;
  campanha: string;
}

interface ResumoExecutivo {
  visao_geral?: string;
  problema_principal?: string;
  destaques?: string;
  oportunidade_principal?: string;
}

interface RelatorioData {
  resumo: Resumo;
  alertas: Alerta[];
  oportunidades: Oportunidade[];
  recomendacoes: Recomendacao[];
  resumoExecutivo: ResumoExecutivo;
  resumoExecutivoTexto: string;
  adGroups: AdGroup[];
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

/** Parse como_executar text into individual steps.
 *  Handles "1) ... 2) ..." and "1. ... 2. ..." inline or newline-separated. */
const parseSteps = (texto: string): string[] => {
  // Split on patterns like "1)" "2." "1-" at word boundaries, keeping content
  const parts = texto.split(/(?:^|\n)\s*\d+[\.\)\-]\s*|(?<=\S)\s+\d+[\.\)\-]\s+/);
  const steps = parts.map((s) => s.replace(/^\d+[\.\)\-]\s*/, "").trim()).filter(Boolean);
  if (steps.length > 1) return steps;
  // Fallback: split by newlines
  return texto.split(/\n/).map((s) => s.replace(/^\d+[\.\)\-]\s*/, "").trim()).filter(Boolean);
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
        <ol className="space-y-1 pl-0">
          {parseSteps(texto).map((step, si) => (
            <li key={si} className="text-xs text-foreground/90 flex gap-2 leading-relaxed">
              <span className="text-muted-foreground font-medium shrink-0">{si + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const SESSION_KEY = "gestorIA_session";

const loadSession = (): { step: number; relatorio: RelatorioData | null; selectedIds: string[]; activeTab: "alertas" | "oportunidades" | "recomendacoes"; accountNamesMap?: Record<string, string> } | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const GestorIA = () => {
  const savedSession = loadSession();

  const [step, setStep] = useState(savedSession?.step ?? 1);

  // Step 1 state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsFetched, setAccountsFetched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(savedSession?.selectedIds ?? []);
  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);

  // Step 2/3 state
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(savedSession?.relatorio ?? null);
  const [activeTab, setActiveTab] = useState<"alertas" | "oportunidades" | "recomendacoes">(savedSession?.activeTab ?? "alertas");
  const [chatOpen, setChatOpen] = useState(false);
  const [resumoExpanded, setResumoExpanded] = useState(false);

  const [selectedTermos, setSelectedTermos] = useState<Record<number, Set<string>>>({});
  const [negativados, setNegativados] = useState<Record<number, Set<string>>>(() => {
    try {
      const raw = sessionStorage.getItem("gestorIA_negativados");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const result: Record<number, Set<string>> = {};
      for (const [k, v] of Object.entries(parsed)) {
        result[Number(k)] = new Set(v as string[]);
      }
      return result;
    } catch { return {}; }
  });
  const [negativarLoading, setNegativarLoading] = useState<number | null>(null);
  const [negativarSuccess, setNegativarSuccess] = useState<{ index: number; count: number } | null>(null);
  const [negativarError, setNegativarError] = useState<{ index: number; msg: string } | null>(null);
  const [expandedAlertas, setExpandedAlertas] = useState<Set<number>>(new Set());

  // ClickUp modal state
  const [clickupModal, setClickupModal] = useState<{ open: boolean; rec: Recomendacao | null }>({ open: false, rec: null });
  const [clickupObs, setClickupObs] = useState("");
  const [clickupAssignee, setClickupAssignee] = useState("");
  const [clickupDueDate, setClickupDueDate] = useState<Date | undefined>(undefined);
  const [clickupPriority, setClickupPriority] = useState("");
  const [clickupCalendarOpen, setClickupCalendarOpen] = useState(false);
  const [clickupLoading, setClickupLoading] = useState(false);
  const [clickupSuccess, setClickupSuccess] = useState(false);
  const [clickupListas, setClickupListas] = useState<{ id: string; name: string }[]>([]);
  const [clickupListasLoading, setClickupListasLoading] = useState(false);
  const [clickupListId, setClickupListId] = useState("");

  const fetchClickupListas = async () => {
    setClickupListasLoading(true);
    try {
      const res = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/gestor-clickup-listas");
      const data = await res.json();
      const listas = Array.isArray(data?.listas) ? data.listas : Array.isArray(data) ? data : [];
      setClickupListas(listas);
    } catch {
      setClickupListas([]);
    } finally {
      setClickupListasLoading(false);
    }
  };

  const handleCreateClickupTask = async () => {
    if (!clickupModal.rec) return;
    setClickupLoading(true);
    // Fallback to saved session names when accounts list isn't loaded (e.g. after tab switch)
    const savedNamesMap = savedSession?.accountNamesMap ?? {};
    const accountName = selectedAccounts.length > 0
      ? selectedAccounts.map((a) => a.name).join(", ")
      : selectedIds.map((id) => savedNamesMap[id] ?? id).join(", ");
    const rec = clickupModal.rec;
    const resetModal = () => {
      setClickupModal({ open: false, rec: null });
      setClickupObs("");
      setClickupAssignee("");
      setClickupDueDate(undefined);
      setClickupPriority("");
      setClickupListId("");
    };
    try {
      await fetch("https://appn8o2.gigainteligencia.com.br/webhook/gestor-clickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName,
          campanha: rec.campanha,
          grupo: rec.grupo,
          acao: rec.acao,
          motivo: rec.motivo,
          impacto_esperado: rec.impacto_esperado,
          como_executar: rec.como_executar,
          termos_negativar: rec.termos_negativar,
          keywords_adicionar: rec.keywords_adicionar,
          observacao: clickupObs,
          assignee: clickupAssignee || undefined,
          due_date: clickupDueDate ? format(clickupDueDate, "yyyy-MM-dd") : undefined,
          priority: clickupPriority || undefined,
          listId: clickupListId || undefined,
        }),
      });
      setClickupSuccess(true);
      resetModal();
      setTimeout(() => setClickupSuccess(false), 3000);
    } catch {
      resetModal();
    } finally {
      setClickupLoading(false);
    }
  };

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
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill context from Google Sheets when a single account is selected
  useEffect(() => {
    if (selectedIds.length !== 1) {
      setAutoFilled(false);
      return;
    }
    const cid = selectedIds[0];
    setTipoNegocio(""); setConversaoRastreada(""); setTipoConversao(""); setMetaCPA("");
    setTicketMedio(""); setTaxaFechamento(""); setMargemLucro(""); setValorMedioCliente(""); setLtvEstimado("");
    fetch(`https://appn8o2.gigainteligencia.com.br/webhook/gestor-contexto-buscar?customerId=${cid}`)
      .then(r => r.json())
      .then(data => {
        if (data.encontrado && data.tipoNegocio) {
          setTipoNegocio(data.tipoNegocio);
          setConversaoRastreada(data.conversaoRastreada || "");
          setTipoConversao(data.tipoConversao || "");
          setMetaCPA(data.metaCPA || "");
          setTicketMedio(data.ticketMedio || "");
          setTaxaFechamento(data.taxaFechamento || "");
          setMargemLucro(data.margemLucro || "");
          setValorMedioCliente(data.valorMedioCliente || "");
          setLtvEstimado(data.ltvEstimado || "");
          setAutoFilled(true);
          setTimeout(() => setAutoFilled(false), 4000);
        }
      })
      .catch(() => {});
  }, [selectedIds]);

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
  const chatInputRef = useRef<HTMLInputElement>(null);

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
    // Save context to Google Sheets before analyzing
    if (selectedIds.length === 1) {
      fetch("https://appn8o2.gigainteligencia.com.br/webhook/gestor-contexto-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedIds[0],
          tipoNegocio, conversaoRastreada, tipoConversao, metaCPA,
          ticketMedio, taxaFechamento, margemLucro, valorMedioCliente, ltvEstimado
        })
      }).catch(() => {});
    }
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

      // Ler métricas direto da raiz do objeto (API não retorna campo resumo)
      console.log("[GESTOR-IA][RESUMO] Chaves raiz do data:", Object.keys(data));
      console.log("[GESTOR-IA][RESUMO] custo7dias →", data.custo7dias);
      console.log("[GESTOR-IA][RESUMO] custo30dias →", data.custo30dias);
      console.log("[GESTOR-IA][RESUMO] conversoes7dias →", data.conversoes7dias);
      console.log("[GESTOR-IA][RESUMO] conversoes30dias →", data.conversoes30dias);

      // pick: busca na raiz do data, com fallback em data.resumo (legado)
      const rawResumo = typeof data.resumo === "object" && data.resumo !== null ? data.resumo : {};
      const pick = (...keys: string[]): any => {
        for (const k of keys) {
          const v = data[k] ?? rawResumo[k];
          if (v !== undefined && v !== null && v !== "") return v;
        }
        return undefined;
      };
      const custo7Raw = pick(
        "custo7dias", "custo_7dias", "investido_7d", "investido7d",
        "custo_7d", "spend_7d", "cost_7d", "gasto_7d"
      ) ?? data.campanhas?.[0]?.['7dias']?.custo ?? "0";
      const custo30Raw = pick(
        "custo30dias", "custo_30dias", "investido_30d", "investido30d",
        "custo_30d", "spend_30d", "cost_30d", "gasto_30d"
      ) ?? data.campanhas?.[0]?.['30dias']?.custo ?? "0";
      const conv7Raw = pick(
        "conversoes7dias", "conversoes_7dias", "conversoes_7d", "conversions_7d",
        "conv_7d", "conversoes7d"
      ) ?? data.campanhas?.[0]?.['7dias']?.conversoes ?? 0;
      const conv30Raw = pick(
        "conversoes30dias", "conversoes_30dias", "conversoes_30d", "conversions_30d",
        "conv_30d", "conversoes30d"
      ) ?? data.campanhas?.[0]?.['30dias']?.conversoes ?? 0;

      console.log("[GESTOR-IA] Resumo mapeado:", { custo7Raw, custo30Raw, conv7Raw, conv30Raw });

      const resumoData: Resumo = {
        totalCampanhas: pick("totalCampanhas", "total_campanhas", "totalCampaigns") ?? rawResumo.totalCampanhas ?? 0,
        custo7dias: String(custo7Raw),
        custo30dias: String(custo30Raw),
        conversoes7dias: Number(conv7Raw) || 0,
        conversoes30dias: Number(conv30Raw) || 0,
      };
      const rawExec = data.resumo_executivo;
      const execObj: ResumoExecutivo = typeof rawExec === "object" && rawExec !== null
        ? rawExec
        : {};
      const execTexto = typeof rawExec === "string"
        ? rawExec
        : [execObj.visao_geral, execObj.problema_principal, execObj.destaques, execObj.oportunidade_principal].filter(Boolean).join("\n\n");
      setRelatorio({
        resumo: resumoData,
        alertas: Array.isArray(data.alertas_criticos) ? data.alertas_criticos : [],
        oportunidades: Array.isArray(data.oportunidades) ? data.oportunidades : [],
        recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes : [],
        resumoExecutivo: execObj,
        resumoExecutivoTexto: execTexto,
        adGroups: Array.isArray(data.adGroups) ? data.adGroups : [],
      });
      setStep(3);
    } catch (err: any) {
      console.error("[GESTOR-IA] Erro na análise:", err);
      setStep(1);
      alert(`Erro ao analisar: ${err?.message || String(err)}`);
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY);
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
    setNegativados({});
    sessionStorage.removeItem("gestorIA_negativados");
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

  const handleNegativar = async (recIndex: number, rec: Recomendacao) => {
    const termos: string[] = Array.from(selectedTermos[recIndex] ?? new Set<string>());
    if (termos.length === 0) return;

    const adGroupId = rec.adGroupId;
    if (!adGroupId) {
      const msg = `adGroupId não encontrado nesta recomendação ("${rec.grupo}" / "${rec.campanha}")`;
      console.error("[NEGATIVAR]", msg);
      setNegativarError({ index: recIndex, msg });
      setTimeout(() => setNegativarError(null), 5000);
      return;
    }

    const customerId = selectedIds[0]?.replace(/-/g, "");
    const payload = { customerId, adGroupId, termos };
    console.log("[NEGATIVAR] Payload enviado:", JSON.stringify(payload, null, 2));

    setNegativarLoading(recIndex);
    try {
      const res = await fetch(
        "https://appn8o2.gigainteligencia.com.br/webhook/gestor-negativar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        const msg = `HTTP ${res.status}: ${errText}`;
        console.error("[NEGATIVAR] Erro HTTP:", msg);
        setNegativarError({ index: recIndex, msg });
        setTimeout(() => setNegativarError(null), 5000);
        return;
      }

      const data = await res.json();
      console.log("[NEGATIVAR] Resposta:", JSON.stringify(data, null, 2));

      if (data.sucesso) {
        setNegativados((prev) => {
          const existing = new Set(prev[recIndex] ?? []);
          termos.forEach((t) => existing.add(t));
          const next = { ...prev, [recIndex]: existing };
          const serializable: Record<string, string[]> = {};
          for (const k of Object.keys(next)) {
            serializable[k] = Array.from(next[Number(k)]);
          }
          sessionStorage.setItem("gestorIA_negativados", JSON.stringify(serializable));
          return next;
        });
        setNegativarSuccess({ index: recIndex, count: termos.length });
        setSelectedTermos((prev) => ({ ...prev, [recIndex]: new Set() }));
        setTimeout(() => setNegativarSuccess(null), 4000);
      } else {
        const msg = `Resposta sem sucesso: ${JSON.stringify(data)}`;
        console.warn("[NEGATIVAR]", msg);
        setNegativarError({ index: recIndex, msg });
        setTimeout(() => setNegativarError(null), 5000);
      }
    } catch (err: any) {
      const msg = `Erro de rede: ${err?.message || String(err)}`;
      console.error("[NEGATIVAR]", msg);
      setNegativarError({ index: recIndex, msg });
      setTimeout(() => setNegativarError(null), 5000);
    } finally {
      setNegativarLoading(null);
    }
  };

  const toggleTermo = (recIndex: number, termo: string) => {
    setSelectedTermos((prev) => {
      const set = new Set(prev[recIndex] ?? []);
      if (set.has(termo)) set.delete(termo);
      else set.add(termo);
      return { ...prev, [recIndex]: set };
    });
  };

  // Persist analysis state to sessionStorage
  useEffect(() => {
    if (step >= 2 && relatorio) {
      try {
        const accountNamesMap: Record<string, string> = {};
        selectedAccounts.forEach((a) => { accountNamesMap[a.customerId] = a.name; });
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, relatorio, selectedIds, activeTab, accountNamesMap }));
      } catch {}
    }
  }, [step, relatorio, selectedIds, activeTab]);

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

  // Resumo executivo: read structured fields directly
  const resumoCards = useMemo(() => {
    if (!relatorio) return null;
    const exec = relatorio.resumoExecutivo;
    const hasAny = exec.visao_geral || exec.problema_principal || exec.destaques || exec.oportunidade_principal;
    if (!hasAny) return null;
    return {
      visaoGeral: exec.visao_geral || "",
      problema: exec.problema_principal || "",
      destaques: exec.destaques || "",
      oportunidade: exec.oportunidade_principal || "",
      fullText: relatorio.resumoExecutivoTexto,
    };
  }, [relatorio]);

  // Tab content renderers
  const toggleAlertaExpand = (index: number) => {
    setExpandedAlertas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Helper to handle negation for alertas (reuses same logic as recomendacoes, offset index to avoid collision)
  const alertaRecIndex = (alertaIndex: number) => 10000 + alertaIndex;

  const handleNegativarAlerta = async (alertaIndex: number, alerta: Alerta) => {
    const idx = alertaRecIndex(alertaIndex);
    const termos: string[] = Array.from(selectedTermos[idx] ?? new Set<string>());
    if (termos.length === 0) return;
    const adGroupId = alerta.adGroupId;
    if (!adGroupId) {
      const msg = `adGroupId não encontrado neste alerta ("${alerta.campanha}")`;
      setNegativarError({ index: idx, msg });
      setTimeout(() => setNegativarError(null), 5000);
      return;
    }
    const customerId = selectedIds[0]?.replace(/-/g, "");
    const payload = { customerId, adGroupId, termos };
    setNegativarLoading(idx);
    try {
      const res = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/gestor-negativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        setNegativarError({ index: idx, msg: `HTTP ${res.status}: ${errText}` });
        setTimeout(() => setNegativarError(null), 5000);
        return;
      }
      const data = await res.json();
      if (data.sucesso) {
        setNegativados((prev) => {
          const existing = new Set(prev[idx] ?? []);
          termos.forEach((t) => existing.add(t));
          const next = { ...prev, [idx]: existing };
          const serializable: Record<string, string[]> = {};
          for (const k of Object.keys(next)) serializable[k] = Array.from(next[Number(k)]);
          sessionStorage.setItem("gestorIA_negativados", JSON.stringify(serializable));
          return next;
        });
        setNegativarSuccess({ index: idx, count: termos.length });
        setSelectedTermos((prev) => ({ ...prev, [idx]: new Set() }));
        setTimeout(() => setNegativarSuccess(null), 4000);
      } else {
        setNegativarError({ index: idx, msg: `Resposta sem sucesso: ${JSON.stringify(data)}` });
        setTimeout(() => setNegativarError(null), 5000);
      }
    } catch (err: any) {
      setNegativarError({ index: idx, msg: `Erro de rede: ${err?.message || String(err)}` });
      setTimeout(() => setNegativarError(null), 5000);
    } finally {
      setNegativarLoading(null);
    }
  };

  const renderAlertasContent = () => {
    if (!relatorio) return null;
    return (
      <div className="space-y-4">
        {relatorio.alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta crítico identificado</p>
        ) : (
          relatorio.alertas.map((alerta, i) => {
            if (!alerta) return null;
            const isExpanded = expandedAlertas.has(i);
            const hasDetails = alerta.dado || alerta.causa_provavel || alerta.como_executar || (alerta.termos_negativar && alerta.termos_negativar.length > 0) || (alerta.keywords_adicionar && alerta.keywords_adicionar.length > 0);
            const idx = alertaRecIndex(i);
            // Lookup por rec_index injetado pelo backend (exato), fallback por campanha+grupo
            const recIdx = (alerta as any).rec_index;
            const matchingRec = recIdx !== undefined
              ? (relatorio.recomendacoes[recIdx] ?? undefined)
              : (relatorio.recomendacoes.find((r) => r.campanha === alerta.campanha && (r.grupo ?? null) === ((alerta as any).grupo ?? null)))
                ?? relatorio.recomendacoes.find((r) => r.campanha === alerta.campanha);
            const matchingRecIndex = matchingRec ? relatorio.recomendacoes.indexOf(matchingRec) : -1;
            return (
              <div key={i} className="rounded-xl bg-red-500/5 border border-red-500/10 overflow-hidden">
                <button
                  onClick={() => toggleAlertaExpand(i)}
                  className="w-full p-4 text-left space-y-2 hover:bg-red-500/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{alerta.campanha}</p>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{alerta.alerta}</p>
                </button>
                <AnimatePresence>
                  {isExpanded && hasDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-red-500/10 pt-3">
                        {/* Impacto estimado */}
                        {alerta.dado && (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Impacto estimado</p>
                            <p className="text-base font-semibold text-orange-400">{alerta.dado}</p>
                          </div>
                        )}
                        {/* Causa */}
                        {alerta.causa_provavel && (
                          <p className="text-sm text-foreground/80">{alerta.causa_provavel}</p>
                        )}
                        {/* Como resolver — steps numerados */}
                        {alerta.como_executar && (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Como resolver</p>
                            <ol className="space-y-1 pl-0">
                              {parseSteps(alerta.como_executar).map((step, li) => (
                                <li key={li} className="text-xs text-foreground/85 flex gap-2">
                                  <span className="text-muted-foreground font-medium shrink-0">{li + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {/* Termos a negativar */}
                        {alerta.termos_negativar && alerta.termos_negativar.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Termos a negativar</p>
                            <div className="flex flex-wrap gap-1.5">
                              {alerta.termos_negativar.map((kw, ki) => {
                                const isNegativado = negativados[idx]?.has(kw) ?? false;
                                const isSelected = !isNegativado && (selectedTermos[idx]?.has(kw) ?? false);
                                return (
                                  <button
                                    key={ki}
                                    onClick={() => !isNegativado && toggleTermo(idx, kw)}
                                    disabled={isNegativado}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono transition-all ${
                                      isNegativado
                                        ? "border-muted/50 bg-muted/20 text-muted-foreground/50 cursor-default line-through"
                                        : isSelected
                                        ? "border-red-500/70 bg-red-900/40 text-red-300 cursor-pointer"
                                        : "border-yellow-500/40 bg-secondary hover:border-yellow-400 hover:bg-secondary/80 text-foreground cursor-pointer"
                                    }`}
                                  >
                                    {isNegativado ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : (
                                      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? "border-red-400 bg-red-500/30" : "border-muted-foreground/40"}`}>
                                        {isSelected && <span className="text-[8px] text-red-300">✓</span>}
                                      </span>
                                    )}
                                    {kw}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 italic">Selecione os termos que deseja negativar</p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleNegativarAlerta(i, alerta)}
                                disabled={negativarLoading === idx || (selectedTermos[idx]?.size ?? 0) === 0}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                  (selectedTermos[idx]?.size ?? 0) > 0
                                    ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60"
                                    : "border-border bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                {negativarLoading === idx ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" /> Negativando...</>
                                ) : (selectedTermos[idx]?.size ?? 0) > 0 ? (
                                  <><X className="w-3 h-3" /> Negativar {selectedTermos[idx]?.size} selecionado{(selectedTermos[idx]?.size ?? 0) > 1 ? "s" : ""}</>
                                ) : (
                                  <><X className="w-3 h-3" /> Negativar selecionados</>
                                )}
                              </button>
                              {negativarSuccess?.index === idx && (
                                <span className="text-xs text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {negativarSuccess.count} termo{negativarSuccess.count > 1 ? "s" : ""} negativado{negativarSuccess.count > 1 ? "s" : ""} com sucesso
                                </span>
                              )}
                              {negativarError?.index === idx && (
                                <span className="text-xs text-red-400 flex items-center gap-1 max-w-md break-all">
                                  <AlertTriangle className="w-3 h-3 shrink-0" /> {negativarError.msg}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Keywords a adicionar */}
                        {alerta.keywords_adicionar && alerta.keywords_adicionar.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Keywords a adicionar</p>
                              <button
                                onClick={() => navigator.clipboard.writeText(alerta.keywords_adicionar!.join('\n'))}
                                className="text-xs text-primary hover:underline"
                              >
                                Copiar
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {alerta.keywords_adicionar.map((kw, ki) => (
                                <KeywordChip key={ki} keyword={kw} variant="group" />
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Ação recomendada — link para recomendação correspondente */}
                        {matchingRec && (
                          <div className="mt-1 space-y-2">
                            <button
                              onClick={() => { setActiveTab("recomendacoes"); }}
                              className="w-full px-3 py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors text-left"
                            >
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Ação recomendada</p>
                              <p className="text-sm text-blue-400 font-medium">{matchingRec?.acao}</p>
                            </button>
                            {/* Keywords afetadas por Quality Score */}
                            {matchingRec.acao && /quality\s*score/i.test(matchingRec.acao) && matchingRec.como_executar && (() => {
                              const lines = matchingRec.como_executar!.split(/\n/).filter(l => l.trim());
                              const kwLines = lines.filter(l => /—\s*QS\s*\d/i.test(l) || /quality\s*score\s*\d/i.test(l) || /\bQS\s*\d/i.test(l));
                              if (kwLines.length === 0) return null;
                              return (
                                <div className="px-3 py-2 rounded-lg border border-blue-500/10 bg-blue-500/5">
                                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Keywords afetadas</p>
                                  <ul className="space-y-0.5">
                                    {kwLines.map((line, li) => (
                                      <li key={li} className="text-xs text-foreground/85">{line.replace(/^\d+[\.\)]\s*/, '').trim()}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const [expandedOportunidades, setExpandedOportunidades] = useState<Set<number>>(new Set());
  const toggleOportunidadeExpand = (index: number) => {
    setExpandedOportunidades((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const opRecIndex = (opIndex: number) => 20000 + opIndex;

  const handleNegativarOportunidade = async (opIndex: number, op: Oportunidade) => {
    const idx = opRecIndex(opIndex);
    const termos: string[] = Array.from(selectedTermos[idx] ?? new Set<string>());
    if (termos.length === 0) return;
    const adGroupId = op.adGroupId;
    if (!adGroupId) {
      setNegativarError({ index: idx, msg: `adGroupId não encontrado nesta oportunidade ("${op.campanha}")` });
      setTimeout(() => setNegativarError(null), 5000);
      return;
    }
    const customerId = selectedIds[0]?.replace(/-/g, "");
    setNegativarLoading(idx);
    try {
      const res = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/gestor-negativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, adGroupId, termos }),
      });
      if (!res.ok) {
        const errText = await res.text();
        setNegativarError({ index: idx, msg: `HTTP ${res.status}: ${errText}` });
        setTimeout(() => setNegativarError(null), 5000);
        return;
      }
      const data = await res.json();
      if (data.sucesso) {
        setNegativados((prev) => {
          const existing = new Set(prev[idx] ?? []);
          termos.forEach((t) => existing.add(t));
          const next = { ...prev, [idx]: existing };
          const serializable: Record<string, string[]> = {};
          for (const k of Object.keys(next)) serializable[k] = Array.from(next[Number(k)]);
          sessionStorage.setItem("gestorIA_negativados", JSON.stringify(serializable));
          return next;
        });
        setNegativarSuccess({ index: idx, count: termos.length });
        setSelectedTermos((prev) => ({ ...prev, [idx]: new Set() }));
        setTimeout(() => setNegativarSuccess(null), 4000);
      } else {
        setNegativarError({ index: idx, msg: `Resposta sem sucesso: ${JSON.stringify(data)}` });
        setTimeout(() => setNegativarError(null), 5000);
      }
    } catch (err: any) {
      setNegativarError({ index: idx, msg: `Erro de rede: ${err?.message || String(err)}` });
      setTimeout(() => setNegativarError(null), 5000);
    } finally {
      setNegativarLoading(null);
    }
  };

  const renderOportunidadesContent = () => {
    if (!relatorio) return null;
    return (
      <div className="space-y-4">
        {relatorio.oportunidades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma oportunidade identificada</p>
        ) : (
          relatorio.oportunidades.map((op, i) => {
            if (!op) return null;
            const isExpanded = expandedOportunidades.has(i);
            const hasDetails = op.dado || op.causa_provavel || op.como_executar || (op.termos_negativar && op.termos_negativar.length > 0) || (op.keywords_adicionar && op.keywords_adicionar.length > 0);
            const idx = opRecIndex(i);
            // Lookup por rec_index injetado pelo backend (exato), fallback por campanha+grupo
            const recIdx = (op as any).rec_index;
            const matchingRec = recIdx !== undefined
              ? (relatorio.recomendacoes[recIdx] ?? undefined)
              : relatorio.recomendacoes.find((r) => r.campanha === op.campanha && (r.grupo ?? null) === (op.grupo ?? null))
                ?? relatorio.recomendacoes.find((r) => r.campanha === op.campanha);
            return (
              <div key={i} className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 overflow-hidden">
                <button
                  onClick={() => toggleOportunidadeExpand(i)}
                  className="w-full p-4 text-left space-y-2 hover:bg-emerald-500/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{op.campanha}</p>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{op.oportunidade}</p>
                </button>
                <AnimatePresence>
                  {isExpanded && hasDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-emerald-500/10 pt-3">
                        {/* Dado em destaque verde */}
                        {op.dado && (
                          <p className="text-base font-semibold text-emerald-400">{op.dado}</p>
                        )}
                        {/* Potencial estimado */}
                        {op.potencial_estimado && (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Potencial estimado</p>
                            <p className="text-sm font-semibold text-emerald-300">{op.potencial_estimado}</p>
                          </div>
                        )}
                        {/* O que fazer — da recomendação correspondente */}
                        {((op as any).acao || matchingRec) && (
                          <div className="space-y-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">O que fazer</p>
                            <p className="text-sm font-medium text-foreground">{(op as any).acao ?? matchingRec?.acao}</p>
                            {((op as any).como_executar ?? matchingRec?.como_executar) && (
                              <ol className="space-y-1 pl-0">
                                {parseSteps((op as any).como_executar ?? matchingRec?.como_executar ?? "").map((step, li) => (
                                  <li key={li} className="text-xs text-foreground/85 flex gap-2">
                                    <span className="text-muted-foreground font-medium shrink-0">{li + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                            {/* Termos a negativar da recomendação */}
                            {op.termos_negativar && op.termos_negativar.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Termos a negativar</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(op.termos_negativar ?? []).map((kw, ki) => {
                                    const isNegativado = negativados[idx]?.has(kw) ?? false;
                                    const isSelected = !isNegativado && (selectedTermos[idx]?.has(kw) ?? false);
                                    return (
                                      <button
                                        key={ki}
                                        onClick={() => !isNegativado && toggleTermo(idx, kw)}
                                        disabled={isNegativado}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono transition-all ${
                                          isNegativado
                                            ? "border-muted/50 bg-muted/20 text-muted-foreground/50 cursor-default line-through"
                                            : isSelected
                                            ? "border-red-500/70 bg-red-900/40 text-red-300 cursor-pointer"
                                            : "border-yellow-500/40 bg-secondary hover:border-yellow-400 hover:bg-secondary/80 text-foreground cursor-pointer"
                                        }`}
                                      >
                                        {isNegativado ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        ) : (
                                          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? "border-red-400 bg-red-500/30" : "border-muted-foreground/40"}`}>
                                            {isSelected && <span className="text-[8px] text-red-300">✓</span>}
                                          </span>
                                        )}
                                        {kw}
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 italic">Selecione os termos que deseja negativar</p>
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleNegativarOportunidade(i, { ...op, termos_negativar: op.termos_negativar, adGroupId: op.adGroupId ?? matchingRec?.adGroupId } as Oportunidade)}
                                    disabled={negativarLoading === idx || (selectedTermos[idx]?.size ?? 0) === 0}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                      (selectedTermos[idx]?.size ?? 0) > 0
                                        ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60"
                                        : "border-border bg-muted/30 text-muted-foreground"
                                    }`}
                                  >
                                    {negativarLoading === idx ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Negativando...</>
                                    ) : (selectedTermos[idx]?.size ?? 0) > 0 ? (
                                      <><X className="w-3 h-3" /> Negativar {selectedTermos[idx]?.size} selecionado{(selectedTermos[idx]?.size ?? 0) > 1 ? "s" : ""}</>
                                    ) : (
                                      <><X className="w-3 h-3" /> Negativar selecionados</>
                                    )}
                                  </button>
                                  {negativarSuccess?.index === idx && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> {negativarSuccess.count} termo{negativarSuccess.count > 1 ? "s" : ""} negativado{negativarSuccess.count > 1 ? "s" : ""} com sucesso
                                    </span>
                                  )}
                                  {negativarError?.index === idx && (
                                    <span className="text-xs text-red-400 flex items-center gap-1 max-w-md break-all">
                                      <AlertTriangle className="w-3 h-3 shrink-0" /> {negativarError.msg}
                                    </span>
                                  )}
                                </div>
                          </div>
                        )}
                        {/* Keywords a adicionar da recomendação */}
                        {matchingRec?.keywords_adicionar && matchingRec.keywords_adicionar.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Keywords a adicionar</p>
                              <button
                                onClick={() => navigator.clipboard.writeText(matchingRec.keywords_adicionar!.join('\n'))}
                                className="text-xs text-primary hover:underline"
                              >
                                Copiar
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {matchingRec.keywords_adicionar.map((kw, ki) => (
                                <KeywordChip key={ki} keyword={kw} variant="group" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderRecomendacoesContent = () => {
    if (!relatorio) return null;
    return (
      <div className="space-y-4">
        {relatorio.recomendacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma recomendação</p>
        ) : (
          relatorio.recomendacoes.map((rec, i) => {
            if (!rec) return null;
            return (
            <div key={i} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
              <div className="flex items-center gap-2">
                {prioridadeBadge(rec.prioridade)}
                <span className="text-sm font-semibold text-foreground">{rec.campanha}</span>
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
              {(rec as any).keywords_qs && (rec as any).keywords_qs.length > 0 && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Keywords com QS baixo:</p>
                  <div className="flex flex-col gap-1.5">
                    {(rec as any).keywords_qs.map((kq: any, ki: number) => (
                      <div key={ki} className="flex items-center gap-2 flex-wrap">
                        <KeywordChip keyword={kq.keyword} />
                        <span className="text-[10px] font-mono text-yellow-400 border border-yellow-500/30 bg-yellow-900/20 px-1.5 py-0.5 rounded">
                          QS {kq.qs}
                        </span>
                        <span className="text-[10px] text-red-400/80 border border-red-500/20 bg-red-900/10 px-1.5 py-0.5 rounded">
                          {kq.componente_critico}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(rec as any).match_type_label && (
                <div className="pt-1 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Tipo de correspondência:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <KeywordChip keyword={(rec as any).match_type_label} variant="group" />
                  </div>
                  {(rec as any).match_type_motivo && (
                    <p className="text-[11px] text-muted-foreground/70">{(rec as any).match_type_motivo}</p>
                  )}
                </div>
              )}
              {rec.termos_negativar && rec.termos_negativar.length > 0 && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Termos a negativar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.termos_negativar.map((kw, ki) => {
                      const isNegativado = negativados[i]?.has(kw) ?? false;
                      const isSelected = !isNegativado && (selectedTermos[i]?.has(kw) ?? false);
                      return (
                        <button
                          key={ki}
                          onClick={() => !isNegativado && toggleTermo(i, kw)}
                          disabled={isNegativado}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono transition-all ${
                            isNegativado
                              ? "border-muted/50 bg-muted/20 text-muted-foreground/50 cursor-default line-through"
                              : isSelected
                              ? "border-red-500/70 bg-red-900/40 text-red-300 cursor-pointer"
                              : "border-yellow-500/40 bg-secondary hover:border-yellow-400 hover:bg-secondary/80 text-foreground cursor-pointer"
                          }`}
                        >
                          {isNegativado ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? "border-red-400 bg-red-500/30" : "border-muted-foreground/40"}`}>
                              {isSelected && <span className="text-[8px] text-red-300">✓</span>}
                            </span>
                          )}
                          {kw}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 italic">Selecione os termos que deseja negativar</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleNegativar(i, rec)}
                      disabled={negativarLoading === i || (selectedTermos[i]?.size ?? 0) === 0}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        (selectedTermos[i]?.size ?? 0) > 0
                          ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {negativarLoading === i ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Negativando...</>
                      ) : (selectedTermos[i]?.size ?? 0) > 0 ? (
                        <><X className="w-3 h-3" /> Negativar {selectedTermos[i]?.size} selecionado{(selectedTermos[i]?.size ?? 0) > 1 ? "s" : ""}</>
                      ) : (
                        <><X className="w-3 h-3" /> Negativar selecionados</>
                      )}
                    </button>
                    {negativarSuccess?.index === i && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {negativarSuccess.count} termo{negativarSuccess.count > 1 ? "s" : ""} negativado{negativarSuccess.count > 1 ? "s" : ""} com sucesso
                      </span>
                    )}
                    {negativarError?.index === i && (
                      <span className="text-xs text-red-400 flex items-center gap-1 max-w-md break-all">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {negativarError.msg}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {rec.keywords_adicionar && rec.keywords_adicionar.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Keywords a adicionar:</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(rec.keywords_adicionar!.join('\n'))}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Copiar keywords
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.keywords_adicionar.map((kw, ki) => (
                      <KeywordChip key={ki} keyword={kw} variant="group" />
                    ))}
                  </div>
                </div>
              )}
              {/* ClickUp button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => { setClickupModal({ open: true, rec }); setClickupObs(""); setClickupListId(""); fetchClickupListas(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/50 text-xs font-medium transition-all"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Criar tarefa no ClickUp
                </button>
              </div>
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
                        className="w-full flex items-center gap-2 flex-wrap px-4 py-3 rounded-xl bg-secondary border border-border hover:border-primary/40 transition-all text-left min-h-[52px]"
                      >
                        {selectedAccounts.length === 0 ? (
                          <span className="text-muted-foreground font-medium">Selecione contas...</span>
                        ) : (
                          selectedAccounts.map((a) => (
                            <span
                              key={a.customerId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                            >
                              {a.name}
                              <span
                                role="button"
                                onClick={(e) => { e.stopPropagation(); toggleAccount(a.customerId); }}
                                className="hover:text-primary/70 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </span>
                            </span>
                          ))
                        )}
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ml-auto shrink-0 ${openDropdown ? "rotate-180" : ""}`}
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
                                  onClick={() => { toggleAccount(account.customerId); setOpenDropdown(false); setSearch(""); }}
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

                    {/* Context form — only show when accounts selected */}
                    {selectedIds.length > 0 && (
                    <div className="relative z-0">
                       {/* Structured context form */}
                      <div className="mb-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Contexto do cliente</h3>
                          <AnimatePresence>
                            {autoFilled && (
                              <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                dados salvos
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                          {/* Tipo de negócio */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5 min-h-[32px] flex items-end">
                              <span>Tipo de negócio <span className="text-red-400">*</span></span>
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
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5 min-h-[32px] flex items-end">
                              <span>O que você rastreia como conversão? <span className="text-red-400">*</span></span>
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
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5 min-h-[32px] flex items-end">
                              <span>Suas conversões são: <span className="text-red-400">*</span></span>
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
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5 min-h-[32px] flex items-end">
                              <span>Meta de CPA (R$) <span className="text-red-400">*</span></span>
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
                    </div>
                    )}

                    <Button
                      onClick={handleAnalyze}
                      disabled={selectedIds.length === 0 || !tipoNegocio || !conversaoRastreada || !tipoConversao || !metaCPA}
                      className="gradient-primary text-primary-foreground font-semibold px-8 glow-primary"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Analisar com IA
                    </Button>
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
                  const cpa30 = conv30 > 0 ? custo30 / conv30 : 0;
                  return [
                    { label: "Investido 7d", value: formatCurrency(custo7), icon: DollarSign },
                    { label: "Investido 30d", value: formatCurrency(custo30), icon: DollarSign },
                    { label: "Conversões 7d", value: conv7.toString(), icon: Target },
                    { label: "Conversões 30d", value: conv30.toString(), icon: Target },
                    { label: "CPA Médio 30d", value: formatCurrency(cpa30), icon: TrendingUp },
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

              {/* Resumo Executivo — 4 cards + expandable full text */}
              {resumoCards && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Resumo Executivo</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resumoCards.visaoGeral && (
                      <div className="glass-card rounded-xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📊</span>
                          <span className="text-sm font-bold text-foreground">Visão Geral</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resumoCards.visaoGeral}</p>
                      </div>
                    )}
                    {resumoCards.problema && (
                      <div className="glass-card rounded-xl p-4 border border-destructive/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🔴</span>
                          <span className="text-sm font-bold text-foreground">Problema Principal</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resumoCards.problema}</p>
                      </div>
                    )}
                    {resumoCards.destaques && (
                      <div className="glass-card rounded-xl p-4 border border-emerald-500/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🟢</span>
                          <span className="text-sm font-bold text-foreground">Destaques</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resumoCards.destaques}</p>
                      </div>
                    )}
                    {resumoCards.oportunidade && (
                      <div className="glass-card rounded-xl p-4 border border-warning/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⚡</span>
                          <span className="text-sm font-bold text-foreground">Maior Oportunidade Agora</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resumoCards.oportunidade}</p>
                      </div>
                    )}
                  </div>

                  {/* Expandable full text */}
                  <AnimatePresence>
                    {resumoExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="glass-card rounded-xl p-4 border border-border">
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {resumoCards.fullText}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setResumoExpanded(!resumoExpanded)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
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
                      onClick={() => {
                        setChatOpen(true);
                        setTimeout(() => chatInputRef.current?.focus(), 50);
                      }}
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
                          ref={chatInputRef}
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

      {/* ClickUp success toast */}
      <AnimatePresence>
        {clickupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 text-sm font-medium shadow-xl backdrop-blur-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Tarefa criada no ClickUp
          </motion.div>
        )}
      </AnimatePresence>

      {/* ClickUp Modal */}
      <Dialog open={clickupModal.open} onOpenChange={(open) => { if (!open) { setClickupModal({ open: false, rec: null }); setClickupCalendarOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-violet-400" />
              Criar tarefa no ClickUp
            </DialogTitle>
          </DialogHeader>
          {clickupModal.rec && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{clickupModal.rec.campanha}</p>
                <p className="text-sm text-foreground font-semibold">{clickupModal.rec.acao}</p>
              </div>

              {/* Lista */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Lista <span className="opacity-50">(opcional)</span></label>
                <Select value={clickupListId} onValueChange={setClickupListId} disabled={clickupListasLoading}>
                  <SelectTrigger className="text-sm">
                    {clickupListasLoading ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Carregando listas...
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecionar lista..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {clickupListas.map((lista) => (
                      <SelectItem key={lista.id} value={lista.id}>{lista.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Responsável <span className="opacity-50">(opcional)</span></label>
                <Select value={clickupAssignee} onValueChange={setClickupAssignee}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rodrigo">Rodrigo</SelectItem>
                    <SelectItem value="Railson">Railson</SelectItem>
                    <SelectItem value="Vanessa">Vanessa</SelectItem>
                    <SelectItem value="Talita">Talita</SelectItem>
                    <SelectItem value="Alex">Alex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data de conclusão */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data de conclusão <span className="opacity-50">(opcional)</span></label>
                <Popover open={clickupCalendarOpen} onOpenChange={setClickupCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal text-sm", !clickupDueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {clickupDueDate ? format(clickupDueDate, "dd/MM/yyyy") : "Selecionar data..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={clickupDueDate}
                      onSelect={(d) => { setClickupDueDate(d); setClickupCalendarOpen(false); }}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Prioridade <span className="opacity-50">(opcional)</span></label>
                <Select value={clickupPriority} onValueChange={setClickupPriority}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecionar prioridade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                    <SelectItem value="Alta">🟠 Alta</SelectItem>
                    <SelectItem value="Normal">🟡 Normal</SelectItem>
                    <SelectItem value="Baixa">🔵 Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Observação para a equipe <span className="opacity-50">(opcional)</span></label>
                <Textarea
                  value={clickupObs}
                  onChange={(e) => setClickupObs(e.target.value)}
                  placeholder="Adicionar observação para a equipe..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClickupModal({ open: false, rec: null })} disabled={clickupLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateClickupTask}
              disabled={clickupLoading}
              className="gradient-primary text-primary-foreground"
            >
              {clickupLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando...</> : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorIA;
