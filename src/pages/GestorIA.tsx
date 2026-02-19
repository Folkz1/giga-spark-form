import { useState, useMemo, useRef, useEffect } from "react";
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
  RotateCcw,
  Brain,
  CheckCircle2,
  Send,
  MessageCircle,
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
}

interface Oportunidade {
  campanha: string;
  oportunidade: string;
  dado: string;
}

interface Recomendacao {
  prioridade: "alta" | "media" | "baixa";
  campanha: string;
  acao: string;
  motivo: string;
  impacto_esperado: string;
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
      setAccounts([
        { id: "1", name: "Limpeza Industrial SP", customerId: "123-456-7890" },
        { id: "2", name: "Dedetização Premium", customerId: "234-567-8901" },
        { id: "3", name: "Higienização Total", customerId: "345-678-9012" },
        { id: "4", name: "Clean Service BR", customerId: "456-789-0123" },
      ]);
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
      console.log("[GESTOR-IA] Raw response:", rawText);
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("[GESTOR-IA] Failed to parse JSON:", rawText);
        throw new Error("Resposta inválida");
      }
      console.log("[GESTOR-IA] Parsed data:", JSON.stringify(data, null, 2));
      console.log("[GESTOR-IA] resumo:", data?.resumo);
      console.log("[GESTOR-IA] analise:", data?.analise);

      const analise = data.analise ?? {};
      setRelatorio({
        resumo: data.resumo ?? {
          totalCampanhas: 0,
          custo7dias: "0",
          custo30dias: "0",
          conversoes7dias: 0,
          conversoes30dias: 0,
        },
        alertas: Array.isArray(analise.alertas_criticos) ? analise.alertas_criticos : [],
        oportunidades: Array.isArray(analise.oportunidades) ? analise.oportunidades : [],
        recomendacoes: Array.isArray(analise.recomendacoes) ? analise.recomendacoes : [],
        resumoExecutivo: analise.resumo_executivo ?? "",
      });
      setStep(3);
    } catch {
      // Mock data for demo
      setRelatorio({
        resumo: {
          totalCampanhas: 5,
          custo7dias: "4520.00",
          custo30dias: "18340.00",
          conversoes7dias: 47,
          conversoes30dias: 185,
        },
        alertas: [
          { campanha: "Campanha Limpeza SP", alerta: "CPA acima do limite definido há 5 dias consecutivos", dado: "CPA atual: R$ 142,30 (limite: R$ 100)" },
          { campanha: "Campanha Dedetização", alerta: "Taxa de conversão caiu 40% na última semana", dado: "De 4,2% para 2,5%" },
        ],
        oportunidades: [
          { campanha: "Campanha Limpeza SP", oportunidade: "Horários entre 18h-21h mostram CTR 30% acima da média", dado: "CTR: 5,8% vs média de 4,1%" },
          { campanha: "Campanha Dedetização", oportunidade: "12 termos com alto volume ainda não cobertos", dado: "Volume estimado: 2.400 buscas/mês" },
        ],
        recomendacoes: [
          { prioridade: "alta", campanha: "Campanha Limpeza SP", acao: "Reduzir lance do grupo 'Genérico' em 20%", motivo: "CPA 42% acima da meta nas últimas 2 semanas", impacto_esperado: "Redução de CPA estimada em R$ 25-30" },
          { prioridade: "media", campanha: "Campanha Dedetização", acao: "Adicionar 8 palavras-chave negativas identificadas", motivo: "Termos irrelevantes consumindo 15% do orçamento", impacto_esperado: "Economia estimada de R$ 180/mês" },
          { prioridade: "baixa", campanha: "Campanha Higienização", acao: "Testar novo texto de anúncio com CTA direto", motivo: "CTR estável há 30 dias, potencial de melhoria", impacto_esperado: "Aumento de CTR estimado em 0,5-1%" },
        ],
        resumoExecutivo: "As campanhas analisadas apresentam desempenho geral estável, porém com pontos de atenção importantes.",
      });
      setStep(3);
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
  };

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading || !relatorio) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(
        "https://appn8o2.gigainteligencia.com.br/webhook/google-ads-gestor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensagem: msg,
            historico: updatedHistory,
            relatorio,
          }),
        }
      );
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.resposta ?? "Sem resposta." },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao se comunicar com o assistente." },
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              className="space-y-8"
            >
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                })().map((card) => (
                  <div key={card.label} className="glass-card rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <card.icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{card.label}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Three columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alertas Críticos */}
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-red-400 text-lg">
                      <AlertTriangle className="w-5 h-5" />
                      Alertas Críticos
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-auto">
                        {relatorio.alertas.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {relatorio.alertas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta</p>
                    ) : (
                      relatorio.alertas.map((alerta, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 space-y-1">
                          <p className="text-sm font-semibold text-foreground">{alerta.campanha}</p>
                          <p className="text-sm text-muted-foreground">{alerta.alerta}</p>
                          <p className="text-xs text-red-400 font-medium">{alerta.dado}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Oportunidades */}
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-400 text-lg">
                      <Lightbulb className="w-5 h-5" />
                      Oportunidades
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
                        {relatorio.oportunidades.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {relatorio.oportunidades.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade</p>
                    ) : (
                      relatorio.oportunidades.map((op, i) => (
                        <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 space-y-1">
                          <p className="text-sm font-semibold text-foreground">{op.campanha}</p>
                          <p className="text-sm text-muted-foreground">{op.oportunidade}</p>
                          <p className="text-xs text-green-400 font-medium">{op.dado}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recomendações */}
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
                      <ClipboardList className="w-5 h-5" />
                      Recomendações
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-auto">
                        {relatorio.recomendacoes.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {relatorio.recomendacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma recomendação</p>
                    ) : (
                      relatorio.recomendacoes.map((rec, i) => (
                        <div key={i} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
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
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Executive Summary */}
              {relatorio.resumoExecutivo && (
                <div className="glass-card rounded-2xl p-6 border-primary/20 glow-primary">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Resumo Executivo</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {relatorio.resumoExecutivo}
                  </p>
                </div>
              )}

              {/* Chat Panel */}
              <div className="glass-card rounded-2xl p-6 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Chat com Gestor IA</h3>
                </div>
                <div className="h-64 overflow-y-auto mb-4 space-y-3 rounded-xl bg-secondary/50 p-4">
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

              {/* Step 4 — New Analysis */}
              <div className="flex justify-center pt-4">
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
    </div>
  );
};

export default GestorIA;
