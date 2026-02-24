import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  listClickupId: string;
  listaNome: string;
  tipo: "LOCAL" | "B2C" | "ECOMMERCE" | "B2B";
  metaRoas: string;
  metaCpa: string;
  contexto: string;
}

const CLIENTES_INICIAIS: ClienteMeta[] = [
  { id: 1, nome: "Uvva Wine Bar", adAccountId: "act_161393377248868", listClickupId: "901322141120", listaNome: "Uvva", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "wine bar, foco em reservas e eventos" },
  { id: 2, nome: "Kombina", adAccountId: "act_362618250503979", listClickupId: "901322140768", listaNome: "Kombina", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "restaurante delivery e presencial" },
  { id: 3, nome: "Gueixa Sushi", adAccountId: "act_10152321026399363", listClickupId: "901322140674", listaNome: "Gueixa", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "restaurante japones, delivery e presencial" },
  { id: 4, nome: "Dermare Cosméticos", adAccountId: "act_439707696090698", listClickupId: "901322114965", listaNome: "Dermare", tipo: "ECOMMERCE", metaRoas: "3", metaCpa: "", contexto: "cosmeticos, ecommerce" },
  { id: 5, nome: "SHOP NATURELLIS", adAccountId: "act_667675534071758", listClickupId: "901322114966", listaNome: "Shopnaturallis", tipo: "ECOMMERCE", metaRoas: "3", metaCpa: "", contexto: "produtos naturais, ecommerce" },
  { id: 6, nome: "La Notte Gastrobar", adAccountId: "act_732505914098803", listClickupId: "901322140789", listaNome: "La Notte", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "gastrobar, foco em reservas" },
  { id: 7, nome: "Puppilo Pizza", adAccountId: "act_1858058734370090", listClickupId: "901322141059", listaNome: "Puppilo", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "pizzaria delivery e presencial" },
  { id: 8, nome: "Laca Porta Mix", adAccountId: "act_1211969896264688", listClickupId: "901322140795", listaNome: "Laca Porta MIx", tipo: "B2C", metaRoas: "", metaCpa: "", contexto: "" },
  { id: 9, nome: "Club M Brasil", adAccountId: "act_661116945511798", listClickupId: "901322140405", listaNome: "Club M Alphaville", tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "clube de servicos" },
  { id: 10, nome: "Miobene Natural Care", adAccountId: "act_3404306946467316", listClickupId: "", listaNome: "", tipo: "ECOMMERCE", metaRoas: "", metaCpa: "", contexto: "" },
];

const STORAGE_KEY = "meta_clientes";

const emptyCliente: Omit<ClienteMeta, "id"> = {
  nome: "", adAccountId: "", listClickupId: "", listaNome: "",
  tipo: "LOCAL", metaRoas: "", metaCpa: "", contexto: "",
};

export function getClientesMeta(): ClienteMeta[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(CLIENTES_INICIAIS));
  return CLIENTES_INICIAIS;
}

const ClientesMeta = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteMeta[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteMeta | null>(null);
  const [form, setForm] = useState<Omit<ClienteMeta, "id">>(emptyCliente);

  useEffect(() => { setClientes(getClientesMeta()); }, []);

  const save = (list: ClienteMeta[]) => {
    setClientes(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const openNew = () => { setEditing(null); setForm(emptyCliente); setModalOpen(true); };
  const openEdit = (c: ClienteMeta) => {
    setEditing(c);
    const { id, ...rest } = c;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.adAccountId) {
      toast.error("Nome e Ad Account ID são obrigatórios");
      return;
    }
    if (editing) {
      save(clientes.map(c => c.id === editing.id ? { ...form, id: editing.id } : c));
      toast.success("Cliente atualizado!");
    } else {
      const newId = Math.max(0, ...clientes.map(c => c.id)) + 1;
      save([...clientes, { ...form, id: newId }]);
      toast.success("Cliente adicionado!");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    save(clientes.filter(c => c.id !== id));
    toast.success("Cliente removido");
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Ad Account ID</th>
                    <th className="text-left p-3">Lista ClickUp</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Meta ROAS</th>
                    <th className="text-left p-3">Meta CPA</th>
                    <th className="text-right p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{c.nome}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{c.adAccountId}</td>
                      <td className="p-3 text-muted-foreground">{c.listaNome || "—"}</td>
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
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lista ClickUp ID</Label>
                <Input value={form.listClickupId} onChange={e => setForm({ ...form, listClickupId: e.target.value })} />
              </div>
              <div>
                <Label>Nome da Lista</Label>
                <Input value={form.listaNome} onChange={e => setForm({ ...form, listaNome: e.target.value })} />
              </div>
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
            <Button onClick={handleSave} className="bg-[#1877F2] hover:bg-[#1565c0] text-white">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesMeta;
