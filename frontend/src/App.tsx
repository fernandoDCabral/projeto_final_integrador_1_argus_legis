// src/App.tsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CadastroEscritorio from "./pages/CadastroEscritorio";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

type TelaPublica = "login" | "cadastro" | "esqueci";

function AppContent() {
  const { estaLogado, carregando } = useAuth();
  // O projeto ainda não usa router, então a tela pública é escolhida por estado
  const [telaPublica, setTelaPublica] = useState<TelaPublica>("login");

  // O link de recuperação chega como ?token=... na raiz. Ler da querystring
  // dispensa router e funciona igual no dev server e em hospedagem estática
  const [tokenReset, setTokenReset] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("token")
  );

  const encerrarRedefinicao = () => {
    // Tira o token da barra de endereços para o link não ficar no histórico
    window.history.replaceState({}, "", window.location.pathname);
    setTokenReset(null);
    setTelaPublica("login");
  };

  // Enquanto o Context verifica o localStorage
  if (carregando) return <div>Carregando Argus Legis...</div>;

  // O link de redefinição tem prioridade: quem chegou por ele veio
  // justamente porque não consegue entrar
  if (tokenReset) {
    return <RedefinirSenha token={tokenReset} onConcluir={encerrarRedefinicao} />;
  }

  if (estaLogado) return <Dashboard />;

  if (telaPublica === "cadastro") {
    return <CadastroEscritorio onVoltarParaLogin={() => setTelaPublica("login")} />;
  }

  if (telaPublica === "esqueci") {
    return <EsqueciSenha onVoltarParaLogin={() => setTelaPublica("login")} />;
  }

  return (
    <Login
      onIrParaCadastro={() => setTelaPublica("cadastro")}
      onIrParaEsqueciSenha={() => setTelaPublica("esqueci")}
    />
  );
}

export default function App() {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
