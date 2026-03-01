import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface ClienteMeta {
  id: number;
  nome: string;
  adAccountId: string;
  tipo: "LOCAL" | "B2C" | "ECOMMERCE" | "B2B";
  metaRoas: string;
  metaCpa: string;
  contexto: string;
}

/* ─── Webhook helpers ─── */
function getWebhookBase(): string {
  const stored = localStorage.getItem("meta_config");
  if (stored) {
    const config = JSON.parse(stored);
    return config.webhookClientes || "https://principaln8o.gigainteligencia.com.br/webhook";
  }
  return "https://principaln8o.gigainteligencia.com.br/webhook";
}

function parseN8nResponse(raw: any): any {
  if (Array.isArray(raw)) {
    if (raw[0]?.json) return raw[0].json;
    if (raw[0]?.content?.[0]?.text) {
      const inner = raw[0].content[0].text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      return JSON.parse(inner);
    }
    return raw[0];
  }
  return raw;
}

export async function fetchClientesMeta(): Promise<ClienteMeta[]> {
  const base = getWebhookBase();
  const res = await fetch(`${base}/cliente/buscar-todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const raw = await res.json();
  const parsed = parseN8nResponse(raw);
  const lista = Array.isArray(parsed) ? parsed : parsed?.clientes || [];
  return lista.map((c: any, i: number) => ({
    id: c.id || i + 1,
    nome: c.cliente_nome || c.nome || "",
    adAccountId: c.ad_account_id || c.adAccountId || "",
    tipo: c.tipo_negocio || c.tipo || "LOCAL",
    metaRoas: c.meta_roas || c.metaRoas || "",
    metaCpa: c.meta_cpa || c.metaCpa || "",
    contexto: c.contexto || "",
  }));
}

const emptyForm = {
  nome: "", adAccountId: "", tipo: "LOCAL" as ClienteMeta["tipo"],
  metaRoas: "", metaCpa: "", contexto: "",
};

const ClientesMeta = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteMeta | null>(null);
  const [form, setForm] = useState<Omit<ClienteMeta, "id">>(emptyForm);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const lista = await fetchClientesMeta();
      setClientes(lista);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar clientes do Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClientes(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: ClienteMeta) => {
    setEditing(c);
    const { id, ...rest } = c;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.adAccountId) {
      toast.error("Nome e Ad Account ID são obrigatórios");
      return;
    }
    setSaving(true);
    const base = getWebhookBase();
    try {
      const payload = {
        cliente_nome: form.nome,
        ad_account_id: form.adAccountId,
        tipo_negocio: form.tipo,
        meta_roas: form.metaRoas,
        meta_cpa: form.metaCpa,
        contexto: form.contexto,
      };

      if (editing) {
        await fetch(`${base}/cliente/atualizar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Cliente atualizado!");
      } else {
        await fetch(`${base}/cliente/criar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Cliente adicionado!");
      }
      setModalOpen(false);
      await loadClientes();
    } catch {
      toast.error("Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ClienteMeta) => {
    const base = getWebhookBase();
    try {
      await fetch(`${base}/cliente/deletar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_account_id: c.adAccountId }),
      });
      toast.success("Cliente removido");
      await loadClientes();
    } catch {
      toast.error("Erro ao remover cliente");
    }
  };

  const tipoBadgeColor: Record<string, string> = {
    LOCAL: "bg-blue-500/20 text-blue-400",
    B2C: "bg-purple-500/20 text-purple-400",
    ECOMMERCE: "bg-green-500/20 text-green-400",
    B2B: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/gestor-meta")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Clientes Meta Ads</h1>
          <div className="flex-1" />
          <Button onClick={openNew} className="bg-[#1877F2] hover:bg-[#1565c0] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Cliente
          </Button>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Carregando clientes...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Ad Account ID</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Meta ROAS</th>
                      <th className="text-left p-3">Meta CPA</th>
                      <th className="text-right p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(c => (
                      <tr key={c.adAccountId} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground">{c.nome}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{c.adAccountId}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipoBadgeColor[c.tipo] || ""}`}>
                            {c.tipo}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.metaRoas ? `${c.metaRoas}x` : "—"}</td>
                        <td className="p-3 text-muted-foreground">{c.metaCpa ? `R$${c.metaCpa}` : "—"}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {clientes.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum cliente cadastrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Ad Account ID *</Label>
              <Input placeholder="act_XXXXXXXXXX" value={form.adAccountId} onChange={e => setForm({ ...form, adAccountId: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de Negócio</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as ClienteMeta["tipo"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">LOCAL</SelectItem>
                  <SelectItem value="B2C">B2C</SelectItem>
                  <SelectItem value="ECOMMERCE">ECOMMERCE</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Meta ROAS</Label>
                <Input placeholder="3.0" value={form.metaRoas} onChange={e => setForm({ ...form, metaRoas: e.target.value })} />
              </div>
              <div>
                <Label>Meta CPA/CPL (R$)</Label>
                <Input placeholder="50.00" value={form.metaCpa} onChange={e => setForm({ ...form, metaCpa: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Contexto</Label>
              <Textarea placeholder="Ex: restaurante delivery, foco em pedidos" value={form.contexto} onChange={e => setForm({ ...form, contexto: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1877F2] hover:bg-[#1565c0] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesMeta;
