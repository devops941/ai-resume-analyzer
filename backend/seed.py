"""Seed the default admin account and scoring settings.

Run from the backend folder:  python seed.py
"""

import asyncio
import json

from app.config import settings
from app.core.security import hash_password
from app.database import connect_db, db, disconnect_db


async def seed() -> None:
    await connect_db()

    email = settings.ADMIN_EMAIL.lower()
    existing = await db.user.find_unique(where={"email": email})
    if existing:
        if existing.role != "admin":
            await db.user.update(where={"id": existing.id}, data={"role": "admin"})
            print(f"Promoted existing user {email} to admin")
        else:
            print(f"Admin already exists: {email}")
    else:
        await db.user.create(
            data={
                "name": "Administrator",
                "email": email,
                "passwordHash": hash_password(settings.ADMIN_PASSWORD),
                "role": "admin",
            }
        )
        print(f"Created admin: {email}")

    default_settings = [
        ("ats_weights", {"file_format": 8, "keywords": 20, "formatting": 15, "content": 57}),
        ("scoring_rules", {"pass_threshold": 70, "excellent_threshold": 85}),
    ]
    # Stored as JSON strings because prisma-client-py cannot write native JSON fields.
    for key, value in default_settings:
        existing = await db.adminsetting.find_unique(where={"key": key})
        if existing:
            await db.adminsetting.update(where={"key": key}, data={"value": json.dumps(value)})
        else:
            await db.adminsetting.create(data={"key": key, "value": json.dumps(value)})
    print("Seeded admin settings")

    await disconnect_db()


if __name__ == "__main__":
    asyncio.run(seed())
