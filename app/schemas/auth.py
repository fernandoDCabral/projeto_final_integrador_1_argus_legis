from pydantic import BaseModel, EmailStr, ConfigDict

class LoginBase(BaseModel):
    email: EmailStr
    senha: str
    model_config = ConfigDict(from_attributes=True)