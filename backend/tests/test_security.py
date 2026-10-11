
from datetime import timedelta

from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
)


def test_password_is_hashed():
    password = "TestPassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_is_rejected():
    hashed = hash_password("CorrectPassword123!")

    assert not verify_password("WrongPassword123!", hashed)


def test_access_token_contains_user_data():
    token = create_access_token({"sub": "testuser"})
    payload = verify_access_token(token)

    assert payload is not None
    assert payload["sub"] == "testuser"
    assert "exp" in payload


def test_expired_token_is_rejected():
    token = create_access_token(
        {"sub": "testuser"},
        expires_delta=timedelta(seconds=-1),
    )

    assert verify_access_token(token) is None