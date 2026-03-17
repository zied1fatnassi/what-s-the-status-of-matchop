from __future__ import annotations

from dataclasses import dataclass, field
import os
from typing import Any, Mapping

import httpx


@dataclass(slots=True)
class SupabaseRestClient:
    url: str
    service_role_key: str
    timeout: float = 30.0
    _client: httpx.Client = field(init=False, repr=False)

    def __post_init__(self) -> None:
        base_url = f"{self.url.rstrip('/')}/rest/v1"
        self._client = httpx.Client(
            base_url=base_url,
            timeout=self.timeout,
            headers={
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Accept": "application/json",
                "Accept-Profile": "public",
                "Content-Profile": "public",
                "Content-Type": "application/json",
            },
        )

    @classmethod
    def from_env(cls, timeout: float = 30.0) -> "SupabaseRestClient":
        url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
        if not url or not service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage writes.")
        return cls(url=url, service_role_key=service_role_key, timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "SupabaseRestClient":
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        _ = (exc_type, exc_value, traceback)
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Mapping[str, str] | None = None,
        headers: Mapping[str, str] | None = None,
        json: Any = None,
    ) -> Any:
        response = self._client.request(method, path, params=params, headers=headers, json=json)
        if response.status_code >= 400:
            raise RuntimeError(f"Supabase REST {method} {path} failed ({response.status_code}): {response.text}")

        if not response.content:
            return None

        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            return response.json()
        return response.text

    def select(
        self,
        table: str,
        *,
        filters: Mapping[str, str] | None = None,
        select: str = "*",
        limit: int | None = None,
        order: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {"select": select}
        if filters:
            params.update(filters)
        if limit is not None:
            params["limit"] = str(limit)
        if order:
            params["order"] = order
        result = self._request("GET", f"/{table}", params=params)
        return result or []

    def select_one(
        self,
        table: str,
        *,
        filters: Mapping[str, str],
        select: str = "*",
    ) -> dict[str, Any] | None:
        rows = self.select(table, filters=filters, select=select, limit=1)
        return rows[0] if rows else None

    def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        on_conflict: str,
    ) -> list[dict[str, Any]]:
        headers = {"Prefer": "resolution=merge-duplicates,return=representation"}
        result = self._request(
            "POST",
            f"/{table}",
            params={"on_conflict": on_conflict},
            headers=headers,
            json=rows,
        )
        return result or []

    def patch(
        self,
        table: str,
        *,
        filters: Mapping[str, str],
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        headers = {"Prefer": "return=representation"}
        result = self._request(
            "PATCH",
            f"/{table}",
            params=filters,
            headers=headers,
            json=payload,
        )
        return result or []

    def count(self, table: str, *, filters: Mapping[str, str] | None = None) -> int:
        params: dict[str, str] = {"select": "*", "limit": "1"}
        if filters:
            params.update(filters)
        response = self._client.get(f"/{table}", params=params, headers={"Prefer": "count=exact"})
        if response.status_code >= 400:
            raise RuntimeError(f"Supabase REST count {table} failed ({response.status_code}): {response.text}")
        content_range = response.headers.get("content-range", "")
        if "/" in content_range:
            total = content_range.split("/")[-1]
            if total.isdigit():
                return int(total)
        data = response.json() if response.content else []
        return len(data)
