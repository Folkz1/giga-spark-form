import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, Send, ArrowLeft, LogOut, Loader2, Download, ClipboardList, Check, ChevronsUpDown, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://principaln8o.gigainteligencia.com.br/webhook/api/gestor-front";

interface Cliente {
  cliente_nome: string;
  segmento: string;
  ticket_medio: number;
  ciclo_venda: string;
  equipe_comercial: string;
  clickup_list_id: string;
  clickup_folder_id: string;
}

interface ClickUpMember {
  id: string;
  name: string;
  email: string;
}

async function apiFetch(path: string, opts: RequestInit & { token?: string; timeoutMs?: number } = {}) {
  const { token, timeoutMs = 30000, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(fetchOpts.headers as Record<string, string> || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers, signal: controller.signal });
    const data = await res.json();
    if (res.status === 401) {
      localStorage.removeItem("gestor_crm_token");
      localStorage.removeItem("gestor_crm_user");
      throw new Error("SESSION_EXPIRED");
    }
    if (!res.ok) throw new Error(data.error || data.message || "Erro na requisição");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ─── LOGIN ───
const CrmLogin = ({ onLogin }: { onLogin: (token: string, name: string) => void }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch("/login", { method: "POST", body: JSON.stringify({ email, senha }) });
      if (data.success) {
        localStorage.setItem("gestor_crm_token", data.token);
        localStorage.setItem("gestor_crm_user", data.user_name);
        onLogin(data.token, data.user_name);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message === "SESSION_EXPIRED" ? "Sessão expirada" : "Credenciais inválidas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4" style={{ background: "#0b0f19" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl p-8 border" style={{ background: "#111827", borderColor: "#1e293b" }}>
        <div className="flex items-center gap-3 mb-2 justify-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#10b981" }}>
            <MessageSquareText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>Gestor CRM IA</h1>
        </div>
        <p className="text-center mb-8" style={{ color: "#94a3b8" }}>Acesse com suas credenciais</p>
        <div className="space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded-lg h-11" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }} />
          <Input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required className="border rounded-lg h-11" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }} />
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg text-white font-semibold" style={{ background: loading ? "#059669" : "#10b981" }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ─── CLICKUP MODAL ───
const ClickUpModal = ({ open, onClose, clienteSelecionado, respostaMarkdown, token }: {
  open: boolean; onClose: () => void; clienteSelecionado: Cliente | null; respostaMarkdown: string | null; token: string;
}) => {
  const [titulo, setTitulo] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [urgencia, setUrgencia] = useState("3");
  const [observacoes, setObservacoes] = useState("");
  const [incluirResposta, setIncluirResposta] = useState(true);
  const [members, setMembers] = useState<ClickUpMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(`Ação CRM - ${clienteSelecionado?.cliente_nome || ""}`);
      setResponsavelId("");
      setUrgencia("3");
      setObservacoes("");
      setIncluirResposta(true);
      if (members.length === 0) {
        setLoadingMembers(true);
        apiFetch("/clickup-members", { token }).then(d => setMembers(d.members || [])).catch(() => toast({ title: "Erro ao carregar membros", variant: "destructive" })).finally(() => setLoadingMembers(false));
      }
    }
  }, [open]);

  const handleCreate = async () => {
    if (!responsavelId) { toast({ title: "Selecione um responsável", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const data = await apiFetch("/clickup-task", {
        method: "POST", token, timeoutMs: 30000,
        body: JSON.stringify({
          list_id: clienteSelecionado?.clickup_list_id,
          folder_id: clienteSelecionado?.clickup_folder_id,
          assignee_id: responsavelId,
          priority: Number(urgencia),
          titulo,
          observacoes,
          conteudo_resposta: incluirResposta ? (respostaMarkdown || "") : "",
        }),
      });
      if (data.success) {
        toast({
          title: "✅ Tarefa criada com sucesso!",
          description: data.task_url ? "Clique para abrir no ClickUp" : undefined,
          action: data.task_url ? <Button variant="link" className="text-emerald-400 p-0 h-auto" onClick={() => window.open(data.task_url, "_blank")}>Abrir no ClickUp</Button> : undefined,
        });
        onClose();
      }
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") { onClose(); return; }
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="border rounded-xl" style={{ background: "#111827", borderColor: "#1e293b", color: "#f1f5f9" }}>
        <DialogHeader>
          <DialogTitle className="text-lg" style={{ color: "#f1f5f9" }}>📋 Criar Tarefa no ClickUp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#94a3b8" }}>Título da tarefa</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="border rounded-lg" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }} />
          </div>
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#94a3b8" }}>Responsável *</label>
            {loadingMembers ? <div className="flex items-center gap-2 text-sm" style={{ color: "#94a3b8" }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div> : (
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="border rounded-lg" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent style={{ background: "#1e293b", borderColor: "#374151" }}>
                  {members.map(m => <SelectItem key={m.id} value={m.id} style={{ color: "#f1f5f9" }}>{m.name} <span className="text-xs ml-1" style={{ color: "#94a3b8" }}>({m.email})</span></SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#94a3b8" }}>Urgência</label>
            <Select value={urgencia} onValueChange={setUrgencia}>
              <SelectTrigger className="border rounded-lg" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1e293b", borderColor: "#374151" }}>
                <SelectItem value="1" style={{ color: "#f1f5f9" }}>🔴 Urgente</SelectItem>
                <SelectItem value="2" style={{ color: "#f1f5f9" }}>🟠 Alta</SelectItem>
                <SelectItem value="3" style={{ color: "#f1f5f9" }}>🟡 Normal</SelectItem>
                <SelectItem value="4" style={{ color: "#f1f5f9" }}>🔵 Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#94a3b8" }}>Observações</label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Adicione observações para a tarefa..." className="border rounded-lg min-h-[80px]" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="incluir" checked={incluirResposta} onCheckedChange={v => setIncluirResposta(!!v)} />
            <label htmlFor="incluir" className="text-sm cursor-pointer" style={{ color: "#94a3b8" }}>Incluir resposta do consultor como comentário na tarefa</label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border rounded-lg" style={{ borderColor: "#374151", color: "#94a3b8" }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading} className="rounded-lg text-white" style={{ background: "#10b981" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── SUGGESTIONS ───
const SUGGESTIONS = [
  "Como estão os leads esta semana?",
  "Quais negócios estão parados?",
  "Análise dos vendedores",
  "Resumo geral do período",
  "Quais conversas precisam de atenção?",
  "Monte um plano de ação semanal",
];

// ─── MARKDOWN COMPONENTS ───
const mdComponents: Record<string, React.FC<any>> = {
  table: ({ children, ...props }: any) => <div className="overflow-x-auto my-4"><table className="w-full text-sm border-collapse" style={{ borderColor: "#1e293b" }} {...props}>{children}</table></div>,
  thead: ({ children, ...props }: any) => <thead style={{ background: "#1e293b" }} {...props}>{children}</thead>,
  th: ({ children, ...props }: any) => <th className="px-3 py-2 text-left font-semibold border" style={{ borderColor: "#374151", color: "#f1f5f9" }} {...props}>{children}</th>,
  td: ({ children, ...props }: any) => <td className="px-3 py-2 border" style={{ borderColor: "#374151", color: "#94a3b8" }} {...props}>{children}</td>,
  tr: ({ children, ...props }: any) => <tr className="even:bg-[#1e293b]/50" {...props}>{children}</tr>,
  h1: ({ children, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-3" style={{ color: "#10b981" }} {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 className="text-xl font-bold mt-5 mb-2" style={{ color: "#10b981" }} {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: "#f1f5f9" }} {...props}>{children}</h3>,
  p: ({ children, ...props }: any) => <p className="mb-3 leading-relaxed" style={{ color: "#d1d5db" }} {...props}>{children}</p>,
  ul: ({ children, ...props }: any) => <ul className="list-disc pl-5 mb-3 space-y-1" style={{ color: "#d1d5db" }} {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="list-decimal pl-5 mb-3 space-y-1" style={{ color: "#d1d5db" }} {...props}>{children}</ol>,
  li: ({ children, ...props }: any) => <li {...props}><span style={{ color: "#10b981" }}>•</span> {children}</li>,
  a: ({ children, ...props }: any) => <a className="underline" style={{ color: "#10b981" }} target="_blank" rel="noopener" {...props}>{children}</a>,
  code: ({ children, inline, ...props }: any) => inline ? <code className="px-1.5 py-0.5 rounded text-sm" style={{ background: "#1e293b", color: "#10b981" }} {...props}>{children}</code> : <pre className="rounded-lg p-4 overflow-x-auto my-3 text-sm" style={{ background: "#0f172a", color: "#d1d5db" }}><code {...props}>{children}</code></pre>,
  strong: ({ children, ...props }: any) => <strong style={{ color: "#f1f5f9" }} {...props}>{children}</strong>,
};

// ─── DASHBOARD ───
const CrmDashboard = ({ token, userName, onLogout, onNeedLogin }: { token: string | null; userName: string; onLogout: () => void; onNeedLogin: () => void }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [periodoDias, setPeriodoDias] = useState(7);
  const [dadosCrm, setDadosCrm] = useState<any>(null);
  const [conversasCrm, setConversasCrm] = useState<any>(null);
  const [resumoRapido, setResumoRapido] = useState<string | null>(null);
  const [isLoadingCrm, setIsLoadingCrm] = useState(false);
  const [crmError, setCrmError] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [respostaMarkdown, setRespostaMarkdown] = useState<string | null>(null);
  const [respostaHtml, setRespostaHtml] = useState<string | null>(null);
  const [clickupOpen, setClickupOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem("gestor_crm_token");
    localStorage.removeItem("gestor_crm_user");
    toast({ title: "Autenticação necessária", description: "Faça login no Gestor CRM para continuar", variant: "destructive" });
    onNeedLogin();
  }, [onNeedLogin]);

  // Load clientes
  useEffect(() => {
    apiFetch("/clientes", { token })
      .then(d => setClientes(d.clientes || []))
      .catch(err => {
        if (err.message === "SESSION_EXPIRED") handleSessionExpired();
        else toast({ title: "Erro ao carregar clientes", variant: "destructive" });
      });
  }, [token]);

  // Load CRM on client/period change
  useEffect(() => {
    if (!clienteSelecionado) return;
    setIsLoadingCrm(true);
    setCrmError(false);
    setDadosCrm(null);
    setConversasCrm(null);
    setResumoRapido(null);
    setRespostaMarkdown(null);
    setRespostaHtml(null);

    apiFetch("/carregar-crm", {
      method: "POST", token, timeoutMs: 120000,
      body: JSON.stringify({ cliente_nome: clienteSelecionado.cliente_nome, periodo_dias: periodoDias }),
    })
      .then(d => {
        if (d.success) {
          setDadosCrm(d.dados_crm);
          setConversasCrm(d.conversas_crm);
          setResumoRapido(d.resumo_rapido || null);
        }
      })
      .catch(err => {
        if (err.message === "SESSION_EXPIRED") handleSessionExpired();
        else { setCrmError(true); toast({ title: "Erro ao carregar CRM", description: err.message, variant: "destructive" }); }
      })
      .finally(() => setIsLoadingCrm(false));
  }, [clienteSelecionado, periodoDias, token]);

  const handleSend = async (text?: string) => {
    const q = text || pergunta.trim();
    if (!q || !clienteSelecionado || !dadosCrm) return;
    setPergunta("");
    setIsLoadingChat(true);
    setRespostaMarkdown(null);
    setRespostaHtml(null);
    try {
      const data = await apiFetch("/chat", {
        method: "POST", token, timeoutMs: 120000,
        body: JSON.stringify({
          cliente_nome: clienteSelecionado.cliente_nome,
          segmento: clienteSelecionado.segmento,
          pergunta: q,
          dados_crm: dadosCrm,
          conversas_crm: conversasCrm,
        }),
      });
      if (data.success) {
        setRespostaMarkdown(data.resposta_markdown);
        setRespostaHtml(data.resposta_html || null);
      }
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") handleSessionExpired();
      else toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!respostaHtml) return;
    const blob = new Blob([respostaHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-crm-${clienteSelecionado?.cliente_nome || "report"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canChat = !!clienteSelecionado && !!dadosCrm && !isLoadingCrm;

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col" style={{ background: "#0b0f19" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ borderColor: "#1e293b", background: "#111827" }}>
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-1 text-sm" style={{ color: "#94a3b8" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h1 className="text-lg font-bold" style={{ color: "#f1f5f9" }}>Gestor CRM IA</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:inline" style={{ color: "#94a3b8" }}>Olá, {userName}</span>
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1 text-sm" style={{ color: "#94a3b8" }}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 md:px-6 py-4 border-b flex flex-wrap items-center gap-4" style={{ borderColor: "#1e293b" }}>
        <div className="w-full sm:w-64">
          <Select value={clienteSelecionado?.cliente_nome || ""} onValueChange={v => { const c = clientes.find(cl => cl.cliente_nome === v); if (c) setClienteSelecionado(c); }}>
            <SelectTrigger className="border rounded-lg h-10" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }}>
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent style={{ background: "#1e293b", borderColor: "#374151" }}>
              {clientes.map(c => <SelectItem key={c.cliente_nome} value={c.cliente_nome} style={{ color: "#f1f5f9" }}>{c.cliente_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select value={String(periodoDias)} onValueChange={v => setPeriodoDias(Number(v))}>
            <SelectTrigger className="border rounded-lg h-10" style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "#1e293b", borderColor: "#374151" }}>
              <SelectItem value="7" style={{ color: "#f1f5f9" }}>7 dias</SelectItem>
              <SelectItem value="14" style={{ color: "#f1f5f9" }}>14 dias</SelectItem>
              <SelectItem value="30" style={{ color: "#f1f5f9" }}>30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0">
          {isLoadingCrm && (
            <div className="flex items-center gap-2 text-sm animate-pulse" style={{ color: "#10b981" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados do CRM de {clienteSelecionado?.cliente_nome}...
            </div>
          )}
          {!isLoadingCrm && resumoRapido && (
            <div className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-2" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
              ✅ Dados carregados — {resumoRapido}
            </div>
          )}
          {!isLoadingCrm && crmError && (
            <div className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              ❌ Erro ao carregar dados
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {!respostaMarkdown && !isLoadingChat ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <MessageSquareText className="w-16 h-16 mb-4" style={{ color: "#374151" }} />
            <p className="text-lg" style={{ color: "#94a3b8" }}>Selecione um cliente e faça uma pergunta para começar a análise</p>
          </div>
        ) : isLoadingChat ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-4">
            <div className="space-y-3 w-full max-w-2xl">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ background: "#1e293b", width: `${85 - i * 10}%` }} />
              ))}
            </div>
            <p className="text-sm animate-pulse" style={{ color: "#94a3b8" }}>Analisando dados com IA... (pode levar até 30 segundos)</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl p-6 border" style={{ background: "#111827", borderColor: "#1e293b" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {respostaMarkdown || ""}
              </ReactMarkdown>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {respostaHtml && (
                <Button onClick={handleDownloadHtml} variant="outline" className="gap-2 rounded-lg border" style={{ borderColor: "#374151", color: "#f1f5f9", background: "#1e293b" }}>
                  <Download className="w-4 h-4" /> Baixar Relatório HTML
                </Button>
              )}
              <Button onClick={() => setClickupOpen(true)} variant="outline" className="gap-2 rounded-lg border" style={{ borderColor: "#374151", color: "#f1f5f9", background: "#1e293b" }}>
                <ClipboardList className="w-4 h-4" /> Criar Tarefa no ClickUp
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Input + Suggestions */}
      <div className="border-t px-4 md:px-6 py-4" style={{ borderColor: "#1e293b", background: "#111827" }}>
        {!respostaMarkdown && !isLoadingChat && canChat && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-4xl mx-auto">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => handleSend(s)} className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-emerald-500/50" style={{ borderColor: "#374151", color: "#94a3b8", background: "#1e293b" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder={isLoadingChat ? "Aguarde a análise..." : "Pergunte sobre vendas, leads, negócios, conversas..."}
            disabled={!canChat || isLoadingChat}
            className="flex-1 border rounded-lg h-11"
            style={{ background: "#1e293b", borderColor: "#374151", color: "#f1f5f9" }}
          />
          <Button onClick={() => handleSend()} disabled={!canChat || isLoadingChat || !pergunta.trim()} className="h-11 w-11 rounded-lg p-0" style={{ background: "#10b981" }}>
            {isLoadingChat ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
          </Button>
        </div>
      </div>

      {/* ClickUp Modal */}
      <ClickUpModal open={clickupOpen} onClose={() => setClickupOpen(false)} clienteSelecionado={clienteSelecionado} respostaMarkdown={respostaMarkdown} token={token} />
    </div>
  );
};

// ─── MAIN PAGE ───
const GestorCRM = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gestor_crm_token"));
  const [userName, setUserName] = useState<string>(localStorage.getItem("gestor_crm_user") || "");

  const handleLogin = (t: string, name: string) => { setToken(t); setUserName(name); };
  const handleLogout = () => {
    localStorage.removeItem("gestor_crm_token");
    localStorage.removeItem("gestor_crm_user");
    setToken(null);
    setUserName("");
  };

  if (!token) return <CrmLogin onLogin={handleLogin} />;
  return <CrmDashboard token={token} userName={userName} onLogout={handleLogout} />;
};

export default GestorCRM;
