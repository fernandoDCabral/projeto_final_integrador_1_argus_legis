from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginUserResponse(BaseModel):
    id: int
    email: str

class LoginResponse(BaseModel):
    message: str
    user: LoginUserResponse