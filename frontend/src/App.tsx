// src/App.tsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CadastroEscritorio from "./pages/CadastroEscritorio";

type TelaPublica = "login" | "cadastro";

function AppContent() {
  const { estaLogado, carregando } = useAuth();
  // O projeto ainda não usa router, então a tela pública é escolhida por estado
  const [telaPublica, setTelaPublica] = useState<TelaPublica>("login");

  // Enquanto o Context verifica o localStorage
  if (carregando) return <div>Carregando Argus Legis...</div>;

  if (estaLogado) return <Dashboard />;

  if (telaPublica === "cadastro") {
    return <CadastroEscritorio onVoltarParaLogin={() => setTelaPublica("login")} />;
  }

  return <Login onIrParaCadastro={() => setTelaPublica("cadastro")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
