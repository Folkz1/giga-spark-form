import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "./ProgressBar";
import StepAccountSelection from "./StepAccountSelection";
import StepSeedKeywords from "./StepSeedKeywords";
import StepCampaignStructure from "./StepCampaignStructure";
import StepURLs from "./StepURLs";
import StepCampaignSettings from "./StepCampaignSettings";
import StepAdPreview from "./StepAdPreview";
import StepReview from "./StepReview";
import type { Account, KeywordResult, KeywordCluster, CampaignStructure, Briefing, Configuracoes, WizardData } from "./types";

const CampaignWizard = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    selectedAccount: null,
    seedKeywords: "",
    keywordResults: [],
    clusters: [],
    structure: null,
    urls: {},
    configuracoes: {
      tipoCampanha: "Search",
      orcamentoDiario: "",
      estrategiaLance: "",
      metaCPA: "",
      conversao: "",
      regiao: "",
      idioma: "Português",
    },
    briefing: { diferenciais: "", oferta: "", tom: "Profissional", proibidas: "" },
  });

  const allSelectedKeywords = data.clusters.flatMap(c => c.keywords.filter(k => k.selected));

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!data.selectedAccount;
      case 1: return allSelectedKeywords.length > 0;
      case 2: return !!data.structure;
      case 3: return data.structure?.adGroups.every((g) => !!data.urls[g.id]) ?? false;
      case 4: {
        const c = data.configuracoes;
        return c.tipoCampanha !== "" && c.orcamentoDiario !== "" && c.estrategiaLance !== "" && c.regiao !== "" && c.idioma !== "";
      }
      case 5: return data.structure?.adGroups.every((g) => g.headlines && g.headlines.length > 0) ?? false;
      default: return true;
    }
  };

  const totalSteps = 7;

  const autoGroupByClusters = () => {
    const adGroups = data.clusters
      .filter(c => c.keywords.some(k => k.selected))
      .map((cluster, i) => ({
        id: `group-${i}`,
        name: cluster.campaignSuggestion || cluster.clusterName,
        keywords: cluster.keywords.filter(k => k.selected).map(k => k.keyword),
      }));

    const structure: CampaignStructure = {
      campaignName: `Campanha - ${data.seedKeywords.split(",")[0]?.trim() || "Nova"}`,
      adGroups,
    };

    const selectedOnly = data.clusters.flatMap(c => c.keywords.filter(k => k.selected));
    setData(prev => ({ ...prev, structure, keywordResults: selectedOnly }));
  };

  const handleNext = () => {
    if (step === 1) {
      autoGroupByClusters();
    }
    setStep(s => Math.min(totalSteps - 1, s + 1));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Giga</span>{" "}
            <span className="text-foreground">Aceleradora</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Criação inteligente de campanhas Google Ads</p>
        </div>

        <ProgressBar currentStep={step} />

        <div className="glass-card rounded-2xl p-6 sm:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepAccountSelection
                key="step-0"
                selectedAccount={data.selectedAccount}
                onSelect={(account: Account) => setData((prev) => ({ ...prev, selectedAccount: account }))}
              />
            )}
            {step === 1 && (
              <StepSeedKeywords
                key="step-1"
                seedKeywords={data.seedKeywords}
                clusters={data.clusters}
                customerId={data.selectedAccount?.customerId || ""}
                onSeedChange={(val: string) => setData((prev) => ({ ...prev, seedKeywords: val }))}
                onClustersChange={(clusters: KeywordCluster[]) => setData((prev) => ({ ...prev, clusters }))}
              />
            )}
            {step === 2 && (
              <StepCampaignStructure
                key="step-2"
                selectedKeywords={data.keywordResults}
                structure={data.structure}
                onStructureChange={(structure: CampaignStructure) => setData((prev) => ({ ...prev, structure }))}
              />
            )}
            {step === 3 && data.structure && (
              <StepURLs
                key="step-3"
                structure={data.structure}
                urls={data.urls}
                onUrlChange={(groupId: string, url: string) => setData((prev) => ({ ...prev, urls: { ...prev.urls, [groupId]: url } }))}
              />
            )}
            {step === 4 && (
              <StepCampaignSettings
                key="step-4"
                customerId={data.selectedAccount?.customerId || ""}
                configuracoes={data.configuracoes}
                onConfiguracaoChange={(configuracoes: Configuracoes) => setData((prev) => ({ ...prev, configuracoes }))}
              />
            )}
            {step === 5 && data.structure && (
              <StepAdPreview
                key="step-5"
                structure={data.structure}
                urls={data.urls}
                customerId={data.selectedAccount?.customerId || ""}
                briefing={data.briefing}
                onBriefingChange={(briefing: Briefing) => setData((prev) => ({ ...prev, briefing }))}
                onStructureChange={(structure: CampaignStructure) => setData((prev) => ({ ...prev, structure }))}
              />
            )}
            {step === 6 && (
              <StepReview key="step-6" data={data} />
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {step < totalSteps - 1 && (
            <motion.button
              onClick={handleNext}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
              whileTap={{ scale: 0.97 }}
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
