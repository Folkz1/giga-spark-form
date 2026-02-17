import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2, Pencil, Check, FolderTree, Search } from "lucide-react";
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

  useEffect(() => {
    if (!structure && selectedKeywords.length > 0) {
      fetchStructure();
    }
  }, []);

  const fetchStructure = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: selectedKeywords.filter((k) => k.selected).map((k) => k.keyword) }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Gerando estrutura da campanha...</span>
      </div>
    );
  }

  if (!structure) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Estrutura da Campanha</h2>
        <p className="text-muted-foreground">Revise e edite a organização sugerida pela IA.</p>
      </div>

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
            </div>
          )}
        </div>

        {/* Ad groups */}
        {structure.adGroups.map((group) => (
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
                    {group.keywords.map((kw, i) => (
                      <div key={i} className="text-sm text-muted-foreground py-1 flex items-center gap-2">
                        <Search className="w-3 h-3" />
                        {kw}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default StepCampaignStructure;
