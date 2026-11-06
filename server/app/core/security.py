import hashlib
import hmac
import base64
import json
import time
import secrets
from typing import Optional, Dict, Any
from server.app.core.config import settings

# ----------------- PASSWORD HASHING (PBKDF2-HMAC-SHA256) -----------------
def hash_password(password: str) -> str:
    """Hash password menggunakan PBKDF2-HMAC-SHA256 dengan random salt 16-bytes."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikasi kecocokan password terhadap hash tersimpan."""
    try:
        salt, key_hex = hashed_password.split("$")
        check_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(check_key.hex(), key_hex)
    except Exception:
        return False

# ----------------- JWT COMPATIBLE SIGNED TOKEN ENGINE -----------------
def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _base64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(payload_data: Dict[str, Any], expires_delta_seconds: int = 86400 * 7) -> str:
    """Membuat Bearer Token JWT-compatible yang ditandatangani HMAC-SHA256."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = dict(payload_data)
    payload["iat"] = int(time.time())
    payload["exp"] = int(time.time()) + expires_delta_seconds

    header_b64 = _base64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _base64url_encode(json.dumps(payload).encode("utf-8"))
    signature_raw = f"{header_b64}.{payload_b64}".encode("utf-8")

    secret_bytes = settings.SECRET_KEY.encode("utf-8")
    sig = hmac.new(secret_bytes, signature_raw, hashlib.sha256).digest()
    sig_b64 = _base64url_encode(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Memverifikasi keaslian dan kedaluwarsa token JWT."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        signature_raw = f"{header_b64}.{payload_b64}".encode("utf-8")
        secret_bytes = settings.SECRET_KEY.encode("utf-8")
        expected_sig = hmac.new(secret_bytes, signature_raw, hashlib.sha256).digest()
        actual_sig = _base64url_decode(sig_b64)

        if not secrets.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp") and payload["exp"] < time.time():
            return None # Expired

        return payload
    except Exception:
        return None

