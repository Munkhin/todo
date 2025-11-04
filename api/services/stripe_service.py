from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class StripeSubscription:
    id: str
    current_period_end: Optional[int] = None


class StripeClient:
    """Small wrapper around stripe SDK. Designed to be mockable in tests.

    If the stripe package or secret key is missing, methods raise RuntimeError.
    """

    def __init__(self, api_key: str) -> None:
        try:
            import stripe  # type: ignore
        except Exception as e:  # pragma: no cover - import error path
            raise RuntimeError("stripe SDK not available") from e
        self._stripe = stripe
        self._stripe.api_key = api_key

    def cancel_at_period_end(self, subscription_id: str) -> StripeSubscription:
        sub = self._stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        return StripeSubscription(id=sub.id, current_period_end=getattr(sub, "current_period_end", None))

    def get_subscription(self, subscription_id: str) -> StripeSubscription:
        sub = self._stripe.Subscription.retrieve(subscription_id)
        return StripeSubscription(id=sub.id, current_period_end=getattr(sub, "current_period_end", None))


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
