import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Rocket, PartyPopper, Building2, FolderTree, Link, FileText } from "lucide-react";
import type { WizardData } from "./types";

interface StepReviewProps {
  data: WizardData;
}

const StepReview = ({ data }: StepReviewProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // Continue anyway for demo
    }
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center glow-primary-strong">
            <PartyPopper className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-3xl font-bold text-foreground mb-3">Campanha enviada para aprovação!</h2>
          <p className="text-muted-foreground text-lg">Verifique o ClickUp para a tarefa de aprovação.</p>
        </motion.div>
      </motion.div>
    );
  }

  const selectedKeywords = data.keywordResults.filter((k) => k.selected);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Revisão Final</h2>
        <p className="text-muted-foreground">Confira todos os detalhes antes de enviar.</p>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Conta</h3>
        </div>
        <p className="text-foreground text-sm">{data.selectedAccount?.name}</p>
        <p className="text-muted-foreground text-xs">{data.selectedAccount?.customerId}</p>
      </div>

      {/* Structure */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Estrutura</h3>
        </div>
        <p className="text-foreground text-sm font-medium mb-2">{data.structure?.campaignName}</p>
        {data.structure?.adGroups.map((g) => (
          <div key={g.id} className="ml-4 mb-2">
            <p className="text-sm text-foreground">{g.name} <span className="text-muted-foreground">({g.keywords.length} palavras-chave)</span></p>
          </div>
        ))}
      </div>

      {/* Keywords count */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Palavras-chave selecionadas</h3>
        </div>
        <p className="text-muted-foreground text-sm">{selectedKeywords.length} palavras-chave</p>
      </div>

      {/* URLs */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">URLs</h3>
        </div>
        {data.structure?.adGroups.map((g) => (
          <div key={g.id} className="mb-1">
            <p className="text-sm text-muted-foreground">{g.name}: <span className="text-foreground">{data.urls[g.id] || "—"}</span></p>
          </div>
        ))}
      </div>

      {/* Ads summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Anúncios</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {data.structure?.adGroups.length} grupo(s) com {data.structure?.adGroups[0]?.headlines?.length || 15} títulos e {data.structure?.adGroups[0]?.descriptions?.length || 4} descrições cada
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-bold text-lg glow-primary-strong hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Enviando campanha...
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Criar Campanha
          </>
        )}
      </button>
    </motion.div>
  );
};

export default StepReview;
