from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    nama_lengkap: str
    role: str = "ADMIN"
    aktif: bool = True

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(UserBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    nama_lengkap: Optional[str] = None

class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    nama_lengkap: Optional[str] = None
    role: Optional[str] = None
    aktif: Optional[bool] = None
    password: Optional[str] = None # Jika ingin mereset password

