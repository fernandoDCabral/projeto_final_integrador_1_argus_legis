from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

# Caminho do projeto
current_dir = os.path.dirname(os.path.abspath(__file__))
# Caminho do arquivo .env
env_path = os.path.join(current_dir, "../../.env")

class Settings(BaseSettings):
    DATABASE_URL: str = Field(default=...)
    SECRET_KEY: str = Field(default=...)
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)
    APP_NAME: str = Field(default="Argus Legis")
    DEBUG: bool = Field(default=False)
    FRONTEND_URL: str = Field(default="http://localhost:5173")

    # Envio de e-mail (recuperação de senha).
    # Sem SMTP_USER/SMTP_PASSWORD preenchidos o sistema continua funcionando:
    # em vez de enviar, ele escreve o link no log do servidor.
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM_NAME: str = Field(default="Argus Legis")

    # Validade do link de recuperação. Curta de propósito: é um link que
    # troca senha sem pedir a antiga
    RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=60)

    # Consulta pública ao DataJud (CNJ). A chave é pública, publicada pelo
    # próprio CNJ em https://datajud-wiki.cnj.jus.br/api-publica/acesso/, e
    # pode ser trocada por eles a qualquer momento — basta sobrescrever no .env
    DATAJUD_API_KEY: str = Field(default="cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==")

    @property
    def email_configurado(self) -> bool:
        return bool(self.SMTP_USER and self.SMTP_PASSWORD)

    model_config = SettingsConfigDict(
        env_file=env_path,
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()