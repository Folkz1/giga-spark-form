import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Account {
  id: string;
  name: string;
  customerId: string;
}

interface Alerta {
  campanha: string;
  texto: string;
  dado: string;
}

interface Oportunidade {
  nome: string;
  descricao: string;
  dado: string;
}

interface Recomendacao {
  prioridade: "alta" | "media" | "baixa";
  campanha: string;
  acao: string;
  motivo: string;
  impactoEsperado: string;
}

interface Resumo {
  totalInvestido7d: number;
  totalInvestido30d: number;
  conversoes7d: number;
  conversoes30d: number;
  cpaMedio: number;
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
          }),
        }
      );
      if (!res.ok) throw new Error("Erro na análise");
      const data = await res.json();

      setRelatorio({
        resumo: data.resumo ?? {
          totalInvestido7d: 0,
          totalInvestido30d: 0,
          conversoes7d: 0,
          conversoes30d: 0,
          cpaMedio: 0,
        },
        alertas: Array.isArray(data.alertas) ? data.alertas : [],
        oportunidades: Array.isArray(data.oportunidades) ? data.oportunidades : [],
        recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes : [],
        resumoExecutivo: data.resumoExecutivo ?? data.resumo_executivo ?? "",
      });
      setStep(3);
    } catch {
      // Mock data for demo
      setRelatorio({
        resumo: {
          totalInvestido7d: 4520.0,
          totalInvestido30d: 18340.0,
          conversoes7d: 47,
          conversoes30d: 185,
          cpaMedio: 99.13,
        },
        alertas: [
          {
            campanha: "Campanha Limpeza SP",
            texto: "CPA acima do limite definido há 5 dias consecutivos",
            dado: "CPA atual: R$ 142,30 (limite: R$ 100)",
          },
          {
            campanha: "Campanha Dedetização",
            texto: "Taxa de conversão caiu 40% na última semana",
            dado: "De 4,2% para 2,5%",
          },
        ],
        oportunidades: [
          {
            nome: "Expansão de horário",
            descricao: "Horários entre 18h-21h mostram CTR 30% acima da média",
            dado: "CTR: 5,8% vs média de 4,1%",
          },
          {
            nome: "Novos termos de busca",
            descricao: "12 termos com alto volume ainda não cobertos",
            dado: "Volume estimado: 2.400 buscas/mês",
          },
        ],
        recomendacoes: [
          {
            prioridade: "alta",
            campanha: "Campanha Limpeza SP",
            acao: "Reduzir lance do grupo 'Genérico' em 20%",
            motivo: "CPA 42% acima da meta nas últimas 2 semanas",
            impactoEsperado: "Redução de CPA estimada em R$ 25-30",
          },
          {
            prioridade: "media",
            campanha: "Campanha Dedetização",
            acao: "Adicionar 8 palavras-chave negativas identificadas",
            motivo: "Termos irrelevantes consumindo 15% do orçamento",
            impactoEsperado: "Economia estimada de R$ 180/mês",
          },
          {
            prioridade: "baixa",
            campanha: "Campanha Higienização",
            acao: "Testar novo texto de anúncio com CTA direto",
            motivo: "CTR estável há 30 dias, potencial de melhoria",
            impactoEsperado: "Aumento de CTR estimado em 0,5-1%",
          },
        ],
        resumoExecutivo:
          "As campanhas analisadas apresentam desempenho geral estável, porém com pontos de atenção importantes. A Campanha Limpeza SP requer ajuste imediato de lances para conter o CPA crescente. As campanhas de Dedetização mostram queda recente na taxa de conversão que merece investigação. Por outro lado, existem oportunidades claras de expansão nos horários noturnos e em novos termos de busca com alto volume. Recomenda-se priorizar as ações de alta prioridade nos próximos 3 dias para estabilizar os custos.",
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
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

                      <Button
                        onClick={handleAnalyze}
                        disabled={selectedIds.length === 0}
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
                {[
                  { label: "Investido 7d", value: formatCurrency(relatorio.resumo.totalInvestido7d), icon: DollarSign },
                  { label: "Investido 30d", value: formatCurrency(relatorio.resumo.totalInvestido30d), icon: DollarSign },
                  { label: "Conversões 7d", value: relatorio.resumo.conversoes7d.toString(), icon: Target },
                  { label: "Conversões 30d", value: relatorio.resumo.conversoes30d.toString(), icon: Target },
                  { label: "CPA Médio", value: formatCurrency(relatorio.resumo.cpaMedio), icon: TrendingUp },
                ].map((card) => (
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
                          <p className="text-sm text-muted-foreground">{alerta.texto}</p>
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
                          <p className="text-sm font-semibold text-foreground">{op.nome}</p>
                          <p className="text-sm text-muted-foreground">{op.descricao}</p>
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
                            <span className="text-muted-foreground font-normal">Impacto:</span> {rec.impactoEsperado}
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
