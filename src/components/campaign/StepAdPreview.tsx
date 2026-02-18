import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampaignStructure } from "./types";

interface Briefing {
  diferenciais: string;
  oferta: string;
  tom: string;
  proibidas: string;
}

interface StepAdPreviewProps {
  structure: CampaignStructure;
  urls: Record<string, string>;
  onStructureChange: (structure: CampaignStructure) => void;
}

const StepAdPreview = ({ structure, urls, onStructureChange }: StepAdPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const [regeneratingGroup, setRegeneratingGroup] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ groupId: string; type: "headline" | "description"; index: number } | null>(null);
  const [briefing, setBriefing] = useState<Briefing>({ diferenciais: "", oferta: "", tom: "Profissional", proibidas: "" });
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  useEffect(() => {
    const hasAds = structure.adGroups.some((g) => g.headlines && g.headlines.length > 0);
    if (!hasAds) generateAds();
  }, []);

  const generateAds = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "",
          landingPageUrl: Object.values(urls)[0] || "",
          structure,
          briefing,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onStructureChange(data);
      } else throw new Error();
    } catch {
      // Mock fallback
      const updated: CampaignStructure = {
        ...structure,
        adGroups: structure.adGroups.map((group) => ({
          ...group,
          headlines: Array.from({ length: 15 }, (_, i) => {
            const templates = [
              `${group.name} Profissional`, `Orçamento Grátis Hoje`, `Serviço Especializado`,
              `Melhor Preço da Região`, `Atendimento 24h`, `Qualidade Garantida`,
              `Equipe Certificada`, `Ligue Agora`, `Desconto Especial`,
              `Referência no Mercado`, `Mais de 10 Anos`, `Satisfação Total`,
              `Resultado Imediato`, `Agende Sua Visita`, `Empresa Confiável`,
            ];
            return templates[i] || `Título ${i + 1}`;
          }),
          descriptions: [
            `Serviço de ${group.keywords[0] || "limpeza"} com profissionais treinados. Solicite seu orçamento sem compromisso agora mesmo!`,
            `A melhor empresa de ${group.keywords[0] || "limpeza"} da região. Preços competitivos e qualidade garantida. Ligue já!`,
            `Precisa de ${group.keywords[0] || "limpeza"}? Somos especialistas com mais de 10 anos de experiência. Atendemos toda a região.`,
            `Contrate nosso serviço de ${group.keywords[0] || "limpeza"} e ganhe 10% de desconto no primeiro orçamento. Confira!`,
          ],
        })),
      };
      onStructureChange(updated);
    } finally {
      setLoading(false);
    }
  };

  const regenerateGroup = async (groupId: string) => {
    const group = structure.adGroups.find((g) => g.id === groupId);
    if (!group) return;

    setRegeneratingGroup(groupId);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "",
          landingPageUrl: urls[groupId] || Object.values(urls)[0] || "",
          structure: { ...structure, adGroups: [group] },
          briefing,
          ajuste: adjustments[groupId] || "",
          grupo: group.name,
        }),
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
    } catch {
      // Mock: just shuffle existing headlines
      onStructureChange({
        ...structure,
        adGroups: structure.adGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            headlines: [...(g.headlines || [])].sort(() => Math.random() - 0.5),
            descriptions: [...(g.descriptions || [])].sort(() => Math.random() - 0.5),
          };
        }),
      });
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
              onChange={(e) => setBriefing((b) => ({ ...b, diferenciais: e.target.value }))}
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
              onChange={(e) => setBriefing((b) => ({ ...b, oferta: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tom">Tom de voz</Label>
            <Select value={briefing.tom} onValueChange={(val) => setBriefing((b) => ({ ...b, tom: val }))}>
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
              onChange={(e) => setBriefing((b) => ({ ...b, proibidas: e.target.value }))}
            />
          </div>
        </div>
      </div>

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
              disabled={regeneratingGroup === group.id}
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
