from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Any


@dataclass
class StripeSubscription:
    id: str
    current_period_end: Optional[int] = None


class StripeClient:
    """Wrapper around Stripe SDK (supports classic and modern typed SDKs).

    - Classic usage: `import stripe; stripe.api_key=...; stripe.Subscription.retrieve(...)`
    - Modern typed SDK: `import stripe; client = stripe.StripeClient(api_key); client.subscriptions.retrieve(...)`

    This wrapper detects available APIs at runtime and adapts accordingly.
    """

    def __init__(self, api_key: str) -> None:
        try:
            import stripe  # type: ignore
        except Exception as e:  # pragma: no cover - import error path
            raise RuntimeError("stripe SDK not available") from e
        self._stripe = stripe
        self._api_key = api_key

        # Try to prefer modern typed client if available
        self._modern_client: Optional[Any] = None
        try:
            modern_cls = getattr(stripe, "StripeClient", None) or getattr(stripe, "Stripe", None)
            if modern_cls is not None:
                # Some versions use StripeClient, newer may expose Stripe()
                self._modern_client = modern_cls(api_key=api_key)  # type: ignore[call-arg]
        except Exception:
            self._modern_client = None

        if self._modern_client is None:
            # Fallback to classic global api_key style
            self._stripe.api_key = api_key

    def _to_sub(self, sub: Any) -> StripeSubscription:
        # Stripe objects behave like dicts with attributes as well
        sid = getattr(sub, "id", None) or (sub.get("id") if isinstance(sub, dict) else None)
        cpe = getattr(sub, "current_period_end", None)
        if cpe is None and isinstance(sub, dict):
            cpe = sub.get("current_period_end")
        return StripeSubscription(id=str(sid) if sid is not None else "", current_period_end=cpe)

    def cancel_at_period_end(self, subscription_id: str) -> StripeSubscription:
        if self._modern_client is not None:
            # Modern client: subscriptions.update(id, {cancel_at_period_end: True})
            try:
                sub = self._modern_client.subscriptions.update(  # type: ignore[attr-defined]
                    subscription_id,
                    {"cancel_at_period_end": True},
                )
                return self._to_sub(sub)
            except Exception:
                # Fallback to modify on classic API in case of mismatch
                pass
        # Classic
        sub = self._stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        return self._to_sub(sub)

    def get_subscription(self, subscription_id: str) -> StripeSubscription:
        if self._modern_client is not None:
            try:
                sub = self._modern_client.subscriptions.retrieve(subscription_id)  # type: ignore[attr-defined]
                return self._to_sub(sub)
            except Exception:
                pass
        sub = self._stripe.Subscription.retrieve(subscription_id)
        return self._to_sub(sub)


_cached_client: Optional[StripeClient] = None


def get_stripe() -> Optional[StripeClient]:
    global _cached_client
    if _cached_client:
        return _cached_client
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        return None
    try:
        _cached_client = StripeClient(api_key)
        return _cached_client
    except Exception:
        # Stripe not available in environment
        return None
