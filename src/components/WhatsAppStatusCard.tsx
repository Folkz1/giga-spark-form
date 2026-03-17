import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Smartphone, Copy, ExternalLink, RefreshCw, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

export function WhatsAppStatusCard() {
  const [data, setData] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
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
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar o status do WhatsApp.</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => { setLoading(true); fetchStatus(); }}>
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const allOnline = data.offline === 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">WhatsApp</h3>
            <p className="text-[11px] text-muted-foreground">Status das instâncias</p>
          </div>
        </div>
        <Badge
          className={`text-[11px] px-2 py-0.5 font-semibold border ${
            allOnline
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border-red-500/30"
          }`}
        >
          {allOnline ? "Tudo online" : `${data.offline} offline`}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-5 pb-4">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Online</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{data.online}</p>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <WifiOff className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-red-400 font-medium">Offline</span>
          </div>
          <p className="text-xl font-bold text-red-400">{data.offline}</p>
        </div>
        <div className="rounded-xl bg-secondary border border-border px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Smartphone className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">{data.total}</p>
        </div>
      </div>

      {/* Offline list */}
      {data.offlineList.length > 0 && (
        <div className="border-t border-border px-5 py-3 space-y-2">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Instâncias offline</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.offlineList.map((inst) => (
              <div key={inst.name} className="flex items-center justify-between gap-2 rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{inst.profileName || inst.name}</p>
                  {inst.profileName && inst.profileName !== inst.name && (
                    <p className="text-[10px] text-muted-foreground truncate">{inst.name}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-[11px] gap-1 px-2"
                  onClick={() => copyQrLink(inst)}
                >
                  {copiedId === inst.name ? (
                    <><Check className="w-3 h-3 text-emerald-400" /> Copiado</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copiar Link QR</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <a
          href={PAINEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver painel completo <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
