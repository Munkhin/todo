"""
Spaced Repetition Algorithm (SM2) Implementation

Based on the SuperMemo 2 algorithm for optimal review scheduling.
Reference: https://super-memory.com/english/ol/sm2.htm
"""

from datetime import datetime, timedelta
from typing import Dict, Tuple


class SM2Algorithm:
    """
    Implements the SM2 (SuperMemo 2) spaced repetition algorithm.
    
    Quality ratings (0-5):
    - 5: Perfect response
    - 4: Correct response after a hesitation
    - 3: Correct response but with difficulty
    - 2: Incorrect response; correct one remembered
    - 1: Incorrect response; correct one seemed familiar
    - 0: Complete blackout
    """
    
    # Default SM2 parameters
    DEFAULT_EASINESS_FACTOR = 2.5
    MIN_EASINESS_FACTOR = 1.3
    
    @staticmethod
    def calculate_next_interval(
        quality_rating: int,
        repetition_count: int,
        easiness_factor: float,
        previous_interval_days: int = 1
    ) -> Tuple[int, float, int]:
        """
        Calculate the next review interval using SM2 algorithm.
        
        Args:
            quality_rating: User's recall quality (0-5)
            repetition_count: Number of successful reviews in a row
            easiness_factor: Current easiness factor (difficulty metric)
            previous_interval_days: Days since last review
            
        Returns:
            Tuple of (next_interval_days, new_easiness_factor, new_repetition_count)
        """
        # Validate quality rating
        if not 0 <= quality_rating <= 5:
            raise ValueError("Quality rating must be between 0 and 5")
        
        # Calculate new easiness factor
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_easiness_factor = easiness_factor + (0.1 - (5 - quality_rating) * (0.08 + (5 - quality_rating) * 0.02))
        
        # Ensure EF doesn't fall below minimum
        new_easiness_factor = max(new_easiness_factor, SM2Algorithm.MIN_EASINESS_FACTOR)
        
        # If quality < 3, reset repetition count (item was forgotten)
        if quality_rating < 3:
            new_repetition_count = 0
            next_interval_days = 1  # Review again tomorrow
        else:
            # Item was remembered correctly
            new_repetition_count = repetition_count + 1
            
            # Calculate next interval based on repetition count
            if new_repetition_count == 1:
                next_interval_days = 1  # First review: 1 day
            elif new_repetition_count == 2:
                next_interval_days = 6  # Second review: 6 days
            else:
                # Subsequent reviews: previous interval * easiness factor
                next_interval_days = int(previous_interval_days * new_easiness_factor)
        
        return next_interval_days, new_easiness_factor, new_repetition_count
    
    @staticmethod
    def calculate_next_review_date(
        quality_rating: int,
        repetition_count: int,
        easiness_factor: float,
        previous_interval_days: int = 1,
        base_date: datetime = None
    ) -> Dict:
        """
        Calculate the next review date and updated SM2 parameters.
        
        Args:
            quality_rating: User's recall quality (0-5)
            repetition_count: Number of successful reviews in a row
            easiness_factor: Current easiness factor
            previous_interval_days: Days since last review
            base_date: Starting date for calculation (defaults to now)
            
        Returns:
            Dictionary with next_review_date, easiness_factor, repetition_count, interval_days
        """
        if base_date is None:
            base_date = datetime.utcnow()
        
        interval_days, new_ef, new_rep_count = SM2Algorithm.calculate_next_interval(
            quality_rating,
            repetition_count,
            easiness_factor,
            previous_interval_days
        )
        
        next_review_date = base_date + timedelta(days=interval_days)
        
        return {
            "next_review_date": next_review_date,
            "easiness_factor": round(new_ef, 2),
            "repetition_count": new_rep_count,
            "interval_days": interval_days
        }


# Helper function for easy import
def sm2_next_review(quality_rating: int, repetition_count: int = 0, 
                    easiness_factor: float = 2.5, previous_interval: int = 1) -> Dict:
    """
    Convenience function to calculate next review parameters.
    
    Example usage:
        result = sm2_next_review(quality_rating=4, repetition_count=2, easiness_factor=2.5)
        print(f"Next review in {result['interval_days']} days")
        print(f"Schedule for: {result['next_review_date']}")
    """
    return SM2Algorithm.calculate_next_review_date(
        quality_rating, repetition_count, easiness_factor, previous_interval
    )
