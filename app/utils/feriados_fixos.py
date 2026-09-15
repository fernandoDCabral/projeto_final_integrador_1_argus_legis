from datetime import date, timedelta

# Feriados estaduais do Ceará e municipais de Fortaleza: datas fixas por ano,
# confirmadas manualmente (não usar a lib `holidays` para estas — ver
# app/scripts/seed_feriados.py).
FERIADOS_ESTADUAIS_CE = [
    ((3, 19), "Dia de São José"),
    ((3, 25), "Data Magna do Ceará"),
]

FERIADOS_MUNICIPAIS_FORTALEZA = [
    ((8, 15), "Nossa Senhora da Assunção"),
]

# Recesso forense: 20/dez do ano informado a 20/jan do ano seguinte, inclusive.
_RECESSO_INICIO = (12, 20)
_RECESSO_FIM = (1, 20)


def feriados_fixos_ce_fortaleza(ano: int) -> list[tuple[date, str, str]]:
    """Feriados estaduais do CE e municipais de Fortaleza para o ano informado."""
    feriados = []
    for (mes, dia), descricao in FERIADOS_ESTADUAIS_CE:
        feriados.append((date(ano, mes, dia), descricao, "estadual"))
    for (mes, dia), descricao in FERIADOS_MUNICIPAIS_FORTALEZA:
        feriados.append((date(ano, mes, dia), descricao, "municipal"))
    return feriados


def recesso_forense(ano: int) -> list[tuple[date, str, str]]:
    """Dias do recesso forense de 20/dez/ano a 20/jan/(ano+1), um por dia."""
    inicio = date(ano, *_RECESSO_INICIO)
    fim = date(ano + 1, *_RECESSO_FIM)
    dias = []
    atual = inicio
    while atual <= fim:
        dias.append((atual, "Recesso forense", "recesso_forense"))
        atual += timedelta(days=1)
    return dias
