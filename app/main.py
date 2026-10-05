import logging
import os
from fastapi import FastAPI
from app import models, routes
from app.database import engine
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Garante que os logs da aplicação apareçam junto com os do uvicorn — é por
# onde sai o link de recuperação enquanto o SMTP não estiver configurado
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s [%(name)s] %(message)s"
)

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistema de gestão jurídica",
    version="0.1.0"
)

# CORS - permissões de acesso
origins = [
    settings.FRONTEND_URL,
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
app.include_router(routes.registro_router)
app.include_router(routes.datajud_router)
app.include_router(routes.documentos_router)
