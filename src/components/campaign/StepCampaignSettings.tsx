import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Copy, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Configuracoes, ConversaoOption, RegiaoOption } from "./types";

interface StepCampaignSettingsProps {
  customerId: string;
  configuracoes: Configuracoes;
  onConfiguracaoChange: (config: Configuracoes) => void;
}

interface ExistingCampaign {
  id: string;
  nome: string;
  tipo?: string;
  status?: string;
  orcamentoDiario?: string;
  estrategiaLance?: string;
  metaCPA?: string;
  roasAlvo?: string;
}

const StepCampaignSettings = ({ customerId, configuracoes, onConfiguracaoChange }: StepCampaignSettingsProps) => {
  const [mode, setMode] = useState<"copy" | "manual" | null>(configuracoes._mode || null);
  const [campaigns, setCampaigns] = useState<ExistingCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(configuracoes._copiedFrom || "");

  const [conversions, setConversions] = useState<ConversaoOption[]>([]);
  const [regions, setRegions] = useState<RegiaoOption[]>([]);
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);

  useEffect(() => {
    if (mode === "copy" && campaigns.length === 0) {
      fetchCampaigns();
    }
  }, [mode]);

  useEffect(() => {
    if (mode && conversions.length === 0) fetchConversions();
    if (mode && regions.length === 0) fetchRegions();
  }, [mode]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch(`https://appn8o2.gigainteligencia.com.br/webhook/google-ads-campaigns?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        const list: ExistingCampaign[] = Array.isArray(data) ? data : data.campaigns || [];
        setCampaigns(list);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchConversions = async () => {
    setLoadingConversions(true);
    try {
      const res = await fetch(`https://appn8o2.gigainteligencia.com.br/webhook/google-ads-conversions?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setConversions(Array.isArray(data) ? data : data.conversions || []);
      }
    } catch (err) {
      console.error("Error fetching conversions:", err);
    } finally {
      setLoadingConversions(false);
    }
  };

  const fetchRegions = async () => {
    setLoadingRegions(true);
    try {
      const res = await fetch(`https://appn8o2.gigainteligencia.com.br/webhook/google-ads-regions?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setRegions(Array.isArray(data) ? data : data.regions || []);
      }
    } catch (err) {
      console.error("Error fetching regions:", err);
    } finally {
      setLoadingRegions(false);
    }
  };

  const handleCopyCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      onConfiguracaoChange({
        ...configuracoes,
        orcamentoDiario: campaign.orcamentoDiario || configuracoes.orcamentoDiario,
        estrategiaLance: campaign.estrategiaLance || configuracoes.estrategiaLance,
        metaCPA: campaign.metaCPA || configuracoes.metaCPA,
        _mode: "copy",
        _copiedFrom: campaignId,
      });
    }
  };

  const handleModeSelect = (m: "copy" | "manual") => {
    setMode(m);
    onConfiguracaoChange({ ...configuracoes, _mode: m });
  };

  const update = (field: keyof Configuracoes, value: string | ConversaoOption | RegiaoOption | null) => {
    onConfiguracaoChange({ ...configuracoes, [field]: value });
  };

  const showCpaField = configuracoes.estrategiaLance === "CPA Alvo";

  if (!mode) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Configurações da Campanha</h2>
          <p className="text-muted-foreground">Deseja copiar a estrutura de uma campanha existente?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleModeSelect("copy")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-secondary transition-colors group"
          >
            <Copy className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold text-foreground">Sim, copiar</span>
            <span className="text-xs text-muted-foreground text-center">Copiar configurações de uma campanha existente</span>
          </button>
          <button
            onClick={() => handleModeSelect("manual")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-secondary transition-colors group"
          >
            <Settings2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold text-foreground">Não, configurar manualmente</span>
            <span className="text-xs text-muted-foreground text-center">Definir todas as configurações do zero</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Configurações da Campanha</h2>
          <p className="text-muted-foreground">
            {mode === "copy" ? "Selecione uma campanha para copiar as configurações." : "Preencha as configurações manualmente."}
          </p>
        </div>
        <button
          onClick={() => { setMode(null); }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Alterar modo
        </button>
      </div>

      {mode === "copy" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Label>Campanha existente</Label>
          {loadingCampaigns ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando campanhas...
            </div>
          ) : (
            <Select value={selectedCampaignId} onValueChange={handleCopyCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {(mode === "manual" || (mode === "copy" && selectedCampaignId)) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de campanha</Label>
              <Select value={configuracoes.tipoCampanha} onValueChange={(v) => update("tipoCampanha", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Search">Search</SelectItem>
                  <SelectItem value="Performance Max">Performance Max</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Orçamento diário (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={configuracoes.orcamentoDiario}
                onChange={(e) => update("orcamentoDiario", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estratégia de lance</Label>
              <Select value={configuracoes.estrategiaLance} onValueChange={(v) => update("estrategiaLance", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maximizar Conversões">Maximizar Conversões</SelectItem>
                  <SelectItem value="CPA Alvo">CPA Alvo</SelectItem>
                  <SelectItem value="Maximizar Cliques">Maximizar Cliques</SelectItem>
                  <SelectItem value="ROAS Alvo">ROAS Alvo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCpaField && (
              <div className="space-y-1.5">
                <Label>Meta de CPA (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 30"
                  value={configuracoes.metaCPA}
                  onChange={(e) => update("metaCPA", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Conversão</Label>
              {loadingConversions ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm h-10">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <Select
                  value={configuracoes.conversao?.id || ""}
                  onValueChange={(id) => {
                    const selected = conversions.find((c) => c.id === id) || null;
                    update("conversao", selected);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a conversão" /></SelectTrigger>
                  <SelectContent>
                    {conversions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Região</Label>
              {loadingRegions ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm h-10">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <Select
                  value={configuracoes.regiao?.id || ""}
                  onValueChange={(id) => {
                    const selected = regions.find((r) => r.id === id) || null;
                    update("regiao", selected);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a região" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select value={configuracoes.idioma} onValueChange={(v) => update("idioma", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Português">Português</SelectItem>
                  <SelectItem value="Inglês">Inglês</SelectItem>
                  <SelectItem value="Espanhol">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StepCampaignSettings;
