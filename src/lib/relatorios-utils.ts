// Relatórios Semanais — shared types & helpers

export interface Batch {
  batchId: string;
  dataGeracao: string;
  totalClientes: number;
  concluidos: number;
  erros: number;
  pendentes: number;
}

export interface ClienteResumo {
  customerId: string;
  nomeCliente: string;
  plataforma: string; // "google_ads" | "meta_ads" | "ambos"
  status: "pronto" | "processando" | "erro" | "revisado";
  resumoMetricas?: {
    investimento?: number;
    cpa?: number;
    cpl?: number;
    roas?: number;
    tendencia?: "up" | "down" | "stable";
  };
}

export interface AnaliseCompleta {
  visaoGeral?: string;
  performanceCampanhas?: string;
  recomendacoes?: string;
  alertas?: string;
  orcamento?: string;
  raw?: string;
}

export interface Revisado {
  customerId: string;
  plataforma: string;
  revisadoPor: string;
  dataRevisao: string;
}

const BASE_URL = "https://principaln8o.gigainteligencia.com.br";

export async function fetchBatches(): Promise<Batch[]> {
  const res = await fetch(`${BASE_URL}/webhook/batch-reports`);
  if (!res.ok) throw new Error("Falha ao carregar batches");
  return res.json();
}

export async function fetchBatchClientes(batchId: string): Promise<ClienteResumo[]> {
  const res = await fetch(`${BASE_URL}/webhook/batch-reports-detail?batchId=${batchId}`);
  if (!res.ok) throw new Error("Falha ao carregar clientes");
  return res.json();
}

export async function fetchAnaliseCliente(batchId: string, customerId: string, plataforma: string): Promise<AnaliseCompleta> {
  const res = await fetch(`${BASE_URL}/webhook/batch-report-client?batchId=${batchId}&customerId=${customerId}&plataforma=${plataforma}`);
  if (!res.ok) throw new Error("Falha ao carregar análise");
  return res.json();
}

export async function retryCliente(batchId: string, customerId: string, plataforma: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/webhook/batch-report-retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId, customerId, plataforma }),
  });
  if (!res.ok) throw new Error("Falha ao reprocessar");
}

export function getRevisados(batchId: string): Revisado[] {
  try {
    return JSON.parse(localStorage.getItem(`revisados_${batchId}`) || "[]");
  } catch { return []; }
}

export function setRevisado(batchId: string, customerId: string, plataforma: string, revisado: boolean) {
  const list = getRevisados(batchId);
  if (revisado) {
    if (!list.find(r => r.customerId === customerId && r.plataforma === plataforma)) {
      list.push({ customerId, plataforma, revisadoPor: "equipe", dataRevisao: new Date().toISOString() });
    }
  } else {
    const idx = list.findIndex(r => r.customerId === customerId && r.plataforma === plataforma);
    if (idx >= 0) list.splice(idx, 1);
  }
  localStorage.setItem(`revisados_${batchId}`, JSON.stringify(list));
  return list;
}

export function isRevisado(batchId: string, customerId: string, plataforma: string): boolean {
  return getRevisados(batchId).some(r => r.customerId === customerId && r.plataforma === plataforma);
}

export function countRevisados(batchId: string, clientes: ClienteResumo[]): number {
  const revisados = getRevisados(batchId);
  return clientes.filter(c =>
    c.status === "revisado" || revisados.some(r => r.customerId === c.customerId && r.plataforma === c.plataforma)
  ).length;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()} — ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
