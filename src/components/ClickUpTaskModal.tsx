import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, Loader2, Calendar, User, List, Flag, Check, ChevronsUpDown } from "lucide-react";
import { MentionTextarea } from "@/components/MentionTextarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  onSuccess?: () => void;   // Callback quando tarefa é criada com sucesso
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
  searchable = false,
  searchPlaceholder = "Buscar...",
  getSearchText,
}: {
  icon: any;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: any[];
  loading?: boolean;
  renderOption?: (opt: any) => React.ReactNode;
  renderValue?: (opt: any) => React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (opt: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value || o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="w-full justify-between rounded-xl border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm font-normal text-white hover:border-purple-500/50 hover:bg-[#1a1a2e] hover:text-white"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-400" />
            ) : (
              <Icon className="h-4 w-4 shrink-0 text-purple-400" />
            )}
            <div className={cn("min-w-0 flex-1", !selected && "text-white/40")}>
              {selected ? (
                renderValue ? renderValue(selected) : selected.name || selected.label
              ) : loading ? (
                "Carregando..."
              ) : (
                placeholder
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/40" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="z-[120] w-[var(--radix-popover-trigger-width)] rounded-xl border border-white/10 bg-[#1a1a2e] p-0 text-white shadow-2xl shadow-black/50"
      >
        <Command className="rounded-xl bg-transparent text-white">
          {searchable && (
            <CommandInput
              placeholder={searchPlaceholder}
              className="border-white/5 text-white placeholder:text-white/25"
            />
          )}
          <CommandList className="max-h-44 overflow-y-auto">
            <CommandEmpty className="px-4 py-3 text-center text-sm text-white/40">
              Nenhum item encontrado
            </CommandEmpty>
            <CommandGroup className="p-1">
              {options.map((opt) => {
                const optionValue = opt.id || opt.value;
                const optionLabel = getSearchText
                  ? getSearchText(opt)
                  : opt.name || opt.label || opt.username || String(optionValue);

                return (
                  <CommandItem
                    key={optionValue}
                    value={optionLabel}
                    onSelect={() => {
                      onChange(optionValue);
                      setOpen(false);
                    }}
                    className="gap-3 rounded-lg px-3 py-3 text-sm text-white data-[selected=true]:bg-purple-500/10 data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 text-purple-400",
                        value === optionValue ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {renderOption ? renderOption(opt) : opt.name || opt.label}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── MODAL PRINCIPAL ─────────────────────────────────────────────
export function ClickUpTaskModal({
  isOpen,
  onClose,
  taskTitle,
  taskDescription = "",
  onSuccess,
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
        descricao: taskDescription.replace(/\\n/g, '\n'),
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
      onSuccess?.();
      setTimeout(() => {
        onClose();
        setSucesso(false);
        setListaSelecionada("");
        setResponsavelSelecionado("");
        setDataConclusao("");
        setPrioridade("");
        setObservacao("");
      }, 400);
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
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
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
                    searchable
                    searchPlaceholder="Buscar lista..."
                    getSearchText={(opt) => `${opt.name} ${opt.space || ""}`}
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
                    searchable
                    searchPlaceholder="Buscar responsável..."
                    getSearchText={(opt) => `${opt.username} ${opt.email}`}
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
                    Observação para a equipe <span className="text-emerald-400/60">(será postada como atividade)</span>
                  </label>
                  <MentionTextarea
                    value={observacao}
                    onChange={setObservacao}
                    members={membros}
                    placeholder="Adicionar observação... use @ para mencionar membros"
                    rows={3}
                    className="w-full pl-3 pr-3 py-3 rounded-xl bg-[#1a1a2e] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500 hover:border-white/20 transition-all resize-none"
                    hint={
                      <p className="text-[10px] text-emerald-400/50 mt-1">
                        Dica: use <span className="font-medium">@</span> para mencionar membros da equipe
                      </p>
                    }
                  />
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
