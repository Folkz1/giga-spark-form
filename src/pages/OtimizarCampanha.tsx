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
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  Zap,
  ShieldAlert,
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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
  accountName: string;
  campaignName: string;
  campaignId: string;
  matchTypeRecomendado?: string;
  impactoEstimado?: string;
}

interface Benchmarks {
  ctrMedio: string;
  cpcMedio: string;
  cpaMedio: string;
  taxaConversao: string;
  totalCusto: string;
  totalConversoes: number;
}

interface PadraoSugerido {
  padrao: string;
  matchType: string;
  motivo: string;
  termosAfetados: number;
  custoTotal: string;
}

interface ResumoOtimizacao {
  totalSugestoes: number;
  potencialEconomia: string;
  saudeDoGrupo: "boa" | "atencao" | "critica";
}

interface CampaignEnriched extends CampaignEntry {
  roas?: string;
  performance?: string;
  wasteSpend?: string;
}

interface CampaignsResumo {
  roasGeral?: string;
  campanhasCriticas?: number;
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

  const [campaigns, setCampaigns] = useState<CampaignEnriched[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [campaignsResumo, setCampaignsResumo] = useState<CampaignsResumo | null>(null);

  const [adGroups, setAdGroups] = useState<AdGroupEntry[]>([]);
  const [adGroupsLoading, setAdGroupsLoading] = useState(false);
  const [adGroupsError, setAdGroupsError] = useState<string | null>(null);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<string>>(new Set());

  // Step 2-3 state
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [suggestedTerms, setSuggestedTerms] = useState<SugestedTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  // Priority filters per level: key = "account_X" | "campaign_X" | "group_X", value = "alta"|"media"|"baixa"|"todos"
  const [priorityFilters, setPriorityFilters] = useState<Record<string, string>>({});
  // Global filter: "alta"|"media"|"baixa"|null (toggle behavior)
  const [globalFilter, setGlobalFilter] = useState<string | null>(null);
  const [openAccounts, setOpenAccounts] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Step 4 state
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // New optimization analysis states
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [padroesSugeridos, setPadroesSugeridos] = useState<PadraoSugerido[]>([]);
  const [resumoOtimizacao, setResumoOtimizacao] = useState<ResumoOtimizacao | null>(null);

  /* ── Fetch accounts ──────────────────────────────── */
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      console.log('[ACCOUNTS] Buscando contas...');
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-accounts", {
        headers: { "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" }
      });
      console.log('[ACCOUNTS] Status:', res.status);
      if (!res.ok) throw new Error(`Falha ao carregar contas (status ${res.status})`);
      const text = await res.text();
      console.log('[ACCOUNTS] Resposta raw:', text?.substring(0, 500));
      if (!text) throw new Error("Resposta vazia");
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [];
      console.log('[ACCOUNTS] Contas encontradas:', list.length);
      setAccounts(list);
    } catch (err) {
      console.error("[ACCOUNTS] Erro:", err);
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
            const url = `https://principaln8o.gigainteligencia.com.br/webhook/google-ads-campaigns?customerId=${acc.customerId}`;
            console.log(`[CAMPAIGNS] Buscando campanhas para conta: ${acc.name} (${acc.customerId})`);
            const res = await fetch(url, { headers: { "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" } });
            console.log(`[CAMPAIGNS] Status para ${acc.customerId}:`, res.status);
            const text = await res.text();
            console.log(`[CAMPAIGNS] Resposta raw para ${acc.customerId}:`, text?.substring(0, 500));
            if (!res.ok) return [];
            if (!text) { console.warn(`[CAMPAIGNS] Resposta vazia para ${acc.customerId}`); return []; }
            const data = JSON.parse(text);
            const raw = Array.isArray(data) ? data : Array.isArray(data?.campaigns) ? data.campaigns : [];
            if (raw.length > 0) {
              console.log('[CAMPAIGNS] Primeiro objeto campanha:', JSON.stringify(raw[0]));
            }
            // Capture resumo if present
            if (data?.resumo) {
              setCampaignsResumo(data.resumo);
            }
            const enabled = raw.filter((c: any) => {
              const s = c.status || c.situacao || c.state || "";
              return s === "ENABLED" || s === "ATIVO";
            });
            console.log(`[CAMPAIGNS] ${acc.customerId}: ${raw.length} total, ${enabled.length} ENABLED`);
            return enabled.map((c: any): CampaignEnriched => ({
                id: `${acc.customerId}__${String(c.id)}`,
                name: c.nome || c.name || "",
                accountName: acc.name,
                customerId: acc.customerId,
                roas: c.roas,
                performance: c.performance,
                wasteSpend: c.wasteSpend,
              }));
          } catch (err) {
            console.error(`[CAMPAIGNS] Erro para ${acc.customerId}:`, err);
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
            const url = `https://principaln8o.gigainteligencia.com.br/webhook/google-ads-adgroups?customerId=${camp.customerId}&campaignId=${realCampaignId}`;
            console.log(`[ADGROUPS] Buscando grupos para campanha: ${camp.name} (${camp.customerId}/${realCampaignId})`);
            const res = await fetch(url, {
              headers: { "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" }
            });
            console.log(`[ADGROUPS] Status para ${camp.customerId}/${realCampaignId}:`, res.status);
            const text = await res.text();
            console.log(`[ADGROUPS] Resposta raw para ${camp.customerId}/${realCampaignId}:`, text?.substring(0, 500));
            if (!res.ok) return [];
            if (!text) { console.warn(`[ADGROUPS] Resposta vazia para ${camp.customerId}/${realCampaignId}`); return []; }
            const data = JSON.parse(text);
            const raw = Array.isArray(data) ? data : Array.isArray(data?.adGroups) ? data.adGroups : [];
            const enabled = raw.filter((g: any) => g.status === "ENABLED");
            console.log(`[ADGROUPS] ${camp.customerId}/${realCampaignId}: ${raw.length} total, ${enabled.length} ENABLED`);
            return enabled.map((g: any): AdGroupEntry => ({
                id: `${camp.customerId}__${realCampaignId}__${String(g.id)}`,
                name: g.nome || g.name || "",
                campaignName: camp.name,
                campaignId: realCampaignId,
                customerId: camp.customerId,
              }));
          } catch (err) {
            console.error(`[ADGROUPS] Erro para ${camp.id}:`, err);
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
        selectedGroups.map(async (grp): Promise<{ terms: SugestedTerm[]; rawData: any }> => {
          try {
            const body = {
              customerId: grp.customerId,
              campaignId: grp.campaignId,
              adGroupId: grp.id.split("__")[2],
              adGroupName: grp.name,
              campaignName: grp.campaignName,
            };
            console.log("[OPTIMIZE] Enviando request para grupo:", grp.name, body);
            const response = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-optimize", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" },
              body: JSON.stringify(body),
            });
            console.log(`[OPTIMIZE] Status para ${grp.name}:`, response.status);
            if (!response.ok) {
              console.error(`[OPTIMIZE] Erro HTTP para ${grp.name}:`, response.status);
              return { terms: [], rawData: null };
            }
            const text = await response.text();
            console.log(`[OPTIMIZE] Resposta raw para ${grp.name}:`, text?.substring(0, 500));
            if (!text || text.trim() === '') {
              console.warn(`[OPTIMIZE] Resposta vazia para grupo ${grp.name}`);
              return { terms: [], rawData: null };
            }
            let data: any;
            try {
              data = JSON.parse(text);
            } catch (e) {
              console.warn(`[OPTIMIZE] JSON inválido para grupo ${grp.name}:`, text);
              return { terms: [], rawData: null };
            }
            console.log("[OPTIMIZE] Parsed response for", grp.name, ":", data);
            const terms: any[] = Array.isArray(data)
              ? data
              : Array.isArray(data?.sugestoes)
              ? data.sugestoes
              : Array.isArray(data?.termos)
              ? data.termos
              : [];
            const mapped = terms.map((t: any): SugestedTerm => ({
              ...t,
              custo: t.custo,
              grupo: grp.name,
              adGroupId: grp.id.split("__")[2],
              customerId: grp.customerId,
              accountName: accounts.find((a) => a.customerId === grp.customerId)?.name || grp.customerId,
              campaignName: grp.campaignName,
              campaignId: grp.campaignId,
            }));
            return { terms: mapped, rawData: data };
          } catch (err) {
            console.error(`[OPTIMIZE] Erro geral para grupo ${grp.name}:`, err);
            return { terms: [], rawData: null };
          }
        })
      );
      const allTerms = results.flatMap((r) => r.terms);
      console.log("Total terms across all groups:", allTerms.length);
      setSuggestedTerms(allTerms);
      setSelectedTerms(new Set());
      // Extract enrichment data from last response that has it
      const lastRaw = [...results].reverse().find((r) => r.rawData && !Array.isArray(r.rawData))?.rawData;
      if (lastRaw) {
        setBenchmarks(lastRaw?.benchmarks || null);
        setPadroesSugeridos(lastRaw?.padroesSugeridos || []);
        setResumoOtimizacao(lastRaw?.resumo || null);
      }
      setStep(2);
    } catch (err: any) {
      console.error("Optimize error:", err);
      setAnalyzeError(err?.message || "Erro na análise. Tente novamente.");
      setStep(0);
    }
  }, [adGroups, selectedAdGroupIds]);

  /* ── Apply negatives (grouped by adGroup) ────────── */
  const [applyingPartial, setApplyingPartial] = useState(false);

  const sendNegatives = useCallback(async () => {
    const termsToApply = suggestedTerms.filter((t) => selectedTerms.has(`${t.adGroupId}__${t.termo}`));
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
        const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-negative", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" },
          body: JSON.stringify({ customerId: g.customerId, adGroupId: g.adGroupId, termos: g.termos }),
        });
        if (!res.ok) throw new Error("Falha ao aplicar negativações");
      })
    );
    return termsToApply.length;
  }, [suggestedTerms, selectedTerms]);

  const applyAndStay = useCallback(async () => {
    setApplyingPartial(true);
    try {
      const count = await sendNegatives();
      setAppliedCount((prev) => prev + count);
      // Remove applied terms from suggestedTerms and clear selection
      const appliedKeys = new Set([...selectedTerms]);
      setSuggestedTerms((prev) => prev.filter((t) => !appliedKeys.has(termKey(t))));
      setSelectedTerms(new Set());
    } catch {
      // stay on review
    } finally {
      setApplyingPartial(false);
    }
  }, [sendNegatives, selectedTerms]);

  const applyAndFinish = useCallback(async () => {
    setApplyingLoading(true);
    try {
      if (selectedTerms.size > 0) {
        const count = await sendNegatives();
        setAppliedCount((prev) => prev + count);
      }
      setStep(3);
    } catch {
      // stay on review
    } finally {
      setApplyingLoading(false);
    }
  }, [sendNegatives, selectedTerms]);

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

  const selectHighPriorityForAccount = (customerId: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === "alta" && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const selectAllForAccount = (customerId: string) => {
    const keys = selectableTerms.filter((t) => t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const deselectAllForAccount = (customerId: string) => {
    const keys = selectableTerms.filter((t) => t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.delete(k)); return next; });
  };

  const selectPriorityForAccount = (customerId: string, priority: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === priority && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const selectHighPriorityForCampaign = (campaignId: string, customerId: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === "alta" && t.campaignId === campaignId && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const selectAllForCampaign = (campaignId: string, customerId: string) => {
    const keys = selectableTerms.filter((t) => t.campaignId === campaignId && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const deselectAllForCampaign = (campaignId: string, customerId: string) => {
    const keys = selectableTerms.filter((t) => t.campaignId === campaignId && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.delete(k)); return next; });
  };

  const selectPriorityForCampaign = (campaignId: string, customerId: string, priority: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === priority && t.campaignId === campaignId && t.customerId === customerId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const selectHighPriorityForGroup = (adGroupId: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === "alta" && t.adGroupId === adGroupId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const selectAllForGroup = (adGroupId: string) => {
    const keys = selectableTerms.filter((t) => t.adGroupId === adGroupId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const deselectAllForGroup = (adGroupId: string) => {
    const keys = selectableTerms.filter((t) => t.adGroupId === adGroupId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.delete(k)); return next; });
  };

  const selectPriorityForGroup = (adGroupId: string, priority: string) => {
    const keys = selectableTerms.filter((t) => t.prioridade === priority && t.adGroupId === adGroupId).map(termKey);
    setSelectedTerms((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  };

  const setFilter = (levelKey: string, value: string) => {
    setPriorityFilters((prev) => ({ ...prev, [levelKey]: value }));
  };

  const getActiveFilter = (levelKey: string) => priorityFilters[levelKey] || null;

  // Get effective filter for a group (most specific wins: group > campaign > account)
  const getEffectiveFilter = (adGroupId: string, campaignId: string, customerId: string) => {
    return priorityFilters[`group_${adGroupId}`] || priorityFilters[`campaign_${campaignId}`] || priorityFilters[`account_${customerId}`] || globalFilter || null;
  };

  const selectHighPriority = () => {
    const keys = selectableTerms.filter((t) => t.prioridade === "alta").map(termKey);
    setSelectedTerms(new Set(keys));
  };

  const selectAll = () => {
    setSelectedTerms(new Set(selectableTerms.map(termKey)));
  };

  // Hierarchical grouping: Account > Campaign > AdGroup
  interface AdGroupGroup { adGroupId: string; adGroupName: string; terms: SugestedTerm[] }
  interface CampaignGroup { campaignId: string; campaignName: string; adGroups: AdGroupGroup[] }
  interface AccountGroup { customerId: string; accountName: string; campaigns: CampaignGroup[]; totalTerms: number }

  const hierarchy = useMemo<AccountGroup[]>(() => {
    const accMap = new Map<string, { accountName: string; campMap: Map<string, { campaignName: string; groupMap: Map<string, { adGroupName: string; terms: SugestedTerm[] }> }> }>();
    for (const t of suggestedTerms) {
      if (!accMap.has(t.customerId)) accMap.set(t.customerId, { accountName: t.accountName, campMap: new Map() });
      const acc = accMap.get(t.customerId)!;
      const campKey = `${t.customerId}__${t.campaignId}`;
      if (!acc.campMap.has(campKey)) acc.campMap.set(campKey, { campaignName: t.campaignName, groupMap: new Map() });
      const camp = acc.campMap.get(campKey)!;
      if (!camp.groupMap.has(t.adGroupId)) camp.groupMap.set(t.adGroupId, { adGroupName: t.grupo, terms: [] });
      camp.groupMap.get(t.adGroupId)!.terms.push(t);
    }
    return [...accMap.entries()].map(([customerId, { accountName, campMap }]) => ({
      customerId,
      accountName,
      totalTerms: [...campMap.values()].reduce((s, c) => s + [...c.groupMap.values()].reduce((s2, g) => s2 + g.terms.length, 0), 0),
      campaigns: [...campMap.entries()].map(([, { campaignName, groupMap }]) => ({
        campaignId: [...groupMap.values()][0]?.terms[0]?.campaignId || "",
        campaignName,
        adGroups: [...groupMap.entries()].map(([adGroupId, { adGroupName, terms }]) => ({ adGroupId, adGroupName, terms })),
      })),
    }));
  }, [suggestedTerms]);

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

                {/* Campaigns resumo if available */}
                {campaignsResumo && (
                  <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm">
                    {campaignsResumo?.roasGeral && (
                      <span className="text-foreground font-medium">ROAS Geral: <span className="text-primary">{campaignsResumo.roasGeral}</span></span>
                    )}
                    {(campaignsResumo?.campanhasCriticas ?? 0) > 0 && (
                      <span className="text-destructive font-medium">Campanhas Críticas: {campaignsResumo.campanhasCriticas}</span>
                    )}
                  </div>
                )}

                <MultiSelectDropdown
                  label="Campanhas"
                  placeholder="Selecione campanhas..."
                  items={campaigns.map((c) => {
                    const perfLabel = c.performance ? ` [${c.performance}]` : "";
                    const roasLabel = c.roas ? ` • ROAS: ${c.roas}` : "";
                    return { id: c.id, label: `${c.accountName} — ${c.name}${perfLabel}${roasLabel}` };
                  })}
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
                className="space-y-5 pb-[140px]"
              >
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    Sugestões de Negativação
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {globalFilter
                      ? `${globalFilter === "alta" ? "Alta" : globalFilter === "media" ? "Média" : "Baixa"} prioridade: ${suggestedTerms.filter((t) => t.prioridade === globalFilter).length} termos`
                      : `${suggestedTerms.length} termos encontrados`}{" "}
                    · {selectedTerms.size} selecionados
                  </p>
                </div>

                {/* ── Resumo da Análise ── */}
                {resumoOtimizacao && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Saúde do Grupo</h3>
                      <Badge className={
                        resumoOtimizacao.saudeDoGrupo === "boa"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : resumoOtimizacao.saudeDoGrupo === "atencao"
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-destructive/20 text-destructive border-destructive/30"
                      }>
                        {resumoOtimizacao.saudeDoGrupo === "boa" ? "Boa" : resumoOtimizacao.saudeDoGrupo === "atencao" ? "Atenção" : "Crítica"}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{resumoOtimizacao.totalSugestoes} termos para negativar</p>
                    {resumoOtimizacao.potencialEconomia && (
                      <p className="text-sm text-emerald-400">💰 Economia potencial: {resumoOtimizacao.potencialEconomia}</p>
                    )}
                  </div>
                )}

                {/* ── Benchmarks ── */}
                {benchmarks && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Benchmarks</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {benchmarks.ctrMedio && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">CTR Médio</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.ctrMedio}%</p>
                        </div>
                      )}
                      {benchmarks.cpcMedio && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">CPC Médio</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.cpcMedio}</p>
                        </div>
                      )}
                      {benchmarks.cpaMedio && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">CPA Médio</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.cpaMedio}</p>
                        </div>
                      )}
                      {benchmarks.taxaConversao && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.taxaConversao}%</p>
                        </div>
                      )}
                      {benchmarks.totalCusto && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Custo Total</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.totalCusto}</p>
                        </div>
                      )}
                      {benchmarks.totalConversoes != null && (
                        <div className="rounded-lg bg-secondary/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Conversões</p>
                          <p className="text-sm font-bold text-foreground">{benchmarks.totalConversoes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Padrões Detectados ── */}
                {padroesSugeridos?.length > 0 && (
                  <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-warning" />
                      <div>
                        <h3 className="font-semibold text-foreground">Padrões de Negativação Sugeridos</h3>
                        <p className="text-xs text-muted-foreground">Palavras que aparecem repetidamente em termos sem conversão</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {padroesSugeridos.map((padrao, idx) => (
                        <div key={idx} className="rounded-lg border border-warning/30 bg-card p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{padrao.padrao}</span>
                            {padrao.matchType && (
                              <Badge className={padrao.matchType === "EXACT" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"}>
                                {padrao.matchType}
                              </Badge>
                            )}
                          </div>
                          {padrao.motivo && <p className="text-xs text-muted-foreground">{padrao.motivo}</p>}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {padrao.termosAfetados != null && <span>{padrao.termosAfetados} termos afetados</span>}
                            {padrao.custoTotal && <span>Custo total: {padrao.custoTotal}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Global priority filter bar ── */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-secondary/80 border-2 border-primary/20">
                  <span className="text-sm font-semibold text-foreground mr-1">Filtro:</span>
                  {(["alta", "media", "baixa", "todos"] as const).map((f) => {
                    const active = globalFilter === f || (f === "todos" && globalFilter === null);
                    const labels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa", todos: "Todos" };
                    const styles: Record<string, string> = {
                      alta: active ? "bg-destructive text-destructive-foreground border-destructive shadow-md" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
                      media: active ? "bg-warning text-primary-foreground border-warning shadow-md" : "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
                      baixa: active ? "bg-secondary text-foreground border-muted-foreground shadow-md ring-1 ring-muted-foreground" : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary",
                      todos: active ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-secondary text-secondary-foreground border-border hover:bg-surface-hover",
                    };
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          if (f === "todos") {
                            if (globalFilter === null) {
                              setOpenAccounts(new Set());
                            } else {
                              setGlobalFilter(null);
                              setOpenAccounts(new Set(hierarchy.map((a) => a.customerId)));
                              setSelectedTerms(new Set());
                            }
                          } else if (globalFilter === f) {
                            setGlobalFilter(null);
                            setOpenAccounts(new Set());
                            setSelectedTerms(new Set());
                          } else {
                            setGlobalFilter(f);
                            const accountsWithPriority = new Set(
                              suggestedTerms.filter((t) => t.prioridade === f).map((t) => t.customerId)
                            );
                            setOpenAccounts(accountsWithPriority);
                            setSelectedTerms(new Set());
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all border ${styles[f]}`}
                      >
                        {labels[f]}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => { setGlobalFilter(null); setSelectedTerms(new Set()); }}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all border bg-secondary text-secondary-foreground border-border hover:bg-surface-hover"
                  >
                    Desmarcar
                  </button>
                </div>

                {hierarchy.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    Nenhuma sugestão encontrada.
                  </div>
                )}

                {/* ── Accordion per account ── */}
                {hierarchy.map((account) => {
                  const isOpen = openAccounts.has(account.customerId);
                  const effectiveFilter = globalFilter;
                  return (
                    <div key={account.customerId} className="rounded-xl border border-border overflow-hidden">
                      {/* Account header — clickable to expand */}
                      <button
                        onClick={() => setOpenAccounts((prev) => {
                          const next = new Set(prev);
                          next.has(account.customerId) ? next.delete(account.customerId) : next.add(account.customerId);
                          return next;
                        })}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-secondary/70 hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-foreground text-sm">{account.accountName}</p>
                            <p className="text-xs text-muted-foreground">{account.totalTerms} sugestões</p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Expanded content */}
                      {isOpen && (
                        <div className="divide-y divide-border">
                          {account.campaigns.map((campaign) => (
                            <div key={`${account.customerId}__${campaign.campaignId}`}>
                              {/* Campaign header */}
                              <div className="flex items-center gap-2 px-6 py-2.5 bg-secondary/30 border-b border-border/50">
                                <div className="w-1.5 h-5 rounded-full gradient-primary shrink-0" />
                                <p className="font-medium text-foreground text-sm">{campaign.campaignName}</p>
                                <span className="text-xs text-muted-foreground">
                                  ({campaign.adGroups.reduce((s, g) => s + g.terms.length, 0)})
                                </span>
                              </div>

                              {campaign.adGroups.map((adGroup) => {
                                const filteredTerms = (effectiveFilter
                                  ? adGroup.terms.filter((t) => t.prioridade === effectiveFilter)
                                  : [...adGroup.terms]
                                ).sort((a, b) => (b.impressoes ?? 0) - (a.impressoes ?? 0));
                                if (filteredTerms.length === 0) return null;
                                return (
                                  <div key={adGroup.adGroupId}>
                                    {/* Ad Group label — clickable to collapse */}
                                    <div
                                      className="flex items-center gap-2 px-8 py-2 bg-muted/20 border-b border-border/30 cursor-pointer select-none"
                                      onClick={() => setCollapsedGroups((prev) => { const next = new Set(prev); next.has(adGroup.adGroupId) ? next.delete(adGroup.adGroupId) : next.add(adGroup.adGroupId); return next; })}
                                    >
                                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${collapsedGroups.has(adGroup.adGroupId) ? "-rotate-90" : ""}`} />
                                      <p className="text-sm text-muted-foreground font-medium">{adGroup.adGroupName}</p>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{filteredTerms.length}</Badge>
                                      <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => selectAllForGroup(adGroup.adGroupId)}
                                          className="px-2 py-0.5 rounded text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                                        >
                                          Selecionar todos
                                        </button>
                                        <span className="text-border">|</span>
                                        <button
                                          onClick={() => deselectAllForGroup(adGroup.adGroupId)}
                                          className="px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                                        >
                                          Desmarcar
                                        </button>
                                      </div>
                                    </div>

                                    {/* Collapsible table */}
                                    {!collapsedGroups.has(adGroup.adGroupId) && (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-secondary/10">
                                            <TableHead className="w-10" />
                                            <TableHead>Termo de Pesquisa</TableHead>
                                            <TableHead className="text-center w-24">Impressões</TableHead>
                                            <TableHead className="text-center w-20">Cliques</TableHead>
                                            <TableHead className="text-center w-24">Conversões</TableHead>
                                            <TableHead className="min-w-[200px]">Motivo</TableHead>
                                            <TableHead className="w-24">Prioridade</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {filteredTerms.map((term) => {
                                            const hasConversions = term.conversoes > 0;
                                            const key = termKey(term);
                                            const isSelected = selectedTerms.has(key);
                                            return (
                                              <TableRow key={key} className={`${hasConversions ? "opacity-50" : "cursor-pointer"} ${isSelected ? "bg-primary/10" : ""}`} onClick={() => !hasConversions && toggleTerm(term)}>
                                                <TableCell>
                                                  <Checkbox
                                                    checked={selectedTerms.has(key)}
                                                    onCheckedChange={() => toggleTerm(term)}
                                                    disabled={hasConversions}
                                                  />
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <span className="cursor-default">{term.termo}</span>
                                                      </TooltipTrigger>
                                                      {term.motivo && (
                                                        <TooltipContent side="top" className="max-w-xs">
                                                          <p className="text-xs">{term.motivo}</p>
                                                        </TooltipContent>
                                                      )}
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </TableCell>
                                                <TableCell className="text-center">{term.impressoes?.toLocaleString("pt-BR") ?? 0}</TableCell>
                                                <TableCell className="text-center">{term.cliques ?? 0}</TableCell>
                                                <TableCell className="text-center">{term.conversoes ?? 0}</TableCell>
                                                <TableCell className="min-w-[200px]" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                                                  <span className="text-xs text-muted-foreground">{term.motivo || "—"}</span>
                                                </TableCell>
                                                <TableCell>{priorityBadge(term.prioridade)}</TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="h-20" />
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

        {/* ── Fixed footer for step 2 ─────────────── */}
        {step === 2 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-6 py-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              <button
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar à Seleção</span>
              </button>

              <p className="text-sm text-muted-foreground text-center">
                <span className="font-semibold text-foreground">{selectedTerms.size}</span>{" "}
                {selectedTerms.size === 1 ? "termo selecionado" : "termos selecionados"} de {suggestedTerms.length}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  onClick={applyAndStay}
                  disabled={selectedTerms.size === 0 || applyingPartial || applyingLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
                  whileTap={{ scale: 0.97 }}
                >
                  {applyingPartial ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Aplicar Selecionadas ({selectedTerms.size})
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={applyAndFinish}
                  disabled={applyingPartial || applyingLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  whileTap={{ scale: 0.97 }}
                >
                  {applyingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Finalizar
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Back button (step 0 only) */}
        {step === 0 && (
          <div className="mt-6">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtimizarCampanha;
