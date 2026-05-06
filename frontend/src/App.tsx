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
    // Variáveis como nome e e-mail estão disponíveis para uso
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