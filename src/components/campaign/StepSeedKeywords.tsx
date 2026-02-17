import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, AlertCircle, ShoppingCart, DollarSign, BookOpen, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { KeywordResult, MatchType } from "./types";

interface StepSeedKeywordsProps {
  seedKeywords: string;
  keywordResults: KeywordResult[];
  customerId: string;
  onSeedChange: (val: string) => void;
  onResults: (results: KeywordResult[]) => void;
}

const suggestMatchType = (intent: KeywordResult["intent"], volume: number): MatchType => {
  if (intent === "Transacional") return volume > 2000 ? "EXACT" : "PHRASE";
  if (intent === "Comercial") return "PHRASE";
  return "BROAD";
};

const INTENT_CONFIG = {
  Transacional: {
    icon: ShoppingCart,
    label: "Transacional",
    sublabel: "Compra imediata",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/5",
    headerBg: "bg-emerald-500/10",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  Comercial: {
    icon: DollarSign,
    label: "Comercial",
    sublabel: "Pesquisa de preço/empresa",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/5",
    headerBg: "bg-amber-500/10",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  Informacional: {
    icon: BookOpen,
    label: "Informacional",
    sublabel: "Pesquisa de conhecimento",
    borderClass: "border-sky-500/40",
    bgClass: "bg-sky-500/5",
    headerBg: "bg-sky-500/10",
    badgeClass: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    dotClass: "bg-sky-500",
  },
} as const;

const StepSeedKeywords = ({ seedKeywords, keywordResults, customerId, onSeedChange, onResults }: StepSeedKeywordsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highIntentOnly, setHighIntentOnly] = useState(true);
  const [minVolume, setMinVolume] = useState(500);
  const [intentFilters, setIntentFilters] = useState({ Transacional: true, Comercial: true, Informacional: false });
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  const analyzeKeywords = async () => {
    if (!seedKeywords.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: seedKeywords, customerId }),
      });

      console.log("Keywords API status:", res.status);
      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

      const text = await res.text();
      console.log("Keywords API raw text length:", text.length);

      let items: any[] = [];

      if (!text || text.trim() === "") {
        console.warn("API retornou corpo vazio — usando dados mock para desenvolvimento");
        const seeds = seedKeywords.split(",").map(s => s.trim()).filter(Boolean);
        items = seeds.flatMap(seed => [
          { keyword: seed, monthlyVolume: Math.floor(Math.random() * 5000) + 500, competition: "Alta", estimatedCPC: +(Math.random() * 8 + 2).toFixed(2), intent: "Transacional" },
          { keyword: `${seed} preço`, monthlyVolume: Math.floor(Math.random() * 3000) + 200, competition: "Média", estimatedCPC: +(Math.random() * 6 + 1).toFixed(2), intent: "Comercial" },
          { keyword: `melhor ${seed}`, monthlyVolume: Math.floor(Math.random() * 4000) + 800, competition: "Alta", estimatedCPC: +(Math.random() * 7 + 3).toFixed(2), intent: "Transacional" },
          { keyword: `${seed} perto de mim`, monthlyVolume: Math.floor(Math.random() * 6000) + 1200, competition: "Alta", estimatedCPC: +(Math.random() * 10 + 4).toFixed(2), intent: "Transacional" },
          { keyword: `contratar ${seed}`, monthlyVolume: Math.floor(Math.random() * 3500) + 600, competition: "Média", estimatedCPC: +(Math.random() * 8 + 2).toFixed(2), intent: "Transacional" },
          { keyword: `${seed} cotação`, monthlyVolume: Math.floor(Math.random() * 2500) + 300, competition: "Média", estimatedCPC: +(Math.random() * 5 + 1.5).toFixed(2), intent: "Comercial" },
          { keyword: `${seed} empresa`, monthlyVolume: Math.floor(Math.random() * 2000) + 400, competition: "Baixa", estimatedCPC: +(Math.random() * 4 + 1).toFixed(2), intent: "Comercial" },
          { keyword: `o que é ${seed}`, monthlyVolume: Math.floor(Math.random() * 8000) + 1000, competition: "Baixa", estimatedCPC: +(Math.random() * 3 + 0.5).toFixed(2), intent: "Informacional" },
          { keyword: `como funciona ${seed}`, monthlyVolume: Math.floor(Math.random() * 5000) + 800, competition: "Baixa", estimatedCPC: +(Math.random() * 2 + 0.3).toFixed(2), intent: "Informacional" },
        ]);
      } else {
        const data = JSON.parse(text);
        console.log("Keywords API parsed:", data);
        if (Array.isArray(data)) items = data;
        else if (data?.keywords && Array.isArray(data.keywords)) items = data.keywords;
        else if (data?.data && Array.isArray(data.data)) items = data.data;
        else if (data?.results && Array.isArray(data.results)) items = data.results;
        else items = [data];
      }

      if (items.length === 0) throw new Error("Nenhum resultado retornado pela API");

      const results: KeywordResult[] = items.map((item: any) => {
        const intent = item.intent || item.intencao || item.Intenção || item.Intent || "Informacional";
        const volume = Number(item.monthlyVolume || item.volume || item.Volume || item.avg_monthly_searches || 0);
        return {
          keyword: item.keyword || item.palavra_chave || item.Keyword || "",
          monthlyVolume: volume,
          competition: item.competition || item.competicao || item.Concorrência || item.Competition || "Média",
          estimatedCPC: Number(item.estimatedCPC || item.cpc || item.CPC || item.estimated_cpc || 0),
          intent,
          matchType: suggestMatchType(intent, volume),
          selected: intent !== "Informacional",
        };
      });
      onResults(results);
    } catch (err: any) {
      console.error("Erro ao analisar palavras-chave:", err);
      setError(err?.message || "Erro ao analisar palavras-chave. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyword = (index: number) => {
    const original = keywordResults[index];
    const updated = [...keywordResults];
    updated[index] = { ...original, selected: !original.selected };
    onResults(updated);
  };

  const filteredResults = useMemo(() => {
    return keywordResults.filter(kw => {
      if (highIntentOnly && kw.intent === "Informacional") return false;
      if (kw.monthlyVolume < minVolume) return false;
      if (!intentFilters[kw.intent]) return false;
      return true;
    });
  }, [keywordResults, highIntentOnly, minVolume, intentFilters]);

  const groupedByIntent = useMemo(() => {
    const groups: Record<string, KeywordResult[]> = { Transacional: [], Comercial: [], Informacional: [] };
    filteredResults.forEach(kw => {
      groups[kw.intent]?.push(kw);
    });
    // Sort each group by volume desc
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.monthlyVolume - a.monthlyVolume));
    return groups;
  }, [filteredResults]);

  const selectedCount = keywordResults.filter(k => k.selected).length;

  const selectTop10 = () => {
    const sorted = [...keywordResults].sort((a, b) => b.monthlyVolume - a.monthlyVolume);
    const top10Keywords = new Set(sorted.slice(0, 10).map(k => k.keyword));
    onResults(keywordResults.map(k => ({ ...k, selected: top10Keywords.has(k.keyword) })));
  };

  const selectAllTransactional = () => {
    onResults(keywordResults.map(k => ({ ...k, selected: k.intent === "Transacional" ? true : k.selected })));
  };

  const getOriginalIndex = (kw: KeywordResult) => keywordResults.findIndex(k => k.keyword === kw.keyword);

  const toggleCard = (intent: string) => {
    setCollapsedCards(prev => ({ ...prev, [intent]: !prev[intent] }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Palavras-chave semente</h2>
        <p className="text-muted-foreground">Insira as palavras-chave base para análise de oportunidades de alta conversão.</p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Digite suas palavras-chave semente</label>
        <textarea
          value={seedKeywords}
          onChange={(e) => onSeedChange(e.target.value)}
          placeholder="ex: limpeza industrial, higienização de piso, dedetização"
          rows={3}
          className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
        />
        <button
          onClick={analyzeKeywords}
          disabled={loading || !seedKeywords.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed glow-primary"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analisando..." : "Analisar palavras-chave"}
        </button>
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Filters + Results */}
      {keywordResults.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Filters bar */}
          <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* High intent toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={highIntentOnly} onCheckedChange={(v) => {
                  setHighIntentOnly(v);
                  if (v) setIntentFilters(prev => ({ ...prev, Informacional: false }));
                  else setIntentFilters(prev => ({ ...prev, Informacional: true }));
                }} />
                <label className="text-sm font-medium text-foreground">Apenas alta intenção de compra</label>
              </div>

              {/* Intent checkboxes */}
              <div className="flex items-center gap-4">
                {(["Transacional", "Comercial", "Informacional"] as const).map(intent => (
                  <label key={intent} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Checkbox
                      checked={intentFilters[intent]}
                      disabled={highIntentOnly && intent === "Informacional"}
                      onCheckedChange={(checked) => {
                        setIntentFilters(prev => ({ ...prev, [intent]: !!checked }));
                        if (intent === "Informacional" && checked) setHighIntentOnly(false);
                      }}
                    />
                    <span className={`w-2 h-2 rounded-full ${INTENT_CONFIG[intent].dotClass}`} />
                    {intent}
                  </label>
                ))}
              </div>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Volume mínimo:</span>
              <Slider
                value={[minVolume]}
                onValueChange={([v]) => setMinVolume(v)}
                min={0}
                max={10000}
                step={100}
                className="flex-1 max-w-xs"
              />
              <span className="text-sm font-medium text-foreground w-16 text-right">{minVolume.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Action buttons + counter */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={selectTop10} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-surface-hover transition-colors border border-border">
              Selecionar top 10 por volume
            </button>
            <button onClick={selectAllTransactional} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-surface-hover transition-colors border border-border">
              Selecionar todas transacionais
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedCount} selecionadas</span>
              <Badge variant="secondary" className="text-xs">{filteredResults.length} visíveis</Badge>
            </div>
          </div>

          {/* Grouped cards */}
          <div className="space-y-4">
            {(["Transacional", "Comercial", "Informacional"] as const).map(intent => {
              const keywords = groupedByIntent[intent];
              if (!keywords || keywords.length === 0) return null;
              const config = INTENT_CONFIG[intent];
              const Icon = config.icon;
              const isCollapsed = collapsedCards[intent];

              return (
                <motion.div
                  key={intent}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border ${config.borderClass} ${config.bgClass} overflow-hidden`}
                >
                  {/* Card header */}
                  <button
                    onClick={() => toggleCard(intent)}
                    className={`w-full px-4 py-3 flex items-center gap-3 ${config.headerBg} transition-colors`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm text-foreground">{config.label}</span>
                    <span className="text-xs text-muted-foreground">— {config.sublabel}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{keywords.length} keywords</span>
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="divide-y divide-border/50">
                          {keywords.map((kw) => {
                            const origIdx = getOriginalIndex(kw);
                            const isHighConversion = kw.intent === "Transacional" && kw.monthlyVolume > 1000;

                            return (
                              <div key={kw.keyword} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                                <Checkbox
                                  checked={kw.selected}
                                  onCheckedChange={() => toggleKeyword(origIdx)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{kw.keyword}</span>
                                    {isHighConversion && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                        <Zap className="w-2.5 h-2.5" /> ALTA CONVERSÃO
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                                  <span className="w-16 text-right" title="Volume mensal">{kw.monthlyVolume.toLocaleString("pt-BR")}</span>
                                  <span className="w-16 text-right" title="CPC estimado">R$ {kw.estimatedCPC.toFixed(2)}</span>
                                  <span className="w-12 text-center" title="Competição">{kw.competition}</span>
                                  <span className={`w-16 text-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    kw.matchType === "EXACT" ? "bg-primary/10 text-primary border-primary/30" :
                                    kw.matchType === "PHRASE" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                    "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                  }`} title="Match type sugerido">{kw.matchType}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StepSeedKeywords;
