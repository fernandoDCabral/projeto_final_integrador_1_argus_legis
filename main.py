from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import engine, get_db

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

@app.post("/processos/", response_model=schemas.ProcessoResponse)
def criar_processo(processo: schemas.ProcessoCreate, 
                   db: Session = Depends(get_db)):
    novo_processo = models.Processo(**processo.model_dump())
    db.add(novo_processo)
    db.commit()
    db.refresh(novo_processo)
    return novo_processo

@app.get("/processos/", response_model=List[schemas.ProcessoResponse])
def listar_processos(db: Session = Depends(get_db)):
    processos = db.query(models.Processo).all()
    return processos

@app.get("/processos/{processo_id}/prazos", 
         response_model=List[schemas.PrazoResponse])
def listar_prazos_por_processo(id_processo: int, db: Session = Depends(get_db)):
    return db.query(models.Prazo).filter(
        models.Prazo.processo_id == id_processo).all()

@app.post("/escritorios/", response_model= schemas.EscritorioResponse)
def criar_escritorio(escritorio: schemas.EscritorioCreate, 
                     db: Session = Depends(get_db)):
    novo_escritorio = models.Escritorio(**escritorio.model_dump())
    db.add(novo_escritorio)
    db.commit()
    db.refresh(novo_escritorio)
    return novo_escritorio

@app.post("/usuarios/", response_model=schemas.UsuarioResponse)
def criar_usuario(usuario: schemas.UsuarioCreate, 
                  db: Session = Depends(get_db)):
    novo_usuario = models.Usuario(**usuario.model_dump())
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.post("/clientes/", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate,
                  db: Session = Depends(get_db)):
    novo_cliente = models.Cliente(**cliente.model_dump())
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

@app.post("/prazos/", response_model=schemas.PrazoResponse)
def criar_prazo(prazo: schemas.PrazoCreate, db: Session = Depends(get_db)):
    novo_prazo = models.Prazo(**prazo.model_dump())
    db.add(novo_prazo)
    db.commit()
    db.refresh(novo_prazo)
    return novo_prazo

@app.patch("/prazos/{prazo_id}", response_model=schemas.PrazoResponse)
def atualizar_status(prazo_id: int, 
                     dados_atualizados: schemas.PrazoUpdate,
                     db: Session = Depends(get_db)):
    prazo_atual = db.query(models.Prazo).filter(
        models.Prazo.id == prazo_id).first()
    if not prazo_atual:
        raise HTTPException(status_code=404, detail="Prazo não encontrado!")
    
    dados_dict = dados_atualizados.model_dump(exclude_unset=True)
    for chave, valor in dados_dict.items():
        setattr(prazo_atual, chave, valor)
    
    db.commit()
    db.refresh(prazo_atual)
    return prazo_atual

@app.delete("/prazos/{prazo_id}")
def excluir_prazo(prazo_id: int, db: Session = Depends(get_db)):
    prazo_para_excluir = db.query(models.Prazo).filter(
        models.Prazo.id == prazo_id).first()
    if not prazo_para_excluir:
        raise HTTPException(status_code=404, 
                            detail="Prazo não encontrado para exclusão!")
    
    db.delete(prazo_para_excluir)
    db.commit()
    return {"detail": f"Prazo {prazo_id} removido com sucesso!"}








