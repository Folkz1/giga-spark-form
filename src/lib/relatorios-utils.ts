// Relatórios Semanais — types & helpers matching real API responses

// ─── Batch List (Endpoint 1) ───
export interface Batch {
  batchId: string;
  dataExecucao: string;
  status: string;
  totalClientes: number;
  saudaveis: number;
  atencao: number;
  criticos: number;
  investimentoTotal: string;
  totalLeads: number;
  plataforma: string;
}

export interface BatchesResponse {
  batches: Batch[];
}

// ─── Batch Detail (Endpoint 2) ───
export interface Recomendacao {
  titulo: string;
  tipo: string;
  prioridade: string;
  urgencia: string;
  diagnostico: string;
  acao: string;
  como_executar: string;
  impacto_esperado: string;
  descricao?: string;
  angulos_criativo?: string | null;
  prerequisito?: string | null;
}

export interface PlataformaData {
  status: string;
  resumo_executivo: string;
  investimento: string;
  conversoes: number;
  cpa: string;
  ctr: string;
  roas: string;
  score_fiscal: string; // "CRITICO" | "ATENCAO" | "SAUDAVEL"
  erro_mensagem: string;
  dataProcessamento: string;
  customerId: string;
  alertas: string[];
  recomendacoes: Recomendacao[];
}

export interface ClienteResumo {
  accountName: string;
  customerId: string;
  google_ads: PlataformaData | null;
  meta_ads: PlataformaData | null;
  statusGeral: string;
}

export interface BatchDetailResponse {
  batchId: string;
  totalClientes: number;
  clientes: ClienteResumo[];
}

// ─── Full Analysis (Endpoint 3) ───
export interface DiagnosticoCampanha {
  nome: string;
  objetivo: string;
  status: string;
  causa_raiz: string;
  diagnostico: string;
  acao_principal: string;
}

export interface DiagnosticoCriativos {
  resumo: string;
  fatigados: { nome: string; motivo: string }[];
  winners: { nome: string; motivo: string }[];
  proximos_testes: string;
}

export interface Projecao {
  cenario_atual: string;
  com_otimizacoes: string;
  roas_esperado: string;
  reducao_cpa_estimada: string;
  metrica_principal_esperada: string;
}

export interface TarefaClickUp {
  titulo?: string;
  nome?: string;
  descricao?: string;
  por_que_fazer: string;
  como_executar: string;
  prioridade: string;
  prioridade_num?: number;
  prazo_dias?: number;
  tipo: string;
  urgencia?: string;
  impacto_esperado?: string;
  links?: { nome: string; url: string }[];
}

export interface PlacementInsight {
  posicionamento: string;
  status: string;
  cpa: number;
  conversoes: number;
  recomendacao: string;
}

export interface DemographicInsight {
  segmento: string;
  status: string;
  cpa: number;
  recomendacao: string;
}

export interface AlertaTecnico {
  tipo: string;
  campanha: string;
  descricao: string;
  acao_imediata: string;
}

export interface CampanhaDetail {
  id: string;
  nome: string;
  status: string;
  status_performance: string;
  tipo_campanha: string;
  metricas: {
    spend: number;
    leads: number;
    compras: number;
    impressions: number;
    reach: number;
    frequency: string;
    cpm: number;
    ctr: string;
    hook_rate?: string;
    hold_rate?: string;
  };
  alertas: string[];
  budget_utilization: string;
  gerenciador_url: string;
}

export interface AnuncioDetail {
  id: string;
  nome: string;
  status: string;
  diagnostico_fadiga: string;
  rankings: { quality_ranking: string; score: string };
  metricas: { ctr: string; hook_rate?: string; spend: number };
}

export interface AnaliseResumo {
  total_investimento: string;
  total_receita: string;
  roas_geral: string;
  cpa_geral: string;
  cpl_geral: string;
  total_compras: number;
  total_leads: number;
  total_conversas: number;
  frequencia_media: string;
  cpm_medio: string;
  ctr_medio: string;
  total_campanhas: number;
  campanhas_ativas: number;
  campanhas_criticas: number;
  campanhas_atencao: number;
  campanhas_saudaveis: number;
  total_adsets: number;
  total_anuncios: number;
  anuncios_fatigados: number;
}

export interface AnaliseData {
  resumo_executivo: string;
  score_conta: string;
  score_justificativa: string;
  alertas_criticos: string[];
  oportunidades: string[];
  diagnostico_por_campanha: DiagnosticoCampanha[];
  diagnostico_criativos: DiagnosticoCriativos;
  recomendacoes: Recomendacao[];
  projecao: Projecao;
  tarefas_para_clickup: TarefaClickUp[];
  placement_insights: PlacementInsight[];
  demographic_insights: DemographicInsight[];
  alertas_tecnicos: AlertaTecnico[];
  relatorio_fiscal: string;
}

export interface AnaliseCompleta {
  batchId: string;
  customerId: string;
  accountName: string;
  plataforma: string;
  status: string;
  dataProcessamento: string;
  analiseCompleta: {
    status: string;
    cliente: string;
    data_analise: string;
    periodo: string;
    resumo: AnaliseResumo;
    alertas: string[];
    analise: AnaliseData;
    campanhas: CampanhaDetail[];
    anuncios: AnuncioDetail[];
    tarefas_sugeridas: TarefaClickUp[];
    placement_insights: PlacementInsight[];
    demographic_insights: DemographicInsight[];
    alertas_tecnicos: AlertaTecnico[];
  };
}

// ─── Revisado (localStorage) ───
export interface Revisado {
  customerId: string;
  plataforma: string;
  revisadoPor: string;
  dataRevisao: string;
}

// ─── API ───
const BASE_URL = "https://principaln8o.gigainteligencia.com.br";

export async function fetchBatches(): Promise<Batch[]> {
  const res = await fetch(`${BASE_URL}/webhook/batch-reports`);
  if (!res.ok) throw new Error("Falha ao carregar batches");
  const data: BatchesResponse = await res.json();
  return data.batches || [];
}

export async function fetchBatchClientes(batchId: string): Promise<BatchDetailResponse> {
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

// ─── Local review state ───
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

// ─── Formatters ───
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("pt-BR");
}

export function formatPercent(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0%";
  return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatDate(dateStr: string): string {
  // Handle "16/03/2026" format
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  }
  // Handle ISO format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// Score ordering for sorting
export function scoreOrder(score: string): number {
  if (score === "CRITICO") return 0;
  if (score === "ATENCAO") return 1;
  return 2; // SAUDAVEL
}

// Get active platform data from a client
export function getPlataformaData(c: ClienteResumo): { data: PlataformaData; plataforma: string } | null {
  if (c.meta_ads && c.meta_ads.status !== "error") return { data: c.meta_ads, plataforma: "meta_ads" };
  if (c.google_ads && c.google_ads.status !== "error") return { data: c.google_ads, plataforma: "google_ads" };
  if (c.meta_ads) return { data: c.meta_ads, plataforma: "meta_ads" };
  if (c.google_ads) return { data: c.google_ads, plataforma: "google_ads" };
  return null;
}
