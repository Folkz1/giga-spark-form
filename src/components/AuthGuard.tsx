import { Navigate } from "react-router-dom";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const autenticado = sessionStorage.getItem("autenticado") === "true";
  if (!autenticado) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default AuthGuard;
