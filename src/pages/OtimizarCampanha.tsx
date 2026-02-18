import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OtimizarCampanha = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Giga</span>{" "}
            <span className="text-foreground">Aceleradora</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Otimização inteligente de campanhas Google Ads
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Em breve</h2>
          <p className="text-muted-foreground max-w-md">
            O módulo de otimização de campanhas está em desenvolvimento. Volte em breve!
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtimizarCampanha;
