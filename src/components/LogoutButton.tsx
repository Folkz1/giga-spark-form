import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const LogoutButton = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    sessionStorage.removeItem("autenticado");
    navigate("/login");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="fixed top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sair
    </Button>
  );
};

export default LogoutButton;
