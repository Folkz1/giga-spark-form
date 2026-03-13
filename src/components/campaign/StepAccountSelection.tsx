import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Loader2, AlertCircle, Building2, Search, X } from "lucide-react";
import type { Account } from "./types";

interface StepAccountSelectionProps {
  selectedAccount: Account | null;
  onSelect: (account: Account) => void;
}

const StepAccountSelection = ({ selectedAccount, onSelect }: StepAccountSelectionProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAccounts = useMemo(
    () => accounts.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.customerId.toLowerCase().includes(search.toLowerCase())
    ),
    [accounts, search]
  );

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://principaln8o.gigainteligencia.com.br/webhook/google-ads-accounts", {
        headers: { "X-API-Key": "7AWuCCQl7RyrO5t2Pcozn0Iyi2iC6gtsqYqH_CtvLyI" }
      });
      if (!res.ok) throw new Error("Falha ao carregar contas");
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);
    } catch {
      // Use mock data for demo
      setAccounts([
        { id: "1", name: "Limpeza Industrial SP", customerId: "123-456-7890" },
        { id: "2", name: "Dedetização Premium", customerId: "234-567-8901" },
        { id: "3", name: "Higienização Total", customerId: "345-678-9012" },
        { id: "4", name: "Clean Service BR", customerId: "456-789-0123" },
      ]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Selecione a conta do cliente</h2>
        <p className="text-muted-foreground">Escolha a conta Google Ads para criar a campanha.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Carregando contas...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchAccounts}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-surface-hover transition-colors text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-secondary border border-border hover:border-primary/40 transition-all text-left"
          >
            {selectedAccount ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedAccount.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAccount.customerId}</p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecione uma conta...</span>
            )}
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {filteredAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta encontrada</p>
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      onSelect(account);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left ${
                      selectedAccount?.id === account.id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.customerId}</p>
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StepAccountSelection;
