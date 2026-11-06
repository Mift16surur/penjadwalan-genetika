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

def test_login_api_endpoint(client):
    # Valid login
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    res_data = res.json()
    assert "token" in res_data
    assert res_data["user"]["username"] == "admin"

    # Invalid password
    res_fail = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res_fail.status_code == 401
