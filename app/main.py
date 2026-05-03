from fastapi import FastAPI
from app import models, routes
from app.database import engine
from fastapi.middleware.cors import CORSMiddleware

# Cria tabelas no banco, se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Argus Legis API",
    description="Sistema de gestão jurídica",
    version="0.1.0"
)

# CORS - permissões de acesso
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def home():
    return {"status": "Argus Legis Online", "Version": "0.1.0"}

app.include_router(routes.escritorios_router)
app.include_router(routes.usuarios_router)
app.include_router(routes.clientes_router)
app.include_router(routes.processos_router)
app.include_router(routes.prazos_router)
app.include_router(routes.autenticacoes_router)
