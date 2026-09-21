"""Popula a tabela `feriados` para um intervalo de anos.

Combina feriados nacionais calculados pela lib `holidays` (fixos e móveis,
incluindo Carnaval e Corpus Christi como pontos facultativos) com a lista
fixa de feriados estaduais do CE, municipais de Fortaleza e o recesso
forense (app/utils/feriados_fixos.py). A lista fixa é autoritativa: quando a
lib e a lista fixa indicam a mesma data (ex.: `subdiv="CE"` mistura feriados
estaduais/municipais entre os "públicos"/"facultativos" sem indicar a
esfera), a entrada fixa prevalece.

Uso:
    docker compose exec app python -m app.scripts.seed_feriados <ano_inicio> <ano_fim>
"""
import sys
from datetime import date

import holidays

from app.database import SessionLocal
from app.models import Feriado
from app.utils.feriados_fixos import feriados_fixos_ce_fortaleza, recesso_forense


def gerar_feriados(ano_inicio: int, ano_fim: int) -> dict[date, tuple[str, str]]:
    anos = list(range(ano_inicio, ano_fim + 1))
    feriados: dict[date, tuple[str, str]] = {}

    feriados_nacionais = holidays.Brazil(
        subdiv="CE", years=anos, categories=("public", "optional")
    )
    for data_feriado, descricao in feriados_nacionais.items():
        feriados[data_feriado] = (descricao, "nacional")

    for ano in anos:
        for data_feriado, descricao, tipo in feriados_fixos_ce_fortaleza(ano):
            feriados[data_feriado] = (descricao, tipo)
        for data_feriado, descricao, tipo in recesso_forense(ano):
            feriados[data_feriado] = (descricao, tipo)

    return feriados


def seed(ano_inicio: int, ano_fim: int) -> None:
    feriados = gerar_feriados(ano_inicio, ano_fim)
    db = SessionLocal()
    try:
        existentes = {
            f.data: f
            for f in db.query(Feriado).filter(Feriado.data.in_(feriados.keys())).all()
        }

        inseridos = 0
        atualizados = 0
        for data_feriado, (descricao, tipo) in feriados.items():
            existente = existentes.get(data_feriado)
            if existente:
                existente.descricao = descricao
                existente.tipo = tipo
                atualizados += 1
            else:
                db.add(Feriado(data=data_feriado, descricao=descricao, tipo=tipo))
                inseridos += 1

        db.commit()
        print(f"Feriados processados: {inseridos} inseridos, {atualizados} atualizados.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python -m app.scripts.seed_feriados <ano_inicio> <ano_fim>")
        sys.exit(1)

    seed(int(sys.argv[1]), int(sys.argv[2]))
