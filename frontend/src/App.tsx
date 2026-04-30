// src/App.tsx
import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login"; // Vamos criar esse já já

function AppContent() {
  const { estaLogado, carregando, logout, usuario } = useAuth();

  // Enquanto o Context verifica o localStorage
  if (carregando) return <div>Carregando Argus Legis...</div>;

  return estaLogado ? (
    // Agora o Dashboard pode usar o nome do usuário vindo do contexto!
    <Dashboard nome={usuario?.nome} onLogout={logout} />
  ) : (
    <Login />
  );
}

export default function App() {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}