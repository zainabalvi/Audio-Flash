from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from auth.security import verify_access_token


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return payload

from auth.dependencies import get_current_user

@router.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "You are authenticated",
        "user_id": current_user.get("sub")
    }
