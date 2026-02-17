import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Sparkles } from "lucide-react";
import type { KeywordResult } from "./types";

interface StepSeedKeywordsProps {
  seedKeywords: string;
  keywordResults: KeywordResult[];
  customerId: string;
  onSeedChange: (val: string) => void;
  onResults: (results: KeywordResult[]) => void;
}

const StepSeedKeywords = ({ seedKeywords, keywordResults, customerId, onSeedChange, onResults }: StepSeedKeywordsProps) => {
  const [loading, setLoading] = useState(false);

  const analyzeKeywords = async () => {
    if (!seedKeywords.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: seedKeywords, customerId }),
      });
      if (res.ok) {
        const data = await res.json();
        onResults(data);
      } else {
        throw new Error();
      }
    } catch {
      // Mock data
      const seeds = seedKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const intents: KeywordResult["intent"][] = ["Transacional", "Comercial", "Informacional"];
      const competitions: KeywordResult["competition"][] = ["Alta", "Média", "Baixa"];
      const mockResults: KeywordResult[] = seeds.flatMap((seed, i) => [
        {
          keyword: seed,
          monthlyVolume: Math.floor(Math.random() * 10000) + 500,
          competition: competitions[i % 3],
          estimatedCPC: parseFloat((Math.random() * 8 + 1).toFixed(2)),
          intent: intents[i % 3],
          selected: intents[i % 3] !== "Informacional",
        },
        {
          keyword: `${seed} preço`,
          monthlyVolume: Math.floor(Math.random() * 5000) + 200,
          competition: "Média",
          estimatedCPC: parseFloat((Math.random() * 6 + 2).toFixed(2)),
          intent: "Comercial" as const,
          selected: true,
        },
        {
          keyword: `${seed} empresa`,
          monthlyVolume: Math.floor(Math.random() * 3000) + 100,
          competition: "Baixa",
          estimatedCPC: parseFloat((Math.random() * 4 + 1).toFixed(2)),
          intent: "Transacional" as const,
          selected: true,
        },
      ]);
      onResults(mockResults);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyword = (index: number) => {
    const updated = [...keywordResults];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    onResults(updated);
  };

  const intentColor = (intent: KeywordResult["intent"]) => {
    switch (intent) {
      case "Transacional": return "text-primary bg-primary/10";
      case "Comercial": return "text-warning bg-warning/10";
      case "Informacional": return "text-muted-foreground bg-muted";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Palavras-chave semente</h2>
        <p className="text-muted-foreground">Insira as palavras-chave base para análise de oportunidades.</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Digite suas palavras-chave semente</label>
        <textarea
          value={seedKeywords}
          onChange={(e) => onSeedChange(e.target.value)}
          placeholder="ex: limpeza industrial, higienização de piso, dedetização"
          rows={4}
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
      </div>

      {keywordResults.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10"></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Palavra-chave</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Volume Mensal</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Competição</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">CPC Est.</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Intenção</th>
              </tr>
            </thead>
            <tbody>
              {keywordResults.map((kw, i) => (
                <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={kw.selected}
                      onChange={() => toggleKeyword(i)}
                      className="rounded border-border accent-primary w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{kw.keyword}</td>
                  <td className="px-4 py-3 text-right text-foreground">{kw.monthlyVolume.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-center text-foreground">{kw.competition}</td>
                  <td className="px-4 py-3 text-right text-foreground">R$ {kw.estimatedCPC.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${intentColor(kw.intent)}`}>
                      {kw.intent}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StepSeedKeywords;
