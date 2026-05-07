from pydantic import BaseModel, EmailStr, ConfigDict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginUserResponse(BaseModel):
    id: int
    email: str

class LoginResponse(BaseModel):
    message: str
    user: LoginUserResponse
    model_config = ConfigDict(from_attributes=True)
