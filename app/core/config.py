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

    model_config = SettingsConfigDict(
        env_file=env_path,
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()