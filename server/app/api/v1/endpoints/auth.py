from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from server.app.api.deps import get_db, get_current_user
from server.app.models.user import User
from server.app.schemas.user import (
    UserLogin, UserOut, TokenOut, UserCreate,
    ChangePasswordRequest, ProfileUpdateRequest, UserAdminUpdate
)
from server.app.core.security import verify_password, hash_password, create_access_token

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

@router.put("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengubah password akun admin yang sedang login."""
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password lama yang Anda masukkan salah."
        )

    if len(payload.new_password.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password baru minimal terdiri dari 5 karakter."
        )

    current_user.password_hash = hash_password(payload.new_password.strip())
    db.commit()

    return {
        "status": "success",
        "message": "Password berhasil diubah. Silakan gunakan password baru pada login berikutnya."
    }

@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Memperbarui informasi profil (nama lengkap, username, email)."""
    if payload.username and payload.username.strip() != current_user.username:
        new_username = payload.username.strip()
        existing = db.query(User).filter(User.username == new_username).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{new_username}' sudah digunakan oleh akun lain."
            )
        current_user.username = new_username

    if payload.nama_lengkap:
        current_user.nama_lengkap = payload.nama_lengkap.strip()

    if payload.email is not None:
        current_user.email = payload.email.strip() if payload.email else None

    db.commit()
    db.refresh(current_user)
    return current_user

# ----------------- MANAJEMEN AKUN PETUGAS (CRUD USERS) -----------------
@router.get("/users", response_model=List[UserOut])
def list_admin_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Melihat daftar seluruh akun petugas BAAK."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserOut)
def create_admin_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Menambahkan akun petugas BAAK baru."""
    username = payload.username.strip()
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username}' sudah terdaftar."
        )

    new_user = User(
        username=username,
        email=payload.email.strip() if payload.email else None,
        nama_lengkap=payload.nama_lengkap.strip(),
        password_hash=hash_password(payload.password.strip()),
        role=payload.role or "ADMIN",
        aktif=payload.aktif
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserOut)
def update_admin_user(
    user_id: uuid.UUID,
    payload: UserAdminUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengedit akun petugas lain atau mereset password-nya."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Akun petugas tidak ditemukan.")

    if payload.username and payload.username.strip() != target_user.username:
        new_username = payload.username.strip()
        existing = db.query(User).filter(User.username == new_username).first()
        if existing and existing.id != target_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{new_username}' sudah digunakan."
            )
        target_user.username = new_username

    if payload.nama_lengkap:
        target_user.nama_lengkap = payload.nama_lengkap.strip()

    if payload.email is not None:
        target_user.email = payload.email.strip() if payload.email else None

    if payload.role:
        target_user.role = payload.role

    if payload.aktif is not None:
        target_user.aktif = payload.aktif

    if payload.password and payload.password.strip():
        target_user.password_hash = hash_password(payload.password.strip())

    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Menonaktifkan / menghapus akun petugas BAAK."""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menghapus akun Anda sendiri saat sedang login."
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Akun petugas tidak ditemukan.")

    target_user.aktif = False
    db.commit()
    return {"status": "success", "message": f"Akun '{target_user.username}' berhasil dinonaktifkan."}

@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    """Logout akun admin."""
    return {"status": "success", "message": "Berhasil logout."}

