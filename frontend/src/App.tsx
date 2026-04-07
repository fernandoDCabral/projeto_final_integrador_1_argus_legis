import React from "react";

function App() {
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
      {/* 1. MENU LATERAL (Sidebar) */}
      <aside
        style={{
          width: "250px",
          backgroundColor: "#1a2a3a",
          color: "white",
          padding: "20px",
        }}
      >
        {/* LOGO ADICIONADA AQUI */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src="/logo.jpg"
            alt="Argus Legis Logo"
            style={{
              width: "120px",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          />
          <h2
            style={{ color: "#D4AF37", marginTop: "10px", fontSize: "1.5rem" }}
          >
            Argus Legis
          </h2>
        </div>

        <hr style={{ borderColor: "#2c3e50" }} />

        <ul style={{ listStyle: "none", padding: 0, lineHeight: "3em" }}>
          <li style={{ cursor: "pointer", transition: "0.3s" }}>
            📊 Dashboard
          </li>
          <li style={{ cursor: "pointer" }}>📂 Processos</li>
          <li style={{ cursor: "pointer" }}>📅 Prazos</li>
          <li style={{ cursor: "pointer" }}>🔔 Notificações</li>
        </ul>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main
        style={{
          flex: 1,
          backgroundColor: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Cabeçalho superior */}
        <header
          style={{
            padding: "15px 30px",
            backgroundColor: "white",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: 0 }}>Painel do Advogado</h3>
        </header>

        {/* Área de trabalho (onde as telas vão aparecer) */}
        <section style={{ padding: "30px", flex: 1 }}>
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h2>Bem-vindo ao sistema de controle de prazos</h2>
            <p>Selecione uma opção no menu ao lado para começar.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
