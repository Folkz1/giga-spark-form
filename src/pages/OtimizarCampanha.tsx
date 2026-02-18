import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  ChevronDown,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { Account } from "@/components/campaign/types";

/* ── Types ─────────────────────────────────────────── */

interface Campaign {
  id: string;
  name: string;
}

interface AdGroupOption {
  id: string;
  name: string;
}

interface SugestedTerm {
  termo: string;
  impressoes: number;
  cliques: number;
  custo: number;
  conversoes: number;
  motivo: string;
  prioridade: "alta" | "media" | "baixa";
}

/* ── Reusable Dropdown ─────────────────────────────── */

interface DropdownItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface CustomDropdownProps {
  label: string;
  placeholder: string;
  items: DropdownItem[];
  selectedId: string | null;
  onSelect: (item: DropdownItem) => void;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  searchable?: boolean;
}

const CustomDropdown = ({
  label,
  placeholder,
  items,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  disabled,
  searchable = false,
}: CustomDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.find((i) => i.id === selectedId);
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (i.label ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (i.sublabel ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-destructive/40">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          {onRetry && (
            <button onClick={onRetry} className="ml-auto text-xs text-primary hover:underline">
              Tentar novamente
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => !disabled && setOpen(!open)}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary border border-border transition-all text-left ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-primary/40"
            }`}
          >
            {selected ? (
              <div>
                <p className="font-medium text-foreground text-sm">{selected.label}</p>
                {selected.sublabel && (
                  <p className="text-xs text-muted-foreground">{selected.sublabel}</p>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-2xl overflow-hidden max-h-64 flex flex-col"
            >
              {searchable && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    autoFocus
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item encontrado</p>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full px-4 py-3 hover:bg-secondary transition-colors text-left ${
                        selectedId === item.id ? "bg-secondary" : ""
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm">{item.label}</p>
                      {item.sublabel && (
                        <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ────────────────────────────────── */

const OtimizarCampanha = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const [adGroups, setAdGroups] = useState<AdGroupOption[]>([]);
  const [adGroupsLoading, setAdGroupsLoading] = useState(false);
  const [adGroupsError, setAdGroupsError] = useState<string | null>(null);
  const [selectedAdGroup, setSelectedAdGroup] = useState<AdGroupOption | null>(null);

  // Step 2-3 state
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [suggestedTerms, setSuggestedTerms] = useState<SugestedTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());

  // Step 4 state
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  /* ── Fetch accounts ──────────────────────────────── */
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-accounts");
      if (!res.ok) throw new Error("Falha ao carregar contas");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [];
      // Filter invalid accounts and deduplicate by id
      const seen = new Set<string>();
      const list = raw.filter((a: any) => {
        const name = (a.name || "").trim();
        if (!name || name === "--") return false;
        const id = String(a.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setAccounts(list);
    } catch {
      setAccountsError("Erro ao carregar contas. Tente novamente.");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /* ── Fetch campaigns ─────────────────────────────── */
  const fetchCampaigns = useCallback(async (customerId: string) => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    setCampaigns([]);
    setSelectedCampaign(null);
    setAdGroups([]);
    setSelectedAdGroup(null);
    try {
      const res = await fetch(
        `https://principaln8o.gigainteligencia.com.br/webhook/google-ads-campaigns?customerId=${customerId}`
      );
      if (!res.ok) throw new Error("Falha ao carregar campanhas");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : Array.isArray(data?.campaigns) ? data.campaigns : [];
      const list = raw
        .filter((c: any) => c.status === "ENABLED")
        .map((c: any) => ({ id: String(c.id), name: c.nome || c.name || "" }));
      setCampaigns(list);
    } catch {
      setCampaignsError("Erro ao carregar campanhas.");
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  /* ── Fetch ad groups ─────────────────────────────── */
  const fetchAdGroups = useCallback(async (customerId: string, campaignId: string) => {
    setAdGroupsLoading(true);
    setAdGroupsError(null);
    setAdGroups([]);
    setSelectedAdGroup(null);
    try {
      const res = await fetch(
        `https://appn8o2.gigainteligencia.com.br/webhook/google-ads-adgroups?customerId=${customerId}&campaignId=${campaignId}`
      );
      if (!res.ok) throw new Error("Falha ao carregar grupos");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : Array.isArray(data?.adGroups) ? data.adGroups : [];
      const list = raw
        .filter((g: any) => g.status === "ENABLED")
        .map((g: any) => ({ id: String(g.id), name: g.nome || g.name || "" }));
      setAdGroups(list);
    } catch {
      setAdGroupsError("Erro ao carregar grupos de anúncios.");
    } finally {
      setAdGroupsLoading(false);
    }
  }, []);

  /* ── Analyze (step 2) ────────────────────────────── */
  const startAnalysis = useCallback(async () => {
    setStep(1);
    setAnalyzeError(null);
    const requestBody = {
      customerId: selectedAccount!.customerId,
      campaignId: selectedCampaign!.id,
      adGroupId: selectedAdGroup!.id,
      adGroupName: selectedAdGroup!.name,
      campaignName: selectedCampaign!.name,
    };
    console.log("Sending optimize request:", requestBody);
    try {
      const response = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/google-ads-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedAccount!.customerId,
          campaignId: selectedCampaign!.id,
          adGroupId: selectedAdGroup!.id,
          adGroupName: selectedAdGroup!.name,
          campaignName: selectedCampaign!.name,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Optimize API error:", response.status, errorText);
        throw new Error(`Falha na análise: ${response.status}`);
      }
      const data = await response.json();
      console.log("Full API Response:", data);
      const terms: SugestedTerm[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.sugestoes)
        ? data.sugestoes
        : Array.isArray(data?.termos)
        ? data.termos
        : Array.isArray(data?.suggestions)
        ? data.suggestions
        : [];
      console.log("Parsed terms:", terms.length);
      if (terms.length === 0) {
        console.warn("API returned 0 suggestions. Full response keys:", Object.keys(data));
      }
      setSuggestedTerms(terms);
      setSelectedTerms(new Set());
      setStep(2);
    } catch (err: any) {
      console.error("Optimize error:", err);
      setAnalyzeError(err?.message || "Erro na análise. Tente novamente.");
      setStep(0);
    }
  }, [selectedAccount, selectedCampaign, selectedAdGroup]);

  /* ── Apply negatives (step 3→4) ──────────────────── */
  const applyNegatives = useCallback(async () => {
    setApplyingLoading(true);
    try {
      const termos = suggestedTerms.filter((t) => selectedTerms.has(t.termo));
      const res = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/google-ads-negative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedAccount!.customerId,
          adGroupId: selectedAdGroup!.id,
          termos: termos.map((t) => t.termo),
        }),
      });
      if (!res.ok) throw new Error("Falha ao aplicar negativações");
      setAppliedCount(termos.length);
      setStep(3);
    } catch {
      // stay on review
    } finally {
      setApplyingLoading(false);
    }
  }, [suggestedTerms, selectedTerms, selectedAccount, selectedAdGroup]);

  /* ── Helpers ─────────────────────────────────────── */

  const selectableTerms = suggestedTerms.filter((t) => t.conversoes === 0);

  const toggleTerm = (termo: string) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      next.has(termo) ? next.delete(termo) : next.add(termo);
      return next;
    });
  };

  const selectHighPriority = () => {
    const high = selectableTerms.filter((t) => t.prioridade === "alta").map((t) => t.termo);
    setSelectedTerms(new Set(high));
  };

  const selectAll = () => {
    setSelectedTerms(new Set(selectableTerms.map((t) => t.termo)));
  };

  const resetFlow = () => {
    setStep(0);
    setSelectedCampaign(null);
    setSelectedAdGroup(null);
    setCampaigns([]);
    setAdGroups([]);
    setSuggestedTerms([]);
    setSelectedTerms(new Set());
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case "alta":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Alta</Badge>;
      case "media":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Média</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  const canAnalyze = !!selectedAccount && !!selectedCampaign && !!selectedAdGroup;

  const stepLabels = ["Seleção", "Analisando", "Revisão", "Confirmação"];

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Giga</span>{" "}
            <span className="text-foreground">Aceleradora</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Otimização inteligente de campanhas Google Ads
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? "gradient-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Selection ────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Selecione o que otimizar</h2>
                  <p className="text-muted-foreground">
                    Escolha a conta, campanha e grupo de anúncios para análise.
                  </p>
                </div>

                <CustomDropdown
                  label="Conta Google Ads"
                  placeholder="Selecione uma conta..."
                  items={accounts.map((a) => ({ id: a.customerId, label: a.name, sublabel: a.customerId }))}
                  selectedId={selectedAccount?.customerId ?? null}
                  onSelect={(item) => {
                    const acc = accounts.find((a) => a.customerId === item.id)!;
                    setSelectedAccount(acc);
                    fetchCampaigns(acc.customerId);
                  }}
                  loading={accountsLoading}
                  error={accountsError}
                  onRetry={fetchAccounts}
                  searchable
                />

                <CustomDropdown
                  label="Campanha"
                  placeholder="Selecione uma campanha..."
                  items={campaigns.map((c) => ({ id: c.id, label: c.name }))}
                  selectedId={selectedCampaign?.id ?? null}
                  onSelect={(item) => {
                    const camp = campaigns.find((c) => c.id === item.id)!;
                    setSelectedCampaign(camp);
                    fetchAdGroups(selectedAccount!.customerId, camp.id);
                  }}
                  loading={campaignsLoading}
                  error={campaignsError}
                  onRetry={() => selectedAccount && fetchCampaigns(selectedAccount.customerId)}
                  disabled={!selectedAccount}
                  searchable
                />

                <CustomDropdown
                  label="Grupo de Anúncios"
                  placeholder="Selecione um grupo..."
                  items={adGroups.map((g) => ({ id: g.id, label: g.name }))}
                  selectedId={selectedAdGroup?.id ?? null}
                  onSelect={(item) => {
                    const grp = adGroups.find((g) => g.id === item.id)!;
                    setSelectedAdGroup(grp);
                  }}
                  loading={adGroupsLoading}
                  error={adGroupsError}
                  onRetry={() =>
                    selectedAccount &&
                    selectedCampaign &&
                    fetchAdGroups(selectedAccount.customerId, selectedCampaign.id)
                  }
                  disabled={!selectedCampaign}
                  searchable
                />

                {analyzeError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-sm text-destructive">{analyzeError}</span>
                  </div>
                )}

                <div className="pt-4">
                  <motion.button
                    onClick={startAnalysis}
                    disabled={!canAnalyze}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
                    whileTap={{ scale: 0.97 }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Analisar com IA
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Analyzing ───────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center glow-primary-strong">
                    <Brain className="w-10 h-10 text-primary-foreground animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Analisando...</h2>
                  <p className="text-muted-foreground max-w-md">
                    A IA está analisando os termos de pesquisa dos últimos 7 dias...
                  </p>
                </div>
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </motion.div>
            )}

            {/* ── Step 2: Review ──────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    Sugestões de Negativação — {selectedAdGroup?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {suggestedTerms.length} termos encontrados · {selectedTerms.size} selecionados
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={selectHighPriority}
                    className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors border border-destructive/20"
                  >
                    Selecionar Alta Prioridade
                  </button>
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-surface-hover transition-colors"
                  >
                    Selecionar Todos
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/50">
                        <TableHead className="w-10" />
                        <TableHead>Termo de Pesquisa</TableHead>
                        <TableHead className="text-right">Impressões</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Custo (R$)</TableHead>
                        <TableHead className="text-right">Conversões</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Prioridade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestedTerms.map((term) => {
                        const hasConversions = term.conversoes > 0;
                        return (
                          <TableRow
                            key={term.termo}
                            className={hasConversions ? "opacity-40" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedTerms.has(term.termo)}
                                onCheckedChange={() => toggleTerm(term.termo)}
                                disabled={hasConversions}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{term.termo}</TableCell>
                            <TableCell className="text-right">{term.impressoes.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right">{term.cliques}</TableCell>
                            <TableCell className="text-right">
                              {term.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">{term.conversoes}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {term.motivo}
                            </TableCell>
                            <TableCell>{priorityBadge(term.prioridade)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {suggestedTerms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhuma sugestão encontrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="pt-2">
                  <motion.button
                    onClick={applyNegatives}
                    disabled={selectedTerms.size === 0 || applyingLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
                    whileTap={{ scale: 0.97 }}
                  >
                    {applyingLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>Aplicar Negativações Selecionadas ({selectedTerms.size})</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Confirmation ────────────────── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Negativações Aplicadas!</h2>
                  <p className="text-muted-foreground">
                    {appliedCount} {appliedCount === 1 ? "termo foi negativado" : "termos foram negativados"} com sucesso
                    no grupo <span className="font-semibold text-foreground">{selectedAdGroup?.name}</span>.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetFlow}
                    className="px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-primary"
                  >
                    Otimizar outro grupo
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao início
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back button (steps 0-2) */}
        {step < 3 && (
          <div className="mt-6">
            <button
              onClick={() => (step === 0 ? navigate("/") : setStep(0))}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Voltar ao início" : "Voltar à seleção"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtimizarCampanha;
