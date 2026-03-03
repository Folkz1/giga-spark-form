import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, ChevronDown, Loader2, Calendar, User, List, Flag, MessageSquare } from "lucide-react";

// ─── CONFIGURAÇÃO ────────────────────────────────────────────────
// Substitua pela URL do seu webhook n8n de busca de dados do ClickUp
const N8N_BUSCAR_DADOS_URL = "https://appn8o2.gigainteligencia.com.br/webhook/clickup-dados";
// Substitua pela URL do seu webhook n8n de criação de tarefa
const N8N_CRIAR_TAREFA_URL = "https://appn8o2.gigainteligencia.com.br/webhook/clickup-criar-tarefa";
// ─────────────────────────────────────────────────────────────────

interface ClickUpTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;        // Título já preenchido vindo da análise IA
  taskDescription?: string; // Descrição opcional vinda da análise
}

interface ClickUpList {
  id: string;
  name: string;
  space?: string;
}

interface ClickUpMember {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

const PRIORIDADES = [
  { value: "urgent", label: "Urgente", color: "#FF4444" },
  { value: "high",   label: "Alta",    color: "#FF8C00" },
  { value: "normal", label: "Normal",  color: "#7B68EE" },
  { value: "low",    label: "Baixa",   color: "#4CAF50" },
];

// ─── COMPONENTE SELECT CUSTOMIZADO ───────────────────────────────
function CustomSelect({
  icon: Icon,
  placeholder,
  value,
  onChange,
  options,
  loading,
  renderOption,
  renderValue,
}: {
  icon: any;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: any[];
  loading?: boolean;
  renderOption?: (opt: any) => React.ReactNode;
  renderValue?: (opt: any) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value || o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-white/10 text-sm text-white hover:border-purple-500/50 transition-all duration-200 focus:outline-none focus:border-purple-500"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
        ) : (
          <Icon className="w-4 h-4 text-purple-400 shrink-0" />
        )}
        <span className={`flex-1 text-left ${!selected ? "text-white/40" : "text-white"}`}>
          {selected
            ? renderValue
              ? renderValue(selected)
              : selected.name || selected.label
            : loading
            ? "Carregando..."
            : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden max-h-52 overflow-y-auto"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-white/40 text-center">
                Nenhum item encontrado
              </div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id || opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.id || opt.value);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-purple-500/10 transition-colors text-left"
                >
                  {renderOption ? renderOption(opt) : opt.name || opt.label}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── MODAL PRINCIPAL ─────────────────────────────────────────────
export function ClickUpTaskModal({
  isOpen,
  onClose,
  taskTitle,
  taskDescription = "",
}: ClickUpTaskModalProps) {
  const [listas, setListas] = useState<ClickUpList[]>([]);
  const [membros, setMembros] = useState<ClickUpMember[]>([]);
  const [loadingDados, setLoadingDados] = useState(false);

  const [listaSelecionada, setListaSelecionada] = useState("");
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("");
  const [dataConclusao, setDataConclusao] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [observacao, setObservacao] = useState("");

  const [criando, setCriando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Buscar listas e membros ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setSucesso(false);
    setErro("");
    setLoadingDados(true);

    fetch(N8N_BUSCAR_DADOS_URL)
      .then((r) => r.json())
      .then((data) => {
        setListas(data.listas || []);
        setMembros(data.membros || []);
      })
      .catch(() => setErro("Não foi possível carregar dados do ClickUp."))
      .finally(() => setLoadingDados(false));
  }, [isOpen]);

  const handleCriar = async () => {
    if (!listaSelecionada) {
      setErro("Selecione uma lista.");
      return;
    }
    setCriando(true);
    setErro("");

    try {
      const body = {
        titulo: taskTitle,
        descricao: taskDescription,
        lista_id: listaSelecionada,
        responsavel_id: responsavelSelecionado || null,
        data_conclusao: dataConclusao || null,
        prioridade: prioridade || "normal",
        observacao: observacao || null,
      };

      const res = await fetch(N8N_CRIAR_TAREFA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Erro ao criar tarefa");
      setSucesso(true);
      setTimeout(() => {
        onClose();
        setSucesso(false);
        // Reset
        setListaSelecionada("");
        setResponsavelSelecionado("");
        setDataConclusao("");
        setPrioridade("");
        setObservacao("");
      }, 1800);
    } catch {
      setErro("Erro ao criar tarefa no ClickUp. Tente novamente.");
    } finally {
      setCriando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md pointer-events-auto rounded-2xl bg-[#12121f] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-base font-semibold text-white flex-1">
                  Criar tarefa no ClickUp
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Título da tarefa (read-only) */}
              <div className="px-6 pt-4 pb-2">
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-3">
                  <p className="text-xs text-purple-400 font-medium mb-1">Tarefa</p>
                  <p className="text-sm text-white font-medium leading-snug">{taskTitle}</p>
                </div>
              </div>

              {/* Campos */}
              <div className="px-6 py-4 space-y-3">
                {/* Lista */}
                <div>
                  <label className="text-xs text-white/40 font-medium mb-1.5 block">
                    Lista <span className="text-purple-400">*</span>
                  </label>
                  <CustomSelect
                    icon={List}
                    placeholder="Selecionar lista..."
                    value={listaSelecionada}
                    onChange={setListaSelecionada}
                    options={listas}
                    loading={loadingDados}
                    renderOption={(opt) => (
                      <div>
                        <span className="text-white">{opt.name}</span>
                        {opt.space && (
                          <span className="text-white/30 text-xs ml-2">{opt.space}</span>
                        )}
                      </div>
                    )}
                    renderValue={(opt) => opt.name}
                  />
                </div>

                {/* Responsável */}
                <div>
                  <label className="text-xs text-white/40 font-medium mb-1.5 block">
                    Responsável <span className="text-white/20">(opcional)</span>
                  </label>
                  <CustomSelect
                    icon={User}
                    placeholder="Selecionar responsável..."
                    value={responsavelSelecionado}
                    onChange={setResponsavelSelecionado}
                    options={membros}
                    loading={loadingDados}
                    renderOption={(opt) => (
                      <div className="flex items-center gap-2">
                        {opt.profilePicture ? (
                          <img src={opt.profilePicture} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-bold">
                            {opt.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{opt.username}</span>
                        <span className="text-white/30 text-xs">{opt.email}</span>
                      </div>
                    )}
                    renderValue={(opt) => opt.username}
                  />
                </div>

                {/* Data + Prioridade lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Data */}
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">
                      Data de conclusão
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dataConclusao}
                        onChange={(e) => setDataConclusao(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#1a1a2e] border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500 hover:border-white/20 transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">
                      Prioridade
                    </label>
                    <CustomSelect
                      icon={Flag}
                      placeholder="Selecionar..."
                      value={prioridade}
                      onChange={setPrioridade}
                      options={PRIORIDADES}
                      renderOption={(opt) => (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                          {opt.label}
                        </div>
                      )}
                      renderValue={(opt) => (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                          {opt.label}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="text-xs text-white/40 font-medium mb-1.5 block">
                    Observação para a equipe <span className="text-white/20">(opcional)</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-purple-400 pointer-events-none" />
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Adicionar observação para a equipe..."
                      rows={3}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#1a1a2e] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500 hover:border-white/20 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Erro */}
                {erro && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {erro}
                  </motion.p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriar}
                  disabled={criando || sucesso}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  {criando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : sucesso ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Criado!
                    </>
                  ) : (
                    "Criar tarefa"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
