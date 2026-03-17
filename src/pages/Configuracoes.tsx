import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Settings2, Plug, Check, X, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getConnection,
  saveConnection,
  checkHealth,
  listClients,
  createClient,
  updateClient,
  deleteClient,
  META_EVENT_TYPES,
  USER_DATA_FIELDS,
  type ClientData,
  type PixelEntry,
  type GooglePixelEntry,
  type CrmCredentials,
  type DataCrazyConnection,
} from "@/lib/datacrazy-client";

/* ═══════════════════════════════════════════════
   Connection Panel — API URL + Master Key
   ═══════════════════════════════════════════════ */

function ConnectionPanel({ onConnected }: { onConnected: () => void }) {
  const existing = getConnection();
  const [url, setUrl] = useState(existing?.apiUrl || "");
  const [key, setKey] = useState(existing?.masterKey || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const testConnection = async () => {
    if (!url || !key) { toast.error("Preencha URL e Master Key"); return; }
    setTesting(true);
    setStatus("idle");
    try {
      saveConnection({ apiUrl: url, masterKey: key });
      const h = await checkHealth();
      if (h.status === "ok") {
        setStatus("ok");
        toast.success(`Conectado! API v${h.version}`);
        onConnected();
      } else {
        setStatus("error");
        toast.error("API respondeu mas status não é OK");
      }
    } catch (e: any) {
      setStatus("error");
      toast.error(e.message || "Falha na conexão");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plug className="h-5 w-5" /> Conexão com a API DataCrazy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>URL da API</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://datacrazy-api.seuservidor.host" />
        </div>
        <div className="space-y-2">
          <Label>Master Key</Label>
          <Input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="dc-master-..." />
        </div>
        <Button onClick={testConnection} disabled={testing} className="w-full">
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {status === "ok" ? <Check className="mr-2 h-4 w-4" /> : null}
          {status === "error" ? <X className="mr-2 h-4 w-4" /> : null}
          Testar Conexão
        </Button>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════
   Pixel List Editor (Meta or Google)
   ═══════════════════════════════════════════════ */

function PixelListEditor({
  type,
  pixels,
  onChange,
}: {
  type: "meta" | "google";
  pixels: (PixelEntry | GooglePixelEntry)[];
  onChange: (pixels: any[]) => void;
}) {
  const addPixel = () => {
    if (type === "meta") {
      onChange([...pixels, { pixel_id: "", access_token: "", label: "Principal", active: true }]);
    } else {
      onChange([...pixels, { measurement_id: "", api_secret: "", label: "Principal", active: true }]);
    }
  };

  const remove = (i: number) => onChange(pixels.filter((_, idx) => idx !== i));

  const update = (i: number, field: string, value: any) => {
    const copy = [...pixels];
    (copy[i] as any)[field] = value;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {type === "meta" ? "Pixels Meta (CAPI)" : "Pixels Google (GA4)"}
        </Label>
        <Button variant="outline" size="sm" onClick={addPixel}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      {pixels.map((px, i) => (
        <Card key={i} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Input
              value={px.label}
              onChange={e => update(i, "label", e.target.value)}
              placeholder="Label (ex: B2B, Lançamento)"
              className="max-w-[200px] h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <Switch checked={px.active} onCheckedChange={v => update(i, "active", v)} />
              <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          {type === "meta" ? (
            <>
              <Input
                value={(px as PixelEntry).pixel_id}
                onChange={e => update(i, "pixel_id", e.target.value)}
                placeholder="Pixel ID (ex: 123456789)"
                className="h-8 text-sm"
              />
              <Input
                value={(px as PixelEntry).access_token}
                onChange={e => update(i, "access_token", e.target.value)}
                placeholder="Access Token (CAPI)"
                className="h-8 text-sm font-mono"
                type="password"
              />
            </>
          ) : (
            <>
              <Input
                value={(px as GooglePixelEntry).measurement_id}
                onChange={e => update(i, "measurement_id", e.target.value)}
                placeholder="Measurement ID (G-XXXXXXX)"
                className="h-8 text-sm"
              />
              <Input
                value={(px as GooglePixelEntry).api_secret}
                onChange={e => update(i, "api_secret", e.target.value)}
                placeholder="API Secret"
                className="h-8 text-sm font-mono"
                type="password"
              />
            </>
          )}
        </Card>
      ))}
      {pixels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum pixel configurado</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Stage Mapping Editor
   ═══════════════════════════════════════════════ */

function StageMappingEditor({
  stageMap,
  onChange,
}: {
  stageMap: Record<string, string>;
  onChange: (map: Record<string, string>) => void;
}) {
  const entries = Object.entries(stageMap);

  const addEntry = () => onChange({ ...stageMap, "": "Lead" });

  const removeEntry = (key: string) => {
    const copy = { ...stageMap };
    delete copy[key];
    onChange(copy);
  };

  const updateEntry = (oldKey: string, newKey: string, value: string) => {
    const copy = { ...stageMap };
    if (oldKey !== newKey) delete copy[oldKey];
    copy[newKey] = value;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Mapeamento de Estágios</Label>
        <Button variant="outline" size="sm" onClick={addEntry}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Quando o deal muda para o estágio, dispara o evento Meta correspondente.
      </p>
      {entries.map(([key, value], i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={key}
            onChange={e => updateEntry(key, e.target.value, value)}
            placeholder="Nome do estágio no CRM"
            className="h-8 text-sm flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">→</span>
          <Select value={value} onValueChange={v => updateEntry(key, key, v)}>
            <SelectTrigger className="h-8 text-sm w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {META_EVENT_TYPES.map(evt => (
                <SelectItem key={evt} value={evt}>{evt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => removeEntry(key)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Sem mapeamento — só "won" → Purchase será disparado automaticamente
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Field Mapping Editor
   ═══════════════════════════════════════════════ */

function FieldMappingEditor({
  fieldMap,
  onChange,
}: {
  fieldMap: Record<string, string>;
  onChange: (map: Record<string, string>) => void;
}) {
  const entries = Object.entries(fieldMap);

  const addEntry = () => onChange({ ...fieldMap, city: "" });

  const removeEntry = (key: string) => {
    const copy = { ...fieldMap };
    delete copy[key];
    onChange(copy);
  };

  const updateEntry = (oldKey: string, newKey: string, value: string) => {
    const copy = { ...fieldMap };
    if (oldKey !== newKey) delete copy[oldKey];
    copy[newKey] = value;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Mapeamento de Campos</Label>
        <Button variant="outline" size="sm" onClick={addEntry}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Mapeia campos do CRM para dados do usuário (Meta/Google). Use paths como "address.city" ou "customFields.cep".
      </p>
      {entries.map(([key, value], i) => (
        <div key={i} className="flex gap-2 items-center">
          <Select value={key} onValueChange={v => updateEntry(key, v, value)}>
            <SelectTrigger className="h-8 text-sm w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_DATA_FIELDS.map(f => (
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">←</span>
          <Input
            value={value}
            onChange={e => updateEntry(key, key, e.target.value)}
            placeholder="Path no CRM (ex: address.city)"
            className="h-8 text-sm flex-1 font-mono"
          />
          <Button variant="ghost" size="sm" onClick={() => removeEntry(key)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Usando campos padrão do CRM (email, phone, name, city, state)
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Client Form Dialog
   ═══════════════════════════════════════════════ */

const emptyClient: ClientData = {
  name: "",
  pixels: [],
  google_pixels: [],
  events_enabled: ["Purchase", "Lead"],
  crm_credentials: {},
};

function ClientFormDialog({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean;
  client: ClientData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClientData>(emptyClient);
  const [saving, setSaving] = useState(false);
  const isEdit = !!client?.id;

  useEffect(() => {
    if (client) {
      setForm({ ...emptyClient, ...client });
    } else {
      setForm({ ...emptyClient });
    }
  }, [client, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (isEdit && client?.id) {
        await updateClient(client.id, {
          name: form.name,
          pixels: form.pixels,
          google_pixels: form.google_pixels,
          events_enabled: form.events_enabled,
          crm_credentials: form.crm_credentials,
        });
        toast.success("Cliente atualizado!");
      } else {
        await createClient({
          name: form.name,
          pixels: form.pixels,
          google_pixels: form.google_pixels,
          events_enabled: form.events_enabled,
          crm_credentials: form.crm_credentials,
        });
        toast.success("Cliente criado!");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const crmCreds = form.crm_credentials || {};

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar: ${client?.name}` : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pixels">Pixels</TabsTrigger>
            <TabsTrigger value="estagios">Estágios</TabsTrigger>
            <TabsTrigger value="campos">Campos</TabsTrigger>
          </TabsList>

          {/* Tab: Geral */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do Cliente</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Clínica São Paulo"
              />
            </div>

            <div className="space-y-2">
              <Label>Token CRM DataCrazy</Label>
              <Input
                value={crmCreds.datacrazy_token || ""}
                onChange={e => setForm({
                  ...form,
                  crm_credentials: { ...crmCreds, datacrazy_token: e.target.value },
                })}
                placeholder="dc_eyJhbGciOi..."
                type="password"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Token individual do cliente no CRM DataCrazy</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Eventos Habilitados</Label>
              <div className="flex flex-wrap gap-2">
                {META_EVENT_TYPES.map(evt => {
                  const enabled = form.events_enabled.includes(evt);
                  return (
                    <Badge
                      key={evt}
                      variant={enabled ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const next = enabled
                          ? form.events_enabled.filter(e => e !== evt)
                          : [...form.events_enabled, evt];
                        setForm({ ...form, events_enabled: next });
                      }}
                    >
                      {evt}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {isEdit && client?.api_key && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>API Key do Cliente</Label>
                  <div className="flex gap-2">
                    <Input value={client.api_key} readOnly className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(client.api_key!);
                        toast.success("API Key copiada!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Gerada automaticamente. Use para autenticar eventos deste cliente.</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Pixels */}
          <TabsContent value="pixels" className="space-y-6 mt-4">
            <PixelListEditor
              type="meta"
              pixels={form.pixels}
              onChange={pixels => setForm({ ...form, pixels })}
            />
            <Separator />
            <PixelListEditor
              type="google"
              pixels={form.google_pixels}
              onChange={google_pixels => setForm({ ...form, google_pixels })}
            />
          </TabsContent>

          {/* Tab: Estágios */}
          <TabsContent value="estagios" className="mt-4">
            <StageMappingEditor
              stageMap={crmCreds.stage_map || {}}
              onChange={stage_map => setForm({
                ...form,
                crm_credentials: { ...crmCreds, stage_map },
              })}
            />
          </TabsContent>

          {/* Tab: Campos */}
          <TabsContent value="campos" className="mt-4">
            <FieldMappingEditor
              fieldMap={crmCreds.field_map || {}}
              onChange={field_map => setForm({
                ...form,
                crm_credentials: { ...crmCreds, field_map },
              })}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════
   Main Page — Configurações
   ═══════════════════════════════════════════════ */

const Configuracoes = () => {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const list = await listClients();
      setClients(list);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const conn = getConnection();
    if (conn?.apiUrl && conn?.masterKey) {
      setConnected(true);
      loadClients();
    }
  }, []);

  const handleDelete = async (client: ClientData) => {
    if (!confirm(`Excluir "${client.name}"? Todos os eventos serão apagados.`)) return;
    try {
      await deleteClient(client.id!);
      toast.success("Cliente excluído");
      loadClients();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" /> Configurações — Tracking API
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie clientes, pixels Meta/Google e mapeamentos do CRM
            </p>
          </div>
        </div>

        {/* Connection */}
        <ConnectionPanel onConnected={() => { setConnected(true); loadClients(); }} />

        {/* Client list */}
        {connected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Clientes ({clients.length})</h2>
              <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Cliente
              </Button>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && clients.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
                </CardContent>
              </Card>
            )}

            {clients.map(client => {
              const expanded = expandedId === client.id;
              const metaCount = client.pixels?.length || 0;
              const googleCount = client.google_pixels?.length || 0;
              const stageCount = Object.keys(client.crm_credentials?.stage_map || {}).length;
              const hasCrmToken = !!client.crm_credentials?.datacrazy_token;

              return (
                <Card key={client.id} className={`transition-all ${client.active ? "" : "opacity-50"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : client.id!)}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <div className="flex gap-2 mt-1">
                            {metaCount > 0 && <Badge variant="outline" className="text-xs">Meta: {metaCount}</Badge>}
                            {googleCount > 0 && <Badge variant="outline" className="text-xs">GA4: {googleCount}</Badge>}
                            {stageCount > 0 && <Badge variant="outline" className="text-xs">Estágios: {stageCount}</Badge>}
                            {hasCrmToken && <Badge variant="secondary" className="text-xs">CRM</Badge>}
                            {!client.active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(client); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(client)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground">API Key:</span>
                            <code className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                              {client.api_key?.slice(0, 20)}...
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Eventos:</span>
                            <span className="ml-2">{client.events_enabled?.join(", ")}</span>
                          </div>
                        </div>

                        {metaCount > 0 && (
                          <div>
                            <span className="text-muted-foreground">Pixels Meta:</span>
                            {client.pixels.map((p: any, i: number) => (
                              <Badge key={i} variant={p.active ? "default" : "outline"} className="ml-2 text-xs">
                                {p.label}: {p.pixel_id}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {googleCount > 0 && (
                          <div>
                            <span className="text-muted-foreground">Pixels GA4:</span>
                            {client.google_pixels.map((p: any, i: number) => (
                              <Badge key={i} variant={p.active ? "default" : "outline"} className="ml-2 text-xs">
                                {p.label}: {p.measurement_id}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {stageCount > 0 && (
                          <div>
                            <span className="text-muted-foreground">Mapeamento:</span>
                            {Object.entries(client.crm_credentials?.stage_map || {}).map(([k, v]) => (
                              <span key={k} className="ml-2 text-xs">
                                {k} → <strong>{v as string}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Criado em: {client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "—"}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Client form dialog */}
        <ClientFormDialog
          open={modalOpen}
          client={editing}
          onClose={() => setModalOpen(false)}
          onSaved={loadClients}
        />
      </div>
    </div>
  );
};

export default Configuracoes;
