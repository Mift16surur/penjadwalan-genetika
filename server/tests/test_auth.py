import pytest
from server.app.core.security import (
    hash_password, verify_password,
    create_access_token, verify_access_token
)

def test_password_hashing():
    raw = "rahasia123"
    hashed = hash_password(raw)

    assert hashed != raw
    assert "$" in hashed
    assert verify_password(raw, hashed) is True
    assert verify_password("passwordsalah", hashed) is False

def test_jwt_token_creation_and_decoding():
    data = {"sub": "user_123", "role": "BAAK", "username": "admin"}
    token = create_access_token(data, expires_delta_seconds=3600)

    assert isinstance(token, str)
    assert len(token.split(".")) == 3

    decoded = verify_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "BAAK"
    assert decoded["username"] == "admin"
    assert "exp" in decoded

def test_jwt_tampered_token_fails():
    data = {"sub": "user_123"}
    token = create_access_token(data)
    
    # Tamper payload
    parts = token.split(".")
    tampered_token = f"{parts[0]}.eyJhZG1pbiI6IHRydWV9.{parts[2]}"
    assert verify_access_token(tampered_token) is None

def test_login_api_endpoint(db_session):
    from server.app.api.v1.endpoints.auth import login
    from server.app.schemas.user import UserLogin
    from fastapi import HTTPException

    # Valid login
    res = login(UserLogin(username="admin", password="admin123"), db=db_session)
    assert res["user"].username == "admin"
    assert "access_token" in res
    assert res["token_type"] == "bearer"

    # Invalid password
    with pytest.raises(HTTPException) as exc_info:
        login(UserLogin(username="admin", password="wrongpassword"), db=db_session)
    assert exc_info.value.status_code == 401

def test_change_password_endpoint(db_session):
    from server.app.api.v1.endpoints.auth import login, change_password
    from server.app.schemas.user import UserLogin, ChangePasswordRequest
    from server.app.models.user import User
    from fastapi import HTTPException

    admin_user = db_session.query(User).filter(User.username == "admin").first()
    assert admin_user is not None

    # Salah password lama
    with pytest.raises(HTTPException) as exc:
        change_password(
            ChangePasswordRequest(old_password="salah", new_password="passwordBaru123"),
            db=db_session,
            current_user=admin_user
        )
    assert exc.value.status_code == 400

    # Sukses ganti password
    res = change_password(
        ChangePasswordRequest(old_password="admin123", new_password="passwordBaru123"),
        db=db_session,
        current_user=admin_user
    )
    assert "message" in res

    # Verifikasi bisa login dengan password baru
    login_res = login(UserLogin(username="admin", password="passwordBaru123"), db=db_session)
    assert login_res["user"].username == "admin"

def test_profile_update_endpoint(db_session):
    from server.app.api.v1.endpoints.auth import update_profile
    from server.app.schemas.user import ProfileUpdateRequest
    from server.app.models.user import User

    admin_user = db_session.query(User).filter(User.username == "admin").first()
    
    updated = update_profile(
        ProfileUpdateRequest(nama_lengkap="Nama Baru BAAK", email="new_baak@unu.ac.id"),
        db=db_session,
        current_user=admin_user
    )
    assert updated.nama_lengkap == "Nama Baru BAAK"
    assert updated.email == "new_baak@unu.ac.id"
