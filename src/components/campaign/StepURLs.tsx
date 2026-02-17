import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import type { CampaignStructure } from "./types";

interface StepURLsProps {
  structure: CampaignStructure;
  urls: Record<string, string>;
  onUrlChange: (groupId: string, url: string) => void;
}

const StepURLs = ({ structure, urls, onUrlChange }: StepURLsProps) => {
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  const testUrl = async (groupId: string) => {
    const url = urls[groupId];
    if (!url) return;
    setTesting((prev) => ({ ...prev, [groupId]: true }));
    setTestResults((prev) => ({ ...prev, [groupId]: undefined as any }));

    // Simulate URL test
    await new Promise((r) => setTimeout(r, 1200));
    const isValid = url.startsWith("http://") || url.startsWith("https://");
    setTestResults((prev) => ({ ...prev, [groupId]: isValid ? "success" : "error" }));
    setTesting((prev) => ({ ...prev, [groupId]: false }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">URLs de Destino</h2>
        <p className="text-muted-foreground">Defina a URL de destino para cada grupo de anúncios.</p>
      </div>

      <div className="space-y-4">
        {structure.adGroups.map((group) => (
          <div key={group.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <label className="text-sm font-medium text-foreground">{group.name}</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="url"
                  value={urls[group.id] || ""}
                  onChange={(e) => onUrlChange(group.id, e.target.value)}
                  placeholder="https://exemplo.com.br/pagina"
                  className="w-full rounded-lg bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pr-10"
                />
                {testResults[group.id] && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {testResults[group.id] === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => testUrl(group.id)}
                disabled={!urls[group.id] || testing[group.id]}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {testing[group.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Testar
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default StepURLs;
