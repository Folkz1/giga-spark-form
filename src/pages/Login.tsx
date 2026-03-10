import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((usuario === "giga" && senha === "giga2024") || (usuario === "bento" && senha === "2026")) {
      sessionStorage.setItem("autenticado", "true");
      navigate("/");
    } else {
      setErro("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="glass-card rounded-2xl p-8 w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">Giga</span>{" "}
            <span className="text-foreground">Aceleradora</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Faça login para continuar
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário</Label>
            <Input
              id="usuario"
              value={usuario}
              onChange={(e) => { setUsuario(e.target.value); setErro(""); }}
              placeholder="Digite seu usuário"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setErro(""); }}
              placeholder="Digite sua senha"
            />
          </div>
        </div>

        {erro && (
          <p className="text-sm text-destructive text-center font-medium">{erro}</p>
        )}

        <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold">
          Entrar
        </Button>
      </form>
    </div>
  );
};

export default Login;
