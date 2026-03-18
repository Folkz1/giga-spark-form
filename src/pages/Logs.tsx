import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Activity, RefreshCw, Loader2, AlertCircle, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getConnection,
  listClients,
  listEvents,
  getEventStats,
  type ClientData,
  type EventRecord,
  type EventStats,
} from "@/lib/datacrazy-client";

const Logs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdParam = searchParams.get("client");

  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>(clientIdParam || "all");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const conn = getConnection();

  useEffect(() => {
    if (conn) {
      listClients().then(setClients).catch(() => {});
    }
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const cid = selectedClient === "all" ? undefined : selectedClient;
      const [evts, st] = await Promise.all([
        listEvents(cid, 100),
        getEventStats(cid),
      ]);
      setEvents(evts);
      setStats(st);
    } catch (e: any) {
      toast.error("Erro ao carregar log: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conn) loadEvents();
  }, [selectedClient]);

  useEffect(() => {
    if (clientIdParam && clientIdParam !== selectedClient) {
      setSelectedClient(clientIdParam);
    }
  }, [clientIdParam]);

  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    if (value === "all") {
      searchParams.delete("client");
    } else {
      searchParams.set("client", value);
    }
    setSearchParams(searchParams);
  };

  const filteredEvents = statusFilter === "all"
    ? events
    : events.filter(e => e.status === statusFilter);

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name;

  if (!conn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Configure a conexão com a API em /configuracoes primeiro.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" /> Log de Eventos
            </h1>
            <p className="text-sm text-muted-foreground">
              Histórico de disparos Meta CAPI e Google GA4
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedClient} onValueChange={handleClientChange}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-green-500">{stats.by_status?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Enviados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{stats.by_status?.error || 0}</p>
              <p className="text-sm text-muted-foreground">Erros</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats.by_status?.pending || 0}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </Card>
          </div>
        )}

        {/* By type breakdown */}
        {stats && stats.by_type && Object.keys(stats.by_type).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-sm py-1 px-3">
                {type}: {count as number}
              </Badge>
            ))}
          </div>
        )}

        {/* Event count */}
        <p className="text-xs text-muted-foreground">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
          {selectedClientName ? ` — ${selectedClientName}` : ""}
          {statusFilter !== "all" ? ` (${statusFilter})` : ""}
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty */}
        {!loading && filteredEvents.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum evento encontrado.
            </CardContent>
          </Card>
        )}

        {/* Event list */}
        {!loading && filteredEvents.length > 0 && (
          <div className="space-y-2">
            {filteredEvents.map(evt => {
              const ed = (evt.event_data || {}) as Record<string, any>;
              const ud = (evt.user_data || {}) as Record<string, any>;
              const leadName = [ud.first_name, ud.last_name].filter(Boolean).join(" ") || "—";
              const isGoogle = ed.platform === "google";

              return (
                <Card key={evt.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {evt.status === "sent" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{leadName}</span>
                        <Badge variant="outline" className="text-xs">{evt.event_type}</Badge>
                        {isGoogle && <Badge variant="secondary" className="text-xs">GA4</Badge>}
                        {ed.pixel_label && !isGoogle && (
                          <span className="text-xs text-muted-foreground">Pixel: {ed.pixel_label}</span>
                        )}
                        {ed.stage && (
                          <span className="text-xs text-muted-foreground">Stage: {ed.stage}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {ud.email && <span>{ud.email}</span>}
                        {ud.phone && <span>{ud.phone}</span>}
                        {ed.source && <Badge variant="outline" className="text-[10px]">{ed.source}</Badge>}
                      </div>
                      {evt.error_message && (
                        <p className="text-xs text-red-400 mt-1">{evt.error_message}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
