from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip_keeps_subject_and_role():
    token = create_access_token(subject="user-1", role="admin")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-1"
    assert payload["role"] == "admin"


def test_tampered_token_is_rejected():
    token = create_access_token(subject="user-1", role="user")
    assert decode_access_token(token + "tampered") is None
