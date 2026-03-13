import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampaignStructure, Briefing } from "./types";

interface StepAdPreviewProps {
  structure: CampaignStructure;
  urls: Record<string, string>;
  customerId: string;
  briefing: Briefing;
  onBriefingChange: (briefing: Briefing) => void;
  onStructureChange: (structure: CampaignStructure) => void;
}

const StepAdPreview = ({ structure, urls, customerId, briefing, onBriefingChange, onStructureChange }: StepAdPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const [regeneratingGroup, setRegeneratingGroup] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ groupId: string; type: "headline" | "description"; index: number } | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const isBriefingComplete = briefing.diferenciais.trim() !== "" && briefing.oferta.trim() !== "" && briefing.tom.trim() !== "" && briefing.proibidas.trim() !== "";

  const generateAds = async () => {
    setLoading(true);
    try {
      const requestBody = {
        customerId,
        landingPageUrl: Object.values(urls)[0] || "",
        structure,
        briefing,
      };
      console.log("API Request Body (Generate Ads):", JSON.stringify(requestBody, null, 2));
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error (Generate Ads):", res.status, errorText);
        throw new Error(`API error ${res.status}`);
      }
      const data = await res.json();
      console.log("API Response (Generate Ads):", JSON.stringify(data, null, 2));
      
      // Handle different response formats
      if (data && data.adGroups && Array.isArray(data.adGroups)) {
        onStructureChange({ ...structure, adGroups: data.adGroups });
      } else if (data && data.ads && Array.isArray(data.ads)) {
        // Response has "ads" array with groupName/headlines/descriptions
        const updatedGroups = structure.adGroups.map((g, i) => {
          const returned = data.ads[i] || data.ads.find((d: any) => d.groupName === g.name);
          if (returned) {
            return { ...g, headlines: returned.headlines || g.headlines, descriptions: returned.descriptions || g.descriptions };
          }
          return g;
        });
        onStructureChange({ ...structure, adGroups: updatedGroups });
      } else if (Array.isArray(data)) {
        const updatedGroups = structure.adGroups.map((g, i) => {
          const returned = data[i] || data.find((d: any) => d.id === g.id || d.name === g.name);
          if (returned) {
            return { ...g, headlines: returned.headlines || g.headlines, descriptions: returned.descriptions || g.descriptions };
          }
          return g;
        });
        onStructureChange({ ...structure, adGroups: updatedGroups });
      } else if (data && (data.headlines || data.descriptions)) {
        const updatedGroups = structure.adGroups.map((g, i) =>
          i === 0 ? { ...g, headlines: data.headlines || g.headlines, descriptions: data.descriptions || g.descriptions } : g
        );
        onStructureChange({ ...structure, adGroups: updatedGroups });
      } else {
        console.warn("Unexpected API response format:", data);
      }
    } catch (err) {
      console.error("Error generating ads:", err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateGroup = async (groupId: string) => {
    const group = structure.adGroups.find((g) => g.id === groupId);
    if (!group) return;

    setRegeneratingGroup(groupId);
    try {
      const requestBody = {
        customerId,
        landingPageUrl: urls[groupId] || Object.values(urls)[0] || "",
        structure: { ...structure, adGroups: [group] },
        briefing,
        ajuste: adjustments[groupId] || "",
        grupo: group.name,
      };
      console.log("API Request Body (Regenerate Group):", JSON.stringify(requestBody, null, 2));
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedGroup = Array.isArray(data?.adGroups) ? data.adGroups[0] : data;
        if (updatedGroup) {
          onStructureChange({
            ...structure,
            adGroups: structure.adGroups.map((g) =>
              g.id === groupId ? { ...g, headlines: updatedGroup.headlines || g.headlines, descriptions: updatedGroup.descriptions || g.descriptions } : g
            ),
          });
        }
      } else throw new Error();
    } catch (err) {
      console.error("Error regenerating group:", err);
    } finally {
      setRegeneratingGroup(null);
      setAdjustments((prev) => ({ ...prev, [groupId]: "" }));
    }
  };

  const updateField = (groupId: string, type: "headline" | "description", index: number, value: string) => {
    onStructureChange({
      ...structure,
      adGroups: structure.adGroups.map((g) => {
        if (g.id !== groupId) return g;
        if (type === "headline") {
          const headlines = [...(g.headlines || [])];
          headlines[index] = value;
          return { ...g, headlines };
        } else {
          const descriptions = [...(g.descriptions || [])];
          descriptions[index] = value;
          return { ...g, descriptions };
        }
      }),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Gerando anúncios com IA...</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Preview dos Anúncios</h2>
        <p className="text-muted-foreground">Preencha o briefing e revise os anúncios gerados pela IA.</p>
      </div>

      {/* Briefing Section */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Briefing da Campanha</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="diferenciais">Diferenciais da empresa</Label>
            <Textarea
              id="diferenciais"
              placeholder="Ex: 15 anos de mercado, parcelamento 12x, tecnologia alemã..."
              value={briefing.diferenciais}
              onChange={(e) => onBriefingChange({ ...briefing, diferenciais: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oferta">Oferta atual</Label>
            <Input
              id="oferta"
              placeholder="Ex: Primeira sessão com 30% off"
              value={briefing.oferta}
              onChange={(e) => onBriefingChange({ ...briefing, oferta: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tom">Tom de voz</Label>
            <Select value={briefing.tom} onValueChange={(val) => onBriefingChange({ ...briefing, tom: val })}>
              <SelectTrigger id="tom">
                <SelectValue placeholder="Selecione o tom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Profissional">Profissional</SelectItem>
                <SelectItem value="Urgência">Urgência</SelectItem>
                <SelectItem value="Emocional">Emocional</SelectItem>
                <SelectItem value="Descontraído">Descontraído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proibidas">Palavras proibidas</Label>
            <Input
              id="proibidas"
              placeholder="Ex: barato, preço baixo"
              value={briefing.proibidas}
              onChange={(e) => onBriefingChange({ ...briefing, proibidas: e.target.value })}
            />
          </div>
        </div>
        </div>
        <button
          onClick={generateAds}
          disabled={!isBriefingComplete || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Gerar Anúncios
        </button>

      {structure.adGroups.map((group) => (
        <div key={group.id} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>

          {/* Google Ad Preview Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2 max-w-xl">
            <p className="text-xs text-muted-foreground">Anúncio · {urls[group.id] || "exemplo.com.br"}</p>
            <p className="text-primary font-medium text-lg leading-snug">
              {group.headlines?.slice(0, 3).join(" | ")}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {group.descriptions?.[0]}
            </p>
          </div>

          {/* Headlines */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Títulos ({group.headlines?.length || 0}/15)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.headlines?.map((h, i) => {
                const isEditing = editingField?.groupId === group.id && editingField?.type === "headline" && editingField?.index === i;
                return (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 group">
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={h}
                          onChange={(e) => updateField(group.id, "headline", i, e.target.value)}
                          maxLength={30}
                          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                          onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                        />
                        <button onClick={() => setEditingField(null)} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground truncate">{h}</span>
                        <button onClick={() => setEditingField({ groupId: group.id, type: "headline", index: i })} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Descrições ({group.descriptions?.length || 0}/4)</p>
            <div className="space-y-2">
              {group.descriptions?.map((d, i) => {
                const isEditing = editingField?.groupId === group.id && editingField?.type === "description" && editingField?.index === i;
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 group">
                    {isEditing ? (
                      <>
                        <textarea
                          autoFocus
                          value={d}
                          onChange={(e) => updateField(group.id, "description", i, e.target.value)}
                          maxLength={90}
                          rows={2}
                          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none resize-none"
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && setEditingField(null)}
                        />
                        <button onClick={() => setEditingField(null)} className="text-primary mt-0.5"><Check className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground">{d}</span>
                        <button onClick={() => setEditingField({ groupId: group.id, type: "description", index: i })} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-group regeneration */}
          <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`adjust-${group.id}`} className="text-xs text-muted-foreground">Ajuste para este grupo</Label>
              <Input
                id={`adjust-${group.id}`}
                placeholder="Deseja ajustar este grupo? Ex: deixe mais urgente"
                value={adjustments[group.id] || ""}
                onChange={(e) => setAdjustments((prev) => ({ ...prev, [group.id]: e.target.value }))}
              />
            </div>
            <button
              onClick={() => regenerateGroup(group.id)}
              disabled={regeneratingGroup === group.id || !isBriefingComplete}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {regeneratingGroup === group.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerar
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default StepAdPreview;
