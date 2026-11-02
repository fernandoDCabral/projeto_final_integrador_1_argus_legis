import re
from fastapi import HTTPException

def validate_and_clean_numeric_string(
        value: str,
        expected_length: int,
        label: str
) -> str:
    clean_value = re.sub(r"\D", "", value)
    
    if len(clean_value) != expected_length:
        raise ValueError(
            f"{label} deve ter exatamente {expected_length} caracteres"
        )
    return clean_value

def padroniza_cpf(value: str) -> str:
    return validate_and_clean_numeric_string(value, 11, "CPF")

def padroniza_cnpj(value: str) -> str:
    return validate_and_clean_numeric_string(value, 14, "CNPJ")

def padroniza_cnj(value: str) -> str:
    return validate_and_clean_numeric_string(value, 20, "CNJ")

# As 27 UFs, para a OAB (Spec 014)
UFS = (
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
)

def padroniza_oab(numero: str | None, uf: str | None) -> tuple[str | None, str | None]:
    """
    OAB no formato do DJEN: número só com dígitos, sem zeros à esquerda, e
    UF em maiúscula. Os dois vazios = sem OAB (Spec 014).
    Erro vira 400 direto, e não 422, por isso o HTTPException.
    """
    numero = (numero or "").strip()
    uf = (uf or "").strip().upper()
    if not numero and not uf:
        return None, None
    if not numero or not uf:
        raise HTTPException(status_code=400, detail="Informe o número e a UF da OAB.")
    if not numero.isdigit() or int(numero) == 0:
        raise HTTPException(status_code=400, detail="O número da OAB deve ter só dígitos.")
    if uf not in UFS:
        raise HTTPException(status_code=400, detail="UF da OAB inválida.")
    # "00056977" vira "56977"
    return str(int(numero)), uf
