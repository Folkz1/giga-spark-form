import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, TrendingUp, Brain, BarChart2, MessageSquareText, FileBarChart, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { fetchBatches } from "@/lib/relatorios-utils";
import { WhatsAppStatusCard } from "@/components/WhatsAppStatusCard";

const googleAds = {
  channel: "Google Ads",
  iconBg: "bg-emerald-500/10",
  iconColor: "text-emerald-400",
  cards: [
    { title: "Criar Campanha", description: "Crie campanhas Google Ads com IA em minutos", icon: Rocket, path: "/criar-campanha" },
    { title: "Otimizar Campanha", description: "Otimizações inteligentes nas suas campanhas ativas", icon: TrendingUp, path: "/otimizar-campanha" },
  ],
};

const gestaoAnalise = {
  channel: "Gestão & Análise",
  cards: [
    { title: "Gestor Google Ads", description: "Alertas, oportunidades e recomendações com IA", icon: Brain, path: "/gestor-ia", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
    { title: "Gestor Meta Ads", description: "Análise e otimização das suas campanhas no Facebook e Instagram", icon: BarChart2, path: "/gestor-meta", iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
    { title: "Gestor CRM IA", description: "Consultoria de vendas e análise de dados em tempo real", icon: MessageSquareText, path: "/gestor-crm", iconBg: "bg-violet-500/10", iconColor: "text-violet-400" },
  ],
};

const formatDate = () => {
  const now = new Date();
  return now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 shrink-0">
      {label}
    </span>
    <div className="flex-1 h-px bg-slate-700/40" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const relatoriosRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBatches().then(batches => {
      if (!Array.isArray(batches)) return;
      let total = 0;
      batches.forEach(b => { total += b.criticos + b.atencao; });
      setPendentes(total);
    }).catch(() => {});
  }, []);

  let idx = 0;

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center px-6 lg:px-8 pt-10 pb-8">
      <div className="w-full max-w-[1200px]">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-10"
        >
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-400 mt-1 capitalize">{formatDate()}</p>
          {(offlineCount > 0 || pendentes > 0) && (
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              {offlineCount > 0 && (
                <button onClick={() => scrollTo(whatsappRef)} className="hover:text-slate-300 transition-colors cursor-pointer">
                  {offlineCount} instância{offlineCount !== 1 ? "s" : ""} offline
                </button>
              )}
              {offlineCount > 0 && pendentes > 0 && <span>·</span>}
              {pendentes > 0 && (
                <button onClick={() => scrollTo(relatoriosRef)} className="hover:text-slate-300 transition-colors cursor-pointer">
                  {pendentes} relatórios pendentes
                </button>
              )}
            </p>
          )}
        </motion.div>

        {/* ===== RELATÓRIOS ===== */}
        <div ref={relatoriosRef}>
          <SectionDivider label="Relatórios" />
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (idx++) * 0.05, duration: 0.4, ease: "easeOut" }}
              onClick={() => navigate("/relatorios")}
              className="group relative rounded-xl px-5 py-4 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5 md:col-span-2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
                    <FileBarChart className="w-[22px] h-[22px] text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white">Relatórios Semanais</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">Análises automáticas de todos os clientes</p>
                  </div>
                </div>
                {pendentes > 0 ? (
                  <div className="shrink-0 flex flex-col items-center px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 animate-[gentle-pulse_3s_ease-in-out_infinite]">
                    <span className="text-lg font-bold text-amber-400 leading-none">{pendentes}</span>
                    <span className="text-[10px] text-amber-400/80 font-medium">pendentes</span>
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                )}
              </div>
            </motion.button>
          </div>
        </div>

        {/* ===== WHATSAPP ===== */}
        <div ref={whatsappRef} className="mt-6">
          <SectionDivider label="WhatsApp" />
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (idx++) * 0.05, duration: 0.4, ease: "easeOut" }}
              className="md:col-span-2"
            >
              <WhatsAppStatusCard onOfflineCount={setOfflineCount} />
            </motion.div>
          </div>
        </div>

        {/* ===== GESTÃO & ANÁLISE ===== */}
        <div className="mt-10">
          <SectionDivider label="Gestão & Análise" />
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {gestaoAnalise.cards.map((card) => {
              const i = idx++;
              return (
                <motion.button
                  key={card.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                  onClick={() => navigate(card.path)}
                  className="group relative rounded-xl p-5 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${card.iconBg}`}>
                    <card.icon className={`w-[22px] h-[22px] ${card.iconColor}`} />
                  </div>
                  <h2 className="text-base font-semibold text-white mb-1">{card.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ===== GOOGLE ADS ===== */}
        <div className="mt-6">
          <SectionDivider label="Google Ads" />
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {googleAds.cards.map((card) => {
              const i = idx++;
              return (
                <motion.button
                  key={card.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                  onClick={() => navigate(card.path)}
                  className="group relative rounded-xl p-5 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${googleAds.iconBg}`}>
                    <card.icon className={`w-[22px] h-[22px] ${googleAds.iconColor}`} />
                  </div>
                  <h2 className="text-base font-semibold text-white mb-1">{card.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 mb-8 text-center">
          <p className="text-xs text-slate-600">Giga Aceleradora © 2026</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
