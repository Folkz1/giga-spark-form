import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, TrendingUp, Brain, BarChart2, MessageSquareText } from "lucide-react";

const cards = [
  {
    title: "Criar Campanha Google Ads",
    description: "Crie campanhas Google Ads com IA em minutos",
    icon: Rocket,
    path: "/criar-campanha",
    disabled: false,
  },
  {
    title: "Otimizar Campanha Google Ads",
    description: "Identifique e aplique otimizações inteligentes nas suas campanhas Google Ads",
    icon: TrendingUp,
    path: "/otimizar-campanha",
    disabled: false,
  },
  {
    title: "Gestor de Tráfego IA",
    description: "Análise inteligente das suas campanhas com alertas, oportunidades e recomendações",
    icon: Brain,
    path: "/gestor-ia",
    disabled: false,
  },
  {
    title: "Gestor Meta Ads",
    description: "Análise e otimização inteligente das suas campanhas Meta Ads",
    icon: BarChart2,
    path: "/gestor-meta",
    disabled: false,
    metaBlue: true,
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="text-gradient">Giga</span>{" "}
          <span className="text-foreground">Aceleradora</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Escolha uma funcionalidade para começar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {cards.map((card, i) => (
          <motion.button
            key={card.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onClick={() => !card.disabled && navigate(card.path)}
            disabled={card.disabled}
            className={`group relative glass-card rounded-2xl p-8 text-left transition-all duration-300 ${
              card.disabled
                ? "opacity-50 cursor-not-allowed grayscale"
                : "hover:border-primary/40 hover:glow-primary cursor-pointer"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                card.disabled
                  ? "bg-muted"
                  : (card as any).metaBlue
                    ? "bg-[#1877F2] shadow-[0_0_20px_rgba(24,119,242,0.3)]"
                    : "gradient-primary glow-primary"
              }`}
            >
              <card.icon
                className={`w-7 h-7 ${
                  card.disabled ? "text-muted-foreground" : "text-white"
                }`}
              />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              {card.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>

            {card.disabled && (
              <div className="absolute top-4 right-4">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Index;
