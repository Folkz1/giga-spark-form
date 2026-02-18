import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronDown,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  Brain,
  Check,
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

interface CampaignEntry {
  id: string;
  name: string;
  accountName: string;
  customerId: string;
}

interface AdGroupEntry {
  id: string;
  name: string;
  campaignName: string;
  campaignId: string;
  customerId: string;
}

interface SugestedTerm {
  termo: string;
  impressoes: number;
  cliques: number;
  custo: number | string;
  conversoes: number;
  motivo: string;
  prioridade: "alta" | "media" | "baixa";
  grupo: string;
  adGroupId: string;
  customerId: string;
}

/* ── Multi-Select Dropdown ─────────────────────────── */

interface MultiSelectItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  items: MultiSelectItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  disabled?: boolean;
}

const MultiSelectDropdown = ({
  label,
  placeholder,
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  loading,
  error,
  onRetry,
  disabled,
}: MultiSelectDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (i.label ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (i.sublabel ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-2" ref={ref}>
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
              disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/40"
            }`}
          >
            {selectedCount > 0 ? (
              <span className="text-foreground text-sm font-medium">
                {selectedCount} {selectedCount === 1 ? "selecionado" : "selecionados"}
              </span>
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
              className="absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-2xl overflow-hidden max-h-72 flex flex-col"
            >
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
              <div className="overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item encontrado</p>
                ) : (
                  <>
                    {/* Select All */}
                    <button
                      onClick={() => {
                        const allFilteredIds = filtered.map((i) => i.id);
                        const allSelected = allFilteredIds.every((id) => selectedIds.has(id));
                        if (allSelected) {
                          // deselect all filtered
                          onToggleAll(allFilteredIds.filter((id) => selectedIds.has(id)));
                        } else {
                          // select all filtered that aren't selected
                          onToggleAll(allFilteredIds.filter((id) => !selectedIds.has(id)));
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left border-b border-border"
                    >
                      {(() => {
                        const allFilteredIds = filtered.map((i) => i.id);
                        const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
                        return (
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              allSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {allSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        );
                      })()}
                      <p className="font-semibold text-foreground text-sm">Selecionar todos</p>
                    </button>
                    {filtered.map((item) => {
                      const checked = selectedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => onToggle(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left ${
                            checked ? "bg-secondary/60" : ""
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{item.label}</p>
                            {item.sublabel && (
                              <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
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

  // Step 1 state — multi-select
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());

  const [adGroups, setAdGroups] = useState<AdGroupEntry[]>([]);
  const [adGroupsLoading, setAdGroupsLoading] = useState(false);
  const [adGroupsError, setAdGroupsError] = useState<string | null>(null);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<string>>(new Set());

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
      const text = await res.text();
      if (!text) throw new Error("Resposta vazia");
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);
    } catch (err) {
      console.error("Fetch accounts error:", err);
      setAccountsError("Erro ao carregar contas. Tente novamente.");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /* ── Fetch campaigns for all selected accounts ───── */
  const fetchCampaignsForAccounts = useCallback(async (accountIds: Set<string>) => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    setCampaigns([]);
    setSelectedCampaignIds(new Set());
    setAdGroups([]);
    setSelectedAdGroupIds(new Set());

    if (accountIds.size === 0) {
      setCampaignsLoading(false);
      return;
    }

    try {
      const selectedAccounts = accounts.filter((a) => accountIds.has(a.customerId));
      const results = await Promise.all(
        selectedAccounts.map(async (acc) => {
          try {
            const res = await fetch(
              `https://principaln8o.gigainteligencia.com.br/webhook/google-ads-campaigns?customerId=${acc.customerId}`
            );
            if (!res.ok) return [];
            const text = await res.text();
            if (!text) return [];
            const data = JSON.parse(text);
            const raw = Array.isArray(data) ? data : Array.isArray(data?.campaigns) ? data.campaigns : [];
            return raw
              .filter((c: any) => c.status === "ENABLED")
              .map((c: any): CampaignEntry => ({
                id: `${acc.customerId}__${String(c.id)}`,
                name: c.nome || c.name || "",
                accountName: acc.name,
                customerId: acc.customerId,
              }));
          } catch (err) {
            console.error(`Fetch campaigns error for ${acc.customerId}:`, err);
            return [];
          }
        })
      );
      setCampaigns(results.flat());
    } catch {
      setCampaignsError("Erro ao carregar campanhas.");
    } finally {
      setCampaignsLoading(false);
    }
  }, [accounts]);

  /* ── Fetch ad groups for all selected campaigns ──── */
  const fetchAdGroupsForCampaigns = useCallback(async (campaignIds: Set<string>) => {
    setAdGroupsLoading(true);
    setAdGroupsError(null);
    setAdGroups([]);
    setSelectedAdGroupIds(new Set());

    if (campaignIds.size === 0) {
      setAdGroupsLoading(false);
      return;
    }

    try {
      const selectedCampaigns = campaigns.filter((c) => campaignIds.has(c.id));
      const results = await Promise.all(
        selectedCampaigns.map(async (camp) => {
          try {
            const realCampaignId = camp.id.split("__")[1];
            const res = await fetch(
              `https://appn8o2.gigainteligencia.com.br/webhook/google-ads-adgroups?customerId=${camp.customerId}&campaignId=${realCampaignId}`
            );
            if (!res.ok) return [];
            const text = await res.text();
            if (!text) return [];
            const data = JSON.parse(text);
            const raw = Array.isArray(data) ? data : Array.isArray(data?.adGroups) ? data.adGroups : [];
            return raw
              .filter((g: any) => g.status === "ENABLED")
              .map((g: any): AdGroupEntry => ({
                id: `${camp.customerId}__${realCampaignId}__${String(g.id)}`,
                name: g.nome || g.name || "",
                campaignName: camp.name,
                campaignId: realCampaignId,
                customerId: camp.customerId,
              }));
          } catch (err) {
            console.error(`Fetch adgroups error for ${camp.id}:`, err);
            return [];
          }
        })
      );
      setAdGroups(results.flat());
    } catch {
      setAdGroupsError("Erro ao carregar grupos de anúncios.");
    } finally {
      setAdGroupsLoading(false);
    }
  }, [campaigns]);

  /* ── Toggle helpers with cascade ─────────────────── */
  const toggleAccount = useCallback((customerId: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      next.has(customerId) ? next.delete(customerId) : next.add(customerId);
      return next;
    });
  }, []);

  // When selectedAccountIds changes, fetch campaigns
  const prevAccountIds = useRef<string>("");
  useEffect(() => {
    const key = [...selectedAccountIds].sort().join(",");
    if (key !== prevAccountIds.current) {
      prevAccountIds.current = key;
      fetchCampaignsForAccounts(selectedAccountIds);
    }
  }, [selectedAccountIds, fetchCampaignsForAccounts]);

  const toggleCampaign = useCallback((id: string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // When selectedCampaignIds changes, fetch ad groups
  const prevCampaignIds = useRef<string>("");
  useEffect(() => {
    const key = [...selectedCampaignIds].sort().join(",");
    if (key !== prevCampaignIds.current) {
      prevCampaignIds.current = key;
      fetchAdGroupsForCampaigns(selectedCampaignIds);
    }
  }, [selectedCampaignIds, fetchAdGroupsForCampaigns]);

  const toggleAdGroup = useCallback((id: string) => {
    setSelectedAdGroupIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── Analyze (parallel per group) ────────────────── */
  const startAnalysis = useCallback(async () => {
    setStep(1);
    setAnalyzeError(null);

    const selectedGroups = adGroups.filter((g) => selectedAdGroupIds.has(g.id));

    try {
      const results = await Promise.all(
        selectedGroups.map(async (grp) => {
          const body = {
            customerId: grp.customerId,
            campaignId: grp.campaignId,
            adGroupId: grp.id.split("__")[2],
            adGroupName: grp.name,
            campaignName: grp.campaignName,
          };
          console.log("Sending optimize request:", body);
          const response = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/google-ads-optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            console.error("Optimize API error:", response.status);
            return [];
          }
          const data = await response.json();
          console.log("Full API Response for", grp.name, ":", data);
          const terms: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.sugestoes)
            ? data.sugestoes
            : Array.isArray(data?.termos)
            ? data.termos
            : [];
          return terms.map((t: any): SugestedTerm => ({
            ...t,
            custo: t.custo,
            grupo: grp.name,
            adGroupId: grp.id.split("__")[2],
            customerId: grp.customerId,
          }));
        })
      );
      const allTerms = results.flat();
      console.log("Total terms across all groups:", allTerms.length);
      setSuggestedTerms(allTerms);
      setSelectedTerms(new Set());
      setStep(2);
    } catch (err: any) {
      console.error("Optimize error:", err);
      setAnalyzeError(err?.message || "Erro na análise. Tente novamente.");
      setStep(0);
    }
  }, [adGroups, selectedAdGroupIds]);

  /* ── Apply negatives (grouped by adGroup) ────────── */
  const applyNegatives = useCallback(async () => {
    setApplyingLoading(true);
    try {
      const termsToApply = suggestedTerms.filter((t) => selectedTerms.has(`${t.adGroupId}__${t.termo}`));
      // Group by adGroupId + customerId
      const grouped = new Map<string, { customerId: string; adGroupId: string; termos: string[] }>();
      for (const t of termsToApply) {
        const key = `${t.customerId}__${t.adGroupId}`;
        if (!grouped.has(key)) {
          grouped.set(key, { customerId: t.customerId, adGroupId: t.adGroupId, termos: [] });
        }
        grouped.get(key)!.termos.push(t.termo);
      }

      await Promise.all(
        [...grouped.values()].map(async (g) => {
          const res = await fetch("https://appn8o2.gigainteligencia.com.br/webhook/google-ads-negative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId: g.customerId, adGroupId: g.adGroupId, termos: g.termos }),
          });
          if (!res.ok) throw new Error("Falha ao aplicar negativações");
        })
      );
      setAppliedCount(termsToApply.length);
      setStep(3);
    } catch {
      // stay on review
    } finally {
      setApplyingLoading(false);
    }
  }, [suggestedTerms, selectedTerms]);

  /* ── Helpers ─────────────────────────────────────── */

  const selectableTerms = suggestedTerms.filter((t) => t.conversoes === 0);

  const termKey = (t: SugestedTerm) => `${t.adGroupId}__${t.termo}`;

  const toggleTerm = (t: SugestedTerm) => {
    const key = termKey(t);
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectHighPriority = () => {
    const keys = selectableTerms.filter((t) => t.prioridade === "alta").map(termKey);
    setSelectedTerms(new Set(keys));
  };

  const selectAll = () => {
    setSelectedTerms(new Set(selectableTerms.map(termKey)));
  };

  const resetFlow = () => {
    setStep(0);
    setSelectedCampaignIds(new Set());
    setSelectedAdGroupIds(new Set());
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

  const canAnalyze = selectedAdGroupIds.size > 0;

  const stepLabels = ["Seleção", "Analisando", "Revisão", "Confirmação"];

  const parseCusto = (c: number | string) => {
    const n = typeof c === "string" ? parseFloat(c) : c;
    return isNaN(n) ? 0 : n;
  };

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
                    Escolha contas, campanhas e grupos de anúncios para análise.
                  </p>
                </div>

                <MultiSelectDropdown
                  label="Contas Google Ads"
                  placeholder="Selecione contas..."
                  items={accounts.map((a) => ({ id: a.customerId, label: a.name, sublabel: a.customerId }))}
                  selectedIds={selectedAccountIds}
                  onToggle={toggleAccount}
                  onToggleAll={(ids) => ids.forEach(toggleAccount)}
                  loading={accountsLoading}
                  error={accountsError}
                  onRetry={fetchAccounts}
                />

                <MultiSelectDropdown
                  label="Campanhas"
                  placeholder="Selecione campanhas..."
                  items={campaigns.map((c) => ({ id: c.id, label: `${c.accountName} — ${c.name}` }))}
                  selectedIds={selectedCampaignIds}
                  onToggle={toggleCampaign}
                  onToggleAll={(ids) => ids.forEach(toggleCampaign)}
                  loading={campaignsLoading}
                  error={campaignsError}
                  disabled={selectedAccountIds.size === 0}
                />

                <MultiSelectDropdown
                  label="Grupos de Anúncios"
                  placeholder="Selecione grupos..."
                  items={adGroups.map((g) => ({ id: g.id, label: `${g.campaignName} — ${g.name}` }))}
                  selectedIds={selectedAdGroupIds}
                  onToggle={toggleAdGroup}
                  onToggleAll={(ids) => ids.forEach(toggleAdGroup)}
                  loading={adGroupsLoading}
                  error={adGroupsError}
                  disabled={selectedCampaignIds.size === 0}
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
                    Analisar com IA ({selectedAdGroupIds.size} {selectedAdGroupIds.size === 1 ? "grupo" : "grupos"})
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
                    A IA está analisando {selectedAdGroupIds.size} {selectedAdGroupIds.size === 1 ? "grupo" : "grupos"} de anúncios...
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
                    Sugestões de Negativação
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
                        <TableHead>Grupo</TableHead>
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
                        const key = termKey(term);
                        return (
                          <TableRow
                            key={key}
                            className={hasConversions ? "opacity-40" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedTerms.has(key)}
                                onCheckedChange={() => toggleTerm(term)}
                                disabled={hasConversions}
                              />
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {term.grupo}
                            </TableCell>
                            <TableCell className="font-medium">{term.termo}</TableCell>
                            <TableCell className="text-right">{term.impressoes?.toLocaleString("pt-BR") ?? 0}</TableCell>
                            <TableCell className="text-right">{term.cliques ?? 0}</TableCell>
                            <TableCell className="text-right">
                              {parseCusto(term.custo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">{term.conversoes ?? 0}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {term.motivo}
                            </TableCell>
                            <TableCell>{priorityBadge(term.prioridade)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {suggestedTerms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
                    {appliedCount} {appliedCount === 1 ? "termo foi negativado" : "termos foram negativados"} com sucesso.
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
