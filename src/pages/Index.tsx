import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, TrendingUp, Brain, BarChart2, MessageSquareText, FileBarChart, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchBatches } from "@/lib/relatorios-utils";
import { WhatsAppStatusCard } from "@/components/WhatsAppStatusCard";

const googleAds = {
  channel: "Google Ads",
  iconBg: "bg-emerald-500/10",
  iconColor: "text-emerald-400",
  cards: [
    { title: "Criar Campanha", description: "Crie campanhas Google Ads com IA em minutos", icon: Rocket, path: "/criar-campanha" },
    { title: "Otimizar Campanha", description: "Otimizações inteligentes nas suas campanhas ativas", icon: TrendingUp, path: "/otimizar-campanha" },
    { title: "Gestor Google Ads", description: "Alertas, oportunidades e recomendações com IA", icon: Brain, path: "/gestor-ia" },
  ],
};

const outrasFerramentas = {
  channel: "Outras Ferramentas",
  cards: [
    { title: "Gestor Meta Ads", description: "Análise e otimização das suas campanhas no Facebook e Instagram", icon: BarChart2, path: "/gestor-meta", iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
    { title: "Gestor CRM IA", description: "Consultoria de vendas e análise de dados em tempo real", icon: MessageSquareText, path: "/gestor-crm", iconBg: "bg-violet-500/10", iconColor: "text-violet-400" },
  ],
};

const relatorios = {
  channel: "Relatórios",
  iconBg: "bg-amber-500/10",
  iconColor: "text-amber-400",
  cards: [
    { title: "Relatórios Semanais", description: "Análises automáticas de todos os clientes", icon: FileBarChart, path: "/relatorios", hasBadge: true },
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

const GroupDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 shrink-0">
      {label}
    </span>
    <div className="flex-1 h-px bg-slate-700/50" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    fetchBatches().then(batches => {
      if (!Array.isArray(batches)) return;
      let total = 0;
      batches.forEach(b => { total += b.criticos + b.atencao; });
      setPendentes(total);
    }).catch(() => {});
  }, []);

  let idx = 0;

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
        </motion.div>

        {/* ===== MONITORAMENTO ===== */}
        <div>
          <GroupDivider label="Monitoramento" />

          {/* Relatórios */}
          <div className="mt-6 space-y-3">
            <SectionDivider label="Relatórios" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatorios.cards.map((card) => {
                const i = idx++;
                return (
                  <motion.button
                    key={card.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    onClick={() => navigate(card.path)}
                    className="group relative rounded-xl p-6 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5 md:col-span-2"
                  >
                    <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${relatorios.iconBg}`}>
                      <card.icon className={`w-[22px] h-[22px] ${relatorios.iconColor}`} />
                    </div>
                    <h2 className="text-base font-semibold text-white mb-1">{card.title}</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                    {card.hasBadge && pendentes > 0 && (
                      <span className="absolute top-5 right-5 group-hover:right-10 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium border border-amber-500/25 transition-all duration-200">
                        {pendentes} pendentes
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="mt-6 space-y-3">
            <SectionDivider label="WhatsApp" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx++) * 0.05, duration: 0.4, ease: "easeOut" }}
                className="md:col-span-2"
              >
                <WhatsAppStatusCard />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ===== FERRAMENTAS ===== */}
        <div className="mt-10">
          <GroupDivider label="Ferramentas" />

          {/* Google Ads */}
          <div className="mt-6 space-y-3">
            <SectionDivider label="Google Ads" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {googleAds.cards.map((card) => {
                const i = idx++;
                return (
                  <motion.button
                    key={card.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    onClick={() => navigate(card.path)}
                    className="group relative rounded-xl p-6 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${googleAds.iconBg}`}>
                      <card.icon className={`w-[22px] h-[22px] ${googleAds.iconColor}`} />
                    </div>
                    <h2 className="text-base font-semibold text-white mb-1">{card.title}</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Outras Ferramentas (Meta Ads + CRM) */}
          <div className="mt-6 space-y-3">
            <SectionDivider label="Outras Ferramentas" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {outrasFerramentas.cards.map((card) => {
                const i = idx++;
                return (
                  <motion.button
                    key={card.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    onClick={() => navigate(card.path)}
                    className="group relative rounded-xl p-6 text-left bg-slate-800/40 border border-slate-700/40 transition-all duration-200 cursor-pointer hover:translate-y-[-2px] hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${card.iconBg}`}>
                      <card.icon className={`w-[22px] h-[22px] ${card.iconColor}`} />
                    </div>
                    <h2 className="text-base font-semibold text-white mb-1">{card.title}</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                  </motion.button>
                );
              })}
            </div>
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
