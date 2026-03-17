import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileBarChart, AlertTriangle, ChevronRight, RefreshCw, Inbox, DollarSign, Users, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBatches, formatCurrency, formatNumber, formatDate, type Batch } from "@/lib/relatorios-utils";

const Relatorios = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBatches();
      setBatches(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const scoreBadge = (label: string, count: number, color: string) => {
    if (count === 0) return null;
    const colors: Record<string, string> = {
      red: "bg-red-500/15 text-red-400 border-red-500/25",
      yellow: "bg-amber-500/15 text-amber-400 border-amber-500/25",
      green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    };
    return (
      <Badge className={`text-xs px-2.5 py-1 ${colors[color]} font-semibold`}>
        {count} {label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FileBarChart className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios Semanais</h1>
            <p className="text-sm text-muted-foreground">Análises automáticas geradas toda segunda-feira</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-medium mb-2">Erro ao carregar relatórios</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={load} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && batches.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Inbox className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-foreground font-semibold text-lg mb-1">Nenhum relatório gerado ainda</p>
            <p className="text-muted-foreground text-sm">O primeiro relatório será gerado automaticamente na próxima segunda-feira.</p>
          </div>
        )}

        {/* Batch list */}
        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {batches.map((batch, idx) => (
                <motion.div
                  key={batch.batchId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/relatorios/${batch.batchId}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-foreground font-semibold text-base">{formatDate(batch.dataExecucao)}</p>
                        {batch.plataforma.split(",").map(p => {
                          const key = p.trim();
                          const isMeta = key === "meta_ads";
                          const isGoogle = key === "google_ads";
                          return (
                            <Badge key={key} className={`text-[10px] px-2 py-0.5 ${isMeta ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : isGoogle ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-muted text-muted-foreground border-border"}`}>
                              {isMeta ? "Meta Ads" : isGoogle ? "Google Ads" : key}
                            </Badge>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {batch.totalClientes} clientes
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatCurrency(batch.investimentoTotal)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          {formatNumber(batch.totalLeads)} leads
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {scoreBadge("saudáveis", batch.saudaveis, "green")}
                        {scoreBadge("atenção", batch.atencao, "yellow")}
                        {scoreBadge("críticos", batch.criticos, "red")}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className="text-sm px-3 py-1 bg-primary/15 text-primary border-primary/25 font-semibold">
                        {batch.totalClientes} clientes
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Relatorios;
