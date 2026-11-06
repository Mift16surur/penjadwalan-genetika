from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.app.api.deps import get_db, get_current_user
from server.app.models.user import User
from server.app.schemas.user import UserLogin, UserOut, TokenOut
from server.app.core.security import verify_password, create_access_token

router = APIRouter()

@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Login petugas/admin BAAK untuk mendapatkan Bearer Token."""
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password yang Anda masukkan salah."
        )

    if not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun ini telah dinonaktifkan. Hubungi Administrator."
        )

    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Mengambil profil user admin yang saat ini login."""
    return user

@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    """Logout akun admin."""
    return {"status": "success", "message": "Berhasil logout."}

