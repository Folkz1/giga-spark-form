import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MetaChatPanelProps {
  clienteNome: string;
  segmento: string;
  tipoNegocio: string;
  dadosAnalise: Record<string, any>;
  dadosMeta: Record<string, any>;
}

const CHAT_ENDPOINT = "https://principaln8o.gigainteligencia.com.br/webhook/meta-chat";

export function MetaChatPanel({ clienteNome, segmento, tipoNegocio, dadosAnalise, dadosMeta }: MetaChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const pergunta = input.trim();
    if (!pergunta || loading) return;

    const userMsg: ChatMessage = { role: "user", content: pergunta };
    const historico = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nome: clienteNome,
          segmento,
          tipo_negocio: tipoNegocio,
          pergunta,
          dados_analise: dadosAnalise,
          dados_meta: dadosMeta,
          historico,
        }),
      });

      let parsed: any;
      const raw = await res.text();
      try {
        const arr = JSON.parse(raw);
        parsed = Array.isArray(arr) ? (arr[0]?.json || arr[0]) : arr;
      } catch {
        parsed = { resposta_markdown: raw };
      }

      const resposta = parsed.resposta_markdown || parsed.resposta_html || "Sem resposta.";
      setMessages(prev => [...prev, { role: "assistant", content: resposta }]);
    } catch (err) {
      console.error("[META-CHAT]", err);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erro ao conectar com o servidor. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-lg shadow-[#25D366]/30"
              size="icon"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Assistente Meta Ads</p>
                  <p className="text-[11px] text-white/70">{clienteNome}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleNewConversation}
                  title="Nova conversa"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-[#0b141a]">
              <div className="p-4 space-y-3 min-h-full">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-[#25D366]" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-[260px]">
                      Pergunte qualquer coisa sobre a análise de <span className="font-medium text-foreground">{clienteNome}</span>
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#005C4B] text-white rounded-br-md"
                          : "bg-[#1f2c34] text-gray-100 rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_table]:text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1f2c34] text-gray-300 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm animate-pulse">Digitando...</span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 bg-[#1f2c34] border-t border-border/30 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta..."
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border-0 bg-[#2a3942] text-white placeholder:text-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#25D366]/50 max-h-[100px] overflow-y-auto"
                  style={{ minHeight: "40px" }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-10 w-10 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white shrink-0"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
