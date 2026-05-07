// src/App.tsx
import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login"; 

function AppContent() {
  const { estaLogado, carregando } = useAuth();

  // Enquanto o Context verifica o localStorage
  if (carregando) return <div>Carregando Argus Legis...</div>;

  return estaLogado ? <Dashboard /> : <Login />;
}

export default function App() {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}