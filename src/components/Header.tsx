import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("autenticado");
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-card border-b border-border flex items-center justify-between px-6">
      <button
        onClick={() => navigate("/")}
        className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity"
      >
        <span className="text-gradient">Giga</span>{" "}
        <span className="text-foreground">Aceleradora</span>
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-foreground"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair
      </Button>
    </header>
  );
};

export default Header;
