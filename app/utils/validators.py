import re

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