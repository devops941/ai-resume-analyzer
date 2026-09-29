"""Helpers for Prisma JSON columns.

prisma-client-py requires JSON column values to be wrapped in ``prisma.Json``;
plain dicts/lists are rejected by the query engine.
"""

from typing import Any

from prisma import Json


def to_json(value: Any) -> Json | None:
    if value is None:
        return None
    return Json(value)
