import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, TrendingUp, Brain, BarChart2, MessageSquareText, FileBarChart } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchBatches, type Batch } from "@/lib/relatorios-utils";
import { WhatsAppStatusCard } from "@/components/WhatsAppStatusCard";

const channels = [
  {
    channel: "Google Ads",
    color: "#34a853",
    borderColor: "border-[#34a853]/30",
    bgAccent: "bg-[#34a853]",
    glowClass: "hover:shadow-[0_0_30px_rgba(52,168,83,0.15)]",
    labelBg: "bg-[#34a853]/10 text-[#34a853]",
    cards: [
      { title: "Criar Campanha", description: "Crie campanhas Google Ads com IA em minutos", icon: Rocket, path: "/criar-campanha" },
      { title: "Otimizar Campanha", description: "Otimizações inteligentes nas suas campanhas ativas", icon: TrendingUp, path: "/otimizar-campanha" },
      { title: "Gestor Google Ads", description: "Alertas, oportunidades e recomendações com IA", icon: Brain, path: "/gestor-ia" },
    ],
  },
  {
    channel: "Meta Ads",
    color: "#1877F2",
    borderColor: "border-[#1877F2]/30",
    bgAccent: "bg-[#1877F2]",
    glowClass: "hover:shadow-[0_0_30px_rgba(24,119,242,0.15)]",
    labelBg: "bg-[#1877F2]/10 text-[#1877F2]",
    cards: [
      { title: "Gestor Meta Ads", description: "Análise e otimização das suas campanhas no Facebook e Instagram", icon: BarChart2, path: "/gestor-meta" },
    ],
  },
  {
    channel: "Relatórios",
    color: "#8b5cf6",
    borderColor: "border-[#8b5cf6]/30",
    bgAccent: "bg-[#8b5cf6]",
    glowClass: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
    labelBg: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
    cards: [
      { title: "Relatórios Semanais", description: "Análises automáticas de todos os clientes", icon: FileBarChart, path: "/relatorios", hasBadge: true },
    ],
  },
  {
    channel: "CRM",
    color: "#10b981",
    borderColor: "border-emerald-500/30",
    bgAccent: "bg-emerald-500",
    glowClass: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    labelBg: "bg-emerald-500/10 text-emerald-400",
    cards: [
      { title: "Gestor CRM IA", description: "Consultoria de vendas e análise de dados em tempo real", icon: MessageSquareText, path: "/gestor-crm" },
    ],
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    fetchBatches().then(batches => {
      if (!Array.isArray(batches)) return;
      // Count criticos + atencao as "pendentes" needing review
      let total = 0;
      batches.forEach(b => {
        total += b.criticos + b.atencao;
      });
      setPendentes(total);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-16 pb-12">
      <div className="mb-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="text-gradient">Giga</span>{" "}
          <span className="text-foreground">Aceleradora</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Escolha uma funcionalidade para começar
        </p>
      </div>

      <div className="w-full max-w-6xl space-y-10">
        {channels.map((ch, ci) => (
          <motion.section
            key={ch.channel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.12, duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${ch.labelBg}`}>
                {ch.channel}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className={`grid gap-5 ${
              ch.cards.length === 1 ? "grid-cols-1 max-w-md"
                : ch.cards.length === 2 ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}>
              {ch.cards.map((card, i) => (
                <motion.button
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.12 + i * 0.08, duration: 0.35 }}
                  onClick={() => navigate(card.path)}
                  className={`group relative glass-card rounded-2xl p-7 text-left transition-all duration-300 cursor-pointer border ${ch.borderColor} hover:border-opacity-60 ${ch.glowClass}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ch.bgAccent} shadow-lg`}
                    style={{ boxShadow: `0 0 20px ${ch.color}30` }}
                  >
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1.5">{card.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  {"hasBadge" in card && (card as any).hasBadge && pendentes > 0 && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/25">
                      {pendentes} pendentes
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
};

export default Index;
