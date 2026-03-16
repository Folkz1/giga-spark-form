import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileBarChart, CheckCircle2, Clock, AlertTriangle, ChevronRight, RefreshCw, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { fetchBatches, getRevisados, formatDate, type Batch } from "@/lib/relatorios-utils";

type StatusFilter = "todos" | "pendentes" | "revisados" | "erros";

const Relatorios = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBatches();
      setBatches(Array.isArray(data) ? data.sort((a, b) => new Date(b.dataGeracao).getTime() - new Date(a.dataGeracao).getTime()) : []);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "todos") return batches;
    return batches.filter(b => {
      const revisados = getRevisados(b.batchId);
      const revisadosCount = revisados.length;
      if (filter === "revisados") return revisadosCount >= b.totalClientes && b.erros === 0;
      if (filter === "pendentes") return revisadosCount < b.totalClientes;
      if (filter === "erros") return b.erros > 0;
      return true;
    });
  }, [batches, filter]);

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "Todos", value: "todos" },
    { label: "Pendentes de Revisão", value: "pendentes" },
    { label: "Revisados", value: "revisados" },
    { label: "Com Erros", value: "erros" },
  ];

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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
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
              {filtered.map((batch, idx) => {
                const revisadosLocal = getRevisados(batch.batchId).length;
                const totalRevisados = batch.concluidos + revisadosLocal;
                const capped = Math.min(totalRevisados, batch.totalClientes);
                const pct = batch.totalClientes > 0 ? (capped / batch.totalClientes) * 100 : 0;

                return (
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
                        <p className="text-foreground font-semibold text-base mb-1">{formatDate(batch.dataGeracao)}</p>
                        <p className="text-muted-foreground text-sm">{batch.totalClientes} clientes processados</p>

                        <div className="flex flex-wrap gap-3 mt-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{capped} revisados</span>
                          </span>
                          {(batch.totalClientes - capped - batch.erros) > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-400">{batch.totalClientes - capped - batch.erros} pendentes</span>
                            </span>
                          )}
                          {batch.erros > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-red-400">{batch.erros} erros</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-3">
                          <Progress value={pct} className="h-2 bg-secondary" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className="text-sm px-3 py-1 bg-primary/15 text-primary border-primary/25 font-semibold">
                          {capped} de {batch.totalClientes}
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Relatorios;
