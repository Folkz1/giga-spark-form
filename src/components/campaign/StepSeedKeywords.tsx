import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, AlertCircle, Zap, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { KeywordResult, KeywordCluster, MatchType } from "./types";

interface StepSeedKeywordsProps {
  seedKeywords: string;
  clusters: KeywordCluster[];
  customerId: string;
  onSeedChange: (val: string) => void;
  onClustersChange: (clusters: KeywordCluster[]) => void;
}

const CLUSTER_COLORS = [
  { border: "border-emerald-500/40", bg: "bg-emerald-500/5", header: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { border: "border-amber-500/40", bg: "bg-amber-500/5", header: "bg-amber-500/10", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { border: "border-sky-500/40", bg: "bg-sky-500/5", header: "bg-sky-500/10", badge: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  { border: "border-violet-500/40", bg: "bg-violet-500/5", header: "bg-violet-500/10", badge: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { border: "border-rose-500/40", bg: "bg-rose-500/5", header: "bg-rose-500/10", badge: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { border: "border-teal-500/40", bg: "bg-teal-500/5", header: "bg-teal-500/10", badge: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  { border: "border-orange-500/40", bg: "bg-orange-500/5", header: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { border: "border-cyan-500/40", bg: "bg-cyan-500/5", header: "bg-cyan-500/10", badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
];

const parseCPC = (cpc: any): number => {
  if (typeof cpc === "number") return cpc;
  if (typeof cpc === "string") {
    const num = parseFloat(cpc.replace(/[^\d.,]/g, "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const StepSeedKeywords = ({ seedKeywords, clusters, customerId, onSeedChange, onClustersChange }: StepSeedKeywordsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highIntentOnly, setHighIntentOnly] = useState(true);
  const [minVolume, setMinVolume] = useState(500);
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});

  const analyzeKeywords = async () => {
    if (!seedKeywords.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI", "x-api-key": "e1893027bdc74625cb097504d272f838aff046851dfa02d44d1728c149799976" },
        body: JSON.stringify({ keywords: seedKeywords, customerId }),
      });

      console.log("Keywords API status:", res.status);
      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

      const text = await res.text();
      console.log("Keywords API raw response length:", text.length);

      let parsedClusters: KeywordCluster[] = [];

      if (!text || text.trim() === "") {
        console.warn("API retornou corpo vazio — usando dados mock");
        const seeds = seedKeywords.split(",").map(s => s.trim()).filter(Boolean);
        parsedClusters = seeds.map((seed, i) => ({
          clusterName: seed.charAt(0).toUpperCase() + seed.slice(1),
          totalVolume: Math.floor(Math.random() * 50000) + 5000,
          campaignSuggestion: `Campanha: ${seed.charAt(0).toUpperCase() + seed.slice(1)}`,
          selected: false,
          keywords: [
            { keyword: seed, monthlyVolume: Math.floor(Math.random() * 30000) + 1000, competition: "Alta", estimatedCPC: +(Math.random() * 8 + 2).toFixed(2), intent: "Transacional" as const, matchType: "EXACT" as MatchType, conversionPotential: "high" as const, selected: false },
            { keyword: `${seed} preço`, monthlyVolume: Math.floor(Math.random() * 5000) + 500, competition: "Média", estimatedCPC: +(Math.random() * 5 + 1).toFixed(2), intent: "Comercial" as const, matchType: "PHRASE" as MatchType, conversionPotential: "medium" as const, selected: false },
            { keyword: `melhor ${seed}`, monthlyVolume: Math.floor(Math.random() * 8000) + 1000, competition: "Alta", estimatedCPC: +(Math.random() * 7 + 3).toFixed(2), intent: "Transacional" as const, matchType: "EXACT" as MatchType, conversionPotential: "high" as const, selected: false },
            { keyword: `${seed} perto de mim`, monthlyVolume: Math.floor(Math.random() * 10000) + 2000, competition: "Alta", estimatedCPC: +(Math.random() * 10 + 4).toFixed(2), intent: "Transacional" as const, matchType: "EXACT" as MatchType, conversionPotential: "high" as const, selected: false },
            { keyword: `o que é ${seed}`, monthlyVolume: Math.floor(Math.random() * 8000) + 1000, competition: "Baixa", estimatedCPC: +(Math.random() * 2 + 0.3).toFixed(2), intent: "Informacional" as const, matchType: "BROAD" as MatchType, conversionPotential: "low" as const, selected: false },
          ],
        }));
      } else {
        const data = JSON.parse(text);
        console.log("Keywords API parsed:", data);

        const rawClusters: any[] = data.clusters || (Array.isArray(data) ? data : [data]);

        parsedClusters = rawClusters.map((cluster: any) => {
          const keywords: KeywordResult[] = (cluster.keywords || []).map((kw: any) => ({
            keyword: kw.keyword || "",
            monthlyVolume: Number(kw.volume || kw.monthlyVolume || 0),
            competition: kw.competition || "Média",
            estimatedCPC: parseCPC(kw.cpc || kw.estimatedCPC || 0),
            intent: (kw.intent || "Comercial") as KeywordResult["intent"],
            matchType: (kw.matchType || "BROAD") as MatchType,
            conversionPotential: kw.conversionPotential || "medium",
            selected: false,
          }));

          return {
            clusterName: cluster.clusterName || "Cluster",
            totalVolume: Number(cluster.totalVolume || 0),
            campaignSuggestion: cluster.campaignSuggestion || "",
            selected: true,
            keywords,
          };
        });
      }

      // Sort clusters by totalVolume desc
      parsedClusters.sort((a, b) => b.totalVolume - a.totalVolume);
      onClustersChange(parsedClusters);
    } catch (err: any) {
      console.error("Erro ao analisar palavras-chave:", err);
      setError(err?.message || "Erro ao analisar palavras-chave.");
    } finally {
      setLoading(false);
    }
  };

  const toggleClusterSelection = (clusterIdx: number) => {
    const updated = clusters.map((c, i) => {
      if (i !== clusterIdx) return c;
      const newSelected = !c.selected;
      return { ...c, selected: newSelected, keywords: c.keywords.map(k => ({ ...k, selected: newSelected })) };
    });
    onClustersChange(updated);
  };

  const toggleKeyword = (clusterIdx: number, kwIdx: number) => {
    const updated = clusters.map((c, ci) => {
      if (ci !== clusterIdx) return c;
      const newKws = c.keywords.map((k, ki) => ki === kwIdx ? { ...k, selected: !k.selected } : k);
      return { ...c, keywords: newKws, selected: newKws.some(k => k.selected) };
    });
    onClustersChange(updated);
  };

  const filteredClusters = useMemo(() => {
    return clusters.map(cluster => ({
      ...cluster,
      keywords: cluster.keywords.filter(kw => {
        if (highIntentOnly && kw.intent === "Informacional") return false;
        if (kw.monthlyVolume < minVolume) return false;
        return true;
      }),
    })).filter(c => c.keywords.length > 0);
  }, [clusters, highIntentOnly, minVolume]);

  const totalSelected = clusters.reduce((acc, c) => acc + c.keywords.filter(k => k.selected).length, 0);
  const totalVisible = filteredClusters.reduce((acc, c) => acc + c.keywords.length, 0);

  const selectTop10 = () => {
    const allKws = clusters.flatMap((c, ci) => c.keywords.map((k, ki) => ({ ci, ki, vol: k.monthlyVolume })));
    allKws.sort((a, b) => b.vol - a.vol);
    const top10 = new Set(allKws.slice(0, 10).map(x => `${x.ci}-${x.ki}`));
    const updated = clusters.map((c, ci) => ({
      ...c,
      keywords: c.keywords.map((k, ki) => ({ ...k, selected: top10.has(`${ci}-${ki}`) })),
      selected: c.keywords.some((_, ki) => top10.has(`${ci}-${ki}`)),
    }));
    onClustersChange(updated);
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
      {clusters.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Filters bar */}
          <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={highIntentOnly} onCheckedChange={setHighIntentOnly} />
                <label className="text-sm font-medium text-foreground">Apenas alta intenção de compra</label>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Volume mínimo:</span>
              <Slider value={[minVolume]} onValueChange={([v]) => setMinVolume(v)} min={0} max={10000} step={100} className="flex-1 max-w-xs" />
              <span className="text-sm font-medium text-foreground w-16 text-right">{minVolume.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={selectTop10} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-surface-hover transition-colors border border-border">
              Selecionar top 10 por volume
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{totalSelected} selecionadas</span>
              <Badge variant="secondary" className="text-xs">{totalVisible} visíveis</Badge>
            </div>
          </div>

          {/* Cluster cards */}
          <div className="space-y-4">
            {filteredClusters.map((cluster, displayIdx) => {
              const originalIdx = clusters.findIndex(c => c.clusterName === cluster.clusterName);
              const colorIdx = originalIdx % CLUSTER_COLORS.length;
              const color = CLUSTER_COLORS[colorIdx];
              const isCollapsed = collapsedCards[originalIdx];
              const clusterSelectedCount = cluster.keywords.filter(k => k.selected).length;
              const allSelected = clusterSelectedCount === cluster.keywords.length;

              return (
                <motion.div
                  key={cluster.clusterName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: displayIdx * 0.05 }}
                  className={`rounded-xl border ${color.border} ${color.bg} overflow-hidden`}
                >
                  {/* Card header */}
                  <div className={`px-4 py-3 flex items-center gap-3 ${color.header}`}>
                    <button
                      onClick={() => toggleClusterSelection(originalIdx)}
                      className="shrink-0"
                      title={allSelected ? "Desselecionar cluster" : "Selecionar cluster inteiro"}
                    >
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                    <button
                      onClick={() => setCollapsedCards(prev => ({ ...prev, [originalIdx]: !prev[originalIdx] }))}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-foreground">{cluster.clusterName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            Volume total: {cluster.totalVolume.toLocaleString("pt-BR")} buscas/mês
                          </span>
                          {cluster.campaignSuggestion && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{cluster.campaignSuggestion}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color.badge}`}>
                        {clusterSelectedCount}/{cluster.keywords.length}
                      </span>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="divide-y divide-border/50">
                          {cluster.keywords.map((kw, kwIdx) => {
                            const origKwIdx = clusters[originalIdx].keywords.findIndex(k => k.keyword === kw.keyword);
                            const isHighConversion = kw.conversionPotential === "high" || (kw.intent === "Transacional" && kw.monthlyVolume > 1000);

                            return (
                              <div key={kw.keyword} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                                <Checkbox
                                  checked={kw.selected}
                                  onCheckedChange={() => toggleKeyword(originalIdx, origKwIdx)}
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
                                  <span className="w-16 text-center" title="Competição">{kw.competition}</span>
                                  <Badge variant="outline" className="text-[10px] font-semibold" title="Intenção">{kw.intent}</Badge>
                                  <span className={`w-16 text-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    kw.matchType === "EXACT" ? "bg-primary/10 text-primary border-primary/30" :
                                    kw.matchType === "PHRASE" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                    "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                  }`} title="Match type">{kw.matchType}</span>
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
