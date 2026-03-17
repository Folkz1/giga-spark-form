/**
 * DataCrazy API Client — gerencia clientes, pixels e config via API.
 * Usa master key para CRUD completo de clientes.
 */

const STORAGE_KEY = "datacrazy_config";

export interface DataCrazyConnection {
  apiUrl: string;
  masterKey: string;
}

export interface PixelEntry {
  id?: string;
  pixel_id: string;
  access_token: string;
  label: string;
  active: boolean;
}

export interface GooglePixelEntry {
  id?: string;
  measurement_id: string;
  api_secret: string;
  label: string;
  active: boolean;
}

export interface CrmCredentials {
  datacrazy_token?: string;
  stage_map?: Record<string, string>;
  field_map?: Record<string, string>;
}

export interface ClientData {
  id?: string;
  name: string;
  pixel_id?: string;
  meta_access_token?: string;
  pixels: PixelEntry[];
  google_pixels: GooglePixelEntry[];
  events_enabled: string[];
  crm_credentials: CrmCredentials;
  active?: boolean;
  api_key?: string;
  created_at?: string;
}

// --- Connection storage ---

export function getConnection(): DataCrazyConnection | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveConnection(conn: DataCrazyConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY);
}

// --- API helpers ---

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const conn = getConnection();
  if (!conn) throw new Error("API não configurada. Preencha URL e Master Key.");

  const url = `${conn.apiUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": conn.masterKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Erro ${res.status}`);
  }

  return res.json();
}

// --- Client CRUD ---

export async function listClients(): Promise<ClientData[]> {
  return apiFetch<ClientData[]>("/api/clients");
}

export async function getClient(id: string): Promise<ClientData> {
  return apiFetch<ClientData>(`/api/clients/${id}`);
}

export async function createClient(data: Omit<ClientData, "id" | "api_key" | "created_at" | "active">): Promise<ClientData> {
  return apiFetch<ClientData>("/api/clients", { method: "POST", body: data });
}

export async function updateClient(id: string, data: Partial<ClientData>): Promise<ClientData> {
  return apiFetch<ClientData>(`/api/clients/${id}`, { method: "PATCH", body: data });
}

export async function deleteClient(id: string): Promise<void> {
  await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
}

// --- Health check ---

export async function checkHealth(): Promise<{ status: string; version: string }> {
  return apiFetch("/api/health");
}

// --- CRM helpers ---

export interface PipelineStage {
  id: string;
  name: string;
  order?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  stages_count?: number;
}

export interface LeadField {
  path: string;
  sample_value: string;
  count: number;
}

export interface EventRecord {
  id: string;
  client_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  user_data: Record<string, unknown>;
  meta_response: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface EventStats {
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  total: number;
}

export async function listPipelines(): Promise<Pipeline[]> {
  return apiFetch<Pipeline[]>("/api/crm/pipelines");
}

export async function listLeadFields(): Promise<{ fields: LeadField[] }> {
  return apiFetch<{ fields: LeadField[] }>("/api/crm/lead-fields");
}

// --- Events ---

export async function listEvents(clientId?: string, limit = 50): Promise<EventRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (clientId) params.set("client_id", clientId);
  return apiFetch<EventRecord[]>(`/api/events?${params}`);
}

export async function getEventStats(clientId?: string): Promise<EventStats> {
  const params = clientId ? `?client_id=${clientId}` : "";
  return apiFetch<EventStats>(`/api/events/stats${params}`);
}

// --- Event types ---

export const META_EVENT_TYPES = [
  "Purchase",
  "Lead",
  "CompleteRegistration",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Search",
  "Contact",
  "Schedule",
  "CustomizeProduct",
  "SubmitApplication",
];

export const USER_DATA_FIELDS = [
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "first_name", label: "Primeiro Nome" },
  { key: "last_name", label: "Sobrenome" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
  { key: "country", label: "País" },
  { key: "zip_code", label: "CEP" },
  { key: "date_of_birth", label: "Data de Nascimento" },
  { key: "external_id", label: "ID Externo" },
];
