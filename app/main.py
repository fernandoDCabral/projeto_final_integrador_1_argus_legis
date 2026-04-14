from fastapi import FastAPI
from app import models, routes
from app.database import engine

# Cria tabelas no banco, se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Argus Legis API",
    description="Sistema de gestão jurídica",
    version="0.1.0"
)

@app.get("/")
def home():
    return {"status": "Argus Legis Online", "Version": "0.1.0"}

app.include_router(routes.escritorios_router)
app.include_router(routes.usuarios_router)
app.include_router(routes.clientes_router)
app.include_router(routes.processos_router)
app.include_router(routes.prazos_router)
