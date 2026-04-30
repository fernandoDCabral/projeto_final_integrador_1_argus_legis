// src/pages/Dashboard.tsx
import React from "react";

// 1. Definimos que o Dashboard agora aceita o onLogout
interface DashboardProps {
  onLogout: () => void;
  nome?: string;
}

export default function Dashboard({ onLogout, nome }: DashboardProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        margin: 0,
        fontFamily: "sans-serif",
      }}
    >
      {/* MENU LATERAL */}
      <aside
        style={{
          width: "250px",
          backgroundColor: "#1a2a3a",
          color: "white",
          padding: "20px",
          display: "flex", // Ativa o modo flex
          flexDirection: "column", // Organiza os itens em pé
          height: "100vh", // Força a altura da tela
          boxSizing: "border-box", // Garante que o padding não aumente o tamanho
        }}
      >
        {/* Conteúdo Superior (Logo e Menu) */}
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img
              src="/logo.jpg"
              alt="Logo"
              style={{ width: "100px", borderRadius: "8px" }}
            />
            <h2 style={{ color: "#D4AF37", marginTop: "10px" }}>Argus Legis</h2>
          </div>

          <ul style={{ listStyle: "none", padding: 0, lineHeight: "3em" }}>
            <li style={{ cursor: "pointer" }}>📊 Dashboard</li>
            <li style={{ cursor: "pointer" }}>📂 Processos</li>
            <li style={{ cursor: "pointer" }}>📅 Prazos</li>
          </ul>
        </div>

        {/* Botão Sair - O 'flex: 1' acima vai empurrar este botão para o rodapé */}
        <button
          onClick={onLogout}
          style={{
            backgroundColor: "#c0392b",
            color: "white",
            border: "none",
            padding: "12px",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
          }}
        >
          🚪 Sair do Sistema
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL (Main) */}
      <main style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <header
          style={{
            padding: "15px 30px",
            backgroundColor: "white",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: 0 }}>Painel do Advogado</h3>
        </header>
        <section style={{ padding: "30px" }}>
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h2>Bem-vindo ao sistema {nome}!</h2>
            <p>Você está logado com sucesso.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
