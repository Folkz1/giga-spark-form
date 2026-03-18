import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Smartphone, Copy, ExternalLink, RefreshCw, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const API_URL = "https://principaln8o.gigainteligencia.com.br/webhook/api/whatsapp-status";
const PAINEL_URL = "https://principaln8o.gigainteligencia.com.br/webhook/painel-instancias";

interface OfflineInstance {
  name: string;
  profileName: string;
  qrLink: string;
}

interface WhatsAppStatus {
  online: number;
  offline: number;
  total: number;
  offlineList: OfflineInstance[];
}

interface WhatsAppStatusCardProps {
  onOfflineCount?: (count: number) => void;
}

export function WhatsAppStatusCard({ onOfflineCount }: WhatsAppStatusCardProps) {
  const [data, setData] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setError(false);
      onOfflineCount?.(json.offlineList?.length ?? json.offline ?? 0);
    } catch {
      if (isInitial) setError(true);
    } finally {
      setLoading(false);
    }
  }, [onOfflineCount]);

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copyQrLink = (instance: OfflineInstance) => {
    navigator.clipboard.writeText(instance.qrLink);
    setCopiedId(instance.name);
    toast.success("Link QR copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-6 space-y-4">
        <Skeleton className="h-5 w-48 bg-slate-700/50" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-20 rounded-full bg-slate-700/50" />
          <Skeleton className="h-8 w-20 rounded-full bg-slate-700/50" />
          <Skeleton className="h-8 w-20 rounded-full bg-slate-700/50" />
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-6 text-center">
        <p className="text-sm text-slate-400">Não foi possível carregar o status do WhatsApp.</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-slate-700 text-slate-400 hover:text-white" onClick={() => { setLoading(true); setError(false); fetchStatus(true); }}>
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const allOnline = data.offline === 0;
  const offlineCount = data.offlineList.length;

  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-6 transition-all duration-200 hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Smartphone className="w-[22px] h-[22px] text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">WhatsApp</h3>
            <p className="text-xs text-slate-400">Status das instâncias</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          allOnline
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
            : "bg-red-500/10 text-red-400 border-red-500/25"
        }`}>
          {allOnline ? "Tudo online" : `${data.offline} offline`}
        </span>
      </div>

      {/* Stat pills */}
      <div className="flex gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
          <Wifi className="w-3 h-3" /> Online: {data.online}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
          <WifiOff className="w-3 h-3" /> Offline: {data.offline}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300 text-xs font-medium">
          <Smartphone className="w-3 h-3" /> Total: {data.total}
        </span>
      </div>

      {/* Collapsible offline list */}
      {offlineCount > 0 && (
        <Collapsible open={offlineOpen} onOpenChange={setOfflineOpen}>
          <div className="border-t border-slate-700/40 pt-3 mt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left group cursor-pointer">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                {offlineOpen ? "Ocultar instâncias" : `Ver ${offlineCount} instância${offlineCount !== 1 ? "s" : ""} offline`}
              </span>
              {offlineOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto">
                {data.offlineList.map((inst) => (
                  <div key={inst.name} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-slate-900/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-xs text-slate-300 truncate">{inst.profileName || inst.name}</span>
                    </div>
                    <button
                      onClick={() => copyQrLink(inst)}
                      className="shrink-0 text-[11px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {copiedId === inst.name ? (
                        <><Check className="w-3 h-3 text-emerald-400" /> Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copiar Link QR</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Footer — ghost button */}
      <div className="mt-4 pt-3 border-t border-slate-700/40">
        <a
          href={PAINEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600/50 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
        >
          Ver painel completo <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
