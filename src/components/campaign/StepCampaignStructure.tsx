import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2, Pencil, Check, FolderTree, Search, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CampaignStructure, KeywordResult } from "./types";

interface StepCampaignStructureProps {
  selectedKeywords: KeywordResult[];
  structure: CampaignStructure | null;
  onStructureChange: (structure: CampaignStructure) => void;
}

const StepCampaignStructure = ({ selectedKeywords, structure, onStructureChange }: StepCampaignStructureProps) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingCampaign, setEditingCampaign] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  // Structure is now always created by autoGroupByClusters in CampaignWizard
  // Only fetch from API if structure wasn't provided
  useEffect(() => {
    if (!structure && selectedKeywords.length > 0) {
      fetchStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure]);

  const fetchStructure = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" },
        body: JSON.stringify({
          campaignName: "Campanha - Serviços",
          customerId: "",
          keywords: selectedKeywords.filter((k) => k.selected).map((k) => ({ keyword: k.keyword, intent: k.intent })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onStructureChange(data);
      } else throw new Error();
    } catch {
      // Mock
      const keywords = selectedKeywords.filter((k) => k.selected).map((k) => k.keyword);
      const groups: CampaignStructure["adGroups"] = [];
      const chunkSize = Math.max(2, Math.ceil(keywords.length / 3));
      for (let i = 0; i < keywords.length; i += chunkSize) {
        const chunk = keywords.slice(i, i + chunkSize);
        groups.push({
          id: `group-${i}`,
          name: `Grupo - ${chunk[0]?.charAt(0).toUpperCase()}${chunk[0]?.slice(1) || ""}`,
          keywords: chunk,
        });
      }
      const mock: CampaignStructure = {
        campaignName: "Campanha - Serviços de Limpeza",
        adGroups: groups,
      };
      onStructureChange(mock);
      const exp: Record<string, boolean> = {};
      groups.forEach((g) => (exp[g.id] = true));
      setExpanded(exp);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renameCampaign = (name: string) => {
    if (structure) onStructureChange({ ...structure, campaignName: name });
  };

  const renameGroup = (groupId: string, name: string) => {
    if (!structure) return;
    onStructureChange({
      ...structure,
      adGroups: structure.adGroups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    });
  };

  const getKwText = (kw: any): string => typeof kw === 'string' ? kw : kw?.keyword || '';

  const intentBadge = (intent?: string) => {
    if (!intent) return null;
    const lower = intent.toLowerCase();
    if (lower.includes('transac')) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Transacional</Badge>;
    if (lower.includes('comerc')) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Comercial</Badge>;
    if (lower.includes('inform')) return <Badge className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0.5 rounded-full font-medium">Informacional</Badge>;
    return null;
  };

  const matchTypeBadge = (matchType?: string) => {
    if (!matchType) return null;
    switch (matchType) {
      case "EXACT": return <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1 py-0.5 rounded font-medium ml-2">[Exata]</span>;
      case "PHRASE": return <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1 py-0.5 rounded font-medium ml-2">[Frase]</span>;
      case "BROAD": return <span className="bg-warning/20 text-warning text-[10px] px-1 py-0.5 rounded font-medium ml-2">[Ampla]</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Gerando estrutura da campanha...</span>
      </div>
    );
  }

  if (!structure) return null;

  const totalKeywords = structure.adGroups.reduce((s, g) => s + g.keywords.length, 0);
  const insights = (structure as any)?.insights;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Estrutura da Campanha</h2>
        <p className="text-muted-foreground">Revise e edite a organização sugerida pela IA.</p>
      </div>

      {/* Insights card */}
      {insights && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Insights da Clusterização</h4>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {insights?.topOpportunity && (
              <span>Maior oportunidade: <span className="text-foreground font-medium">{insights.topOpportunity}</span></span>
            )}
            {insights?.estimatedMonthlyBudget && (
              <span>Budget estimado: <span className="text-foreground font-medium">{insights.estimatedMonthlyBudget}</span></span>
            )}
            {insights?.recommendedCampaignCount != null && (
              <span>Campanhas recomendadas: <span className="text-foreground font-medium">{insights.recommendedCampaignCount}</span></span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        {/* Campaign name */}
        <div className="px-5 py-4 bg-secondary flex items-center gap-3">
          <FolderTree className="w-5 h-5 text-primary" />
          {editingCampaign ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={structure.campaignName}
                onChange={(e) => renameCampaign(e.target.value)}
                className="flex-1 bg-muted rounded-md px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && setEditingCampaign(false)}
              />
              <button onClick={() => setEditingCampaign(false)} className="text-primary"><Check className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-foreground">{structure.campaignName}</span>
              <button onClick={() => setEditingCampaign(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <span className="ml-auto text-xs text-muted-foreground">{structure.adGroups.length} grupos · {totalKeywords} palavras-chave</span>
            </div>
          )}
        </div>

        {/* Ad groups */}
        {structure.adGroups.map((group) => {
          const groupAny = group as any;
          return (
          <div key={group.id} className="border-t border-border">
            <button
              onClick={() => toggleExpand(group.id)}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
            >
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded[group.id] ? "rotate-90" : ""}`} />
              {editingGroup === group.id ? (
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={group.name}
                    onChange={(e) => renameGroup(group.id, e.target.value)}
                    className="flex-1 bg-muted rounded-md px-3 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => e.key === "Enter" && setEditingGroup(null)}
                  />
                  <button onClick={() => setEditingGroup(null)} className="text-primary"><Check className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-foreground text-sm">{group.name}</span>
                  {intentBadge(groupAny?.intent || groupAny?.primaryIntent)}
                  {groupAny?.totalVolume > 0 && (
                    <span className="text-xs text-muted-foreground">Vol: {groupAny.totalVolume.toLocaleString()}</span>
                  )}
                  {groupAny?.avgCPC > 0 && (
                    <span className="text-xs text-muted-foreground">CPC: R$ {Number(groupAny.avgCPC).toFixed(2)}</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group.id); }} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <span className="ml-auto text-xs text-muted-foreground">{group.keywords.length} palavras-chave</span>
                </div>
              )}
            </button>
            <AnimatePresence>
              {expanded[group.id] && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-12 pb-3 space-y-1">
                    {group.keywords.map((kw: any, i: number) => {
                      const kwText = getKwText(kw);
                      const isObj = typeof kw !== 'string';
                      return (
                        <div key={i} className="text-sm text-muted-foreground py-1 flex items-center gap-2">
                          <Search className="w-3 h-3 shrink-0" />
                          <span>{kwText}</span>
                          {isObj && matchTypeBadge(kw?.matchType)}
                          {isObj && kw?.volume > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">{kw.volume.toLocaleString()} buscas/mês</span>
                          )}
                          {isObj && kw?.cpc > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">CPC: R$ {Number(kw.cpc).toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default StepCampaignStructure;
