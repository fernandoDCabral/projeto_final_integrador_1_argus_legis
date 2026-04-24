// src/App.tsx
import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login"; // Vamos criar esse já já

function App() {
  // Esse "state" vai controlar se mostramos Login ou Dashboard
  const [estaLogado, setEstaLogado] = useState(false);

  return (
    <>
      {estaLogado ? (
        <Dashboard onLogout={() => setEstaLogado(false)}/>
      ) : (
        // Passamos a função de logar para dentro do Login
        <Login onLogin={() => setEstaLogado(true)} />
      )}
    </>
  );
}

export default App;