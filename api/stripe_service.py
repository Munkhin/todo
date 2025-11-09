from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class StripeSubscription:
    id: str
    current_period_end: Optional[int] = None


class StripeClient:
    """Wrapper for Stripe SDK using modern StripeClient pattern.

    Uses the official stripe.StripeClient for API v1 operations.
    Docs: https://github.com/stripe/stripe-python
    """

    def __init__(self, api_key: str) -> None:
        try:
            from stripe import StripeClient as BaseStripeClient
        except ImportError as e:
            raise RuntimeError("stripe SDK not available") from e

        # Initialize modern typed client
        self._client = BaseStripeClient(api_key=api_key)

    def _to_sub(self, sub) -> StripeSubscription:
        # Stripe subscription objects have id and current_period_end attributes
        return StripeSubscription(
            id=sub.id,
            current_period_end=getattr(sub, "current_period_end", None)
        )

    def cancel_at_period_end(self, subscription_id: str) -> StripeSubscription:
        # Update subscription to cancel at period end using v1 namespace
        sub = self._client.v1.subscriptions.update(
            subscription_id,
            params={"cancel_at_period_end": True}
        )
        return self._to_sub(sub)

    def get_subscription(self, subscription_id: str) -> StripeSubscription:
        # Retrieve subscription using v1 namespace
        sub = self._client.v1.subscriptions.retrieve(subscription_id)
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
