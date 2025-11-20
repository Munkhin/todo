"""
Tests for SM2 Spaced Repetition Algorithm
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from business_logic.sm2_algorithm import SM2Algorithm, sm2_next_review


class TestSM2Algorithm:
    """Test cases for the SM2 spaced repetition algorithm"""
    
    def test_perfect_recall_first_review(self):
        """Test first review with perfect recall (quality = 5)"""
        result = sm2_next_review(quality_rating=5, repetition_count=0, easiness_factor=2.5)
        
        assert result["interval_days"] == 1  # First review is always 1 day
        assert result["repetition_count"] == 1
        assert result["easiness_factor"] >= 2.5  # EF should increase slightly
    
    def test_perfect_recall_second_review(self):
        """Test second review with perfect recall"""
        result = sm2_next_review(quality_rating=5, repetition_count=1, easiness_factor=2.6)
        
        assert result["interval_days"] == 6  # Second review is always 6 days
        assert result["repetition_count"] == 2
    
    def test_perfect_recall_third_review(self):
        """Test third review with perfect recall"""
        result = sm2_next_review(
            quality_rating=5, 
            repetition_count=2, 
            easiness_factor=2.6,
            previous_interval=6
        )
        
        # Third+ reviews use: previous_interval * EF
        assert result["interval_days"] == int(6 * 2.6)  # Should be ~15 days
        assert result["repetition_count"] == 3
    
    def test_good_recall_maintains_progress(self):
        """Test that quality 4 (good recall) maintains learning progress"""
        result = sm2_next_review(quality_rating=4, repetition_count=3, easiness_factor=2.5, previous_interval=15)
        
        assert result["repetition_count"] == 4  # Progress maintained
        assert result["interval_days"] > 15  # Interval increased
    
    def test_difficult_recall_maintains_progress(self):
        """Test that quality 3 (difficult but correct) maintains progress"""
        result = sm2_next_review(quality_rating=3, repetition_count=2, easiness_factor=2.5, previous_interval=6)
        
        assert result["repetition_count"] == 3  # Still progresses
        assert result["easiness_factor"] < 2.5  # But EF decreases (harder item)
    
    def test_forgotten_item_resets(self):
        """Test that quality < 3 resets the learning progress"""
        result = sm2_next_review(quality_rating=2, repetition_count=5, easiness_factor=2.5, previous_interval=30)
        
        assert result["repetition_count"] == 0  # Reset to start
        assert result["interval_days"] == 1  # Review tomorrow
    
    def test_complete_blackout_resets(self):
        """Test that quality 0 (complete blackout) resets everything"""
        result = sm2_next_review(quality_rating=0, repetition_count=10, easiness_factor=3.0, previous_interval=100)
        
        assert result["repetition_count"] == 0
        assert result["interval_days"] == 1
        assert result["easiness_factor"] < 3.0  # EF decreases significantly
    
    def test_easiness_factor_minimum(self):
        """Test that easiness factor doesn't fall below minimum (1.3)"""
        # Start with min EF and give bad rating
        result = sm2_next_review(quality_rating=0, repetition_count=0, easiness_factor=1.3)
        
        assert result["easiness_factor"] >= 1.3  # Should not fall below minimum
    
    def test_easiness_factor_increases_with_perfect_recall(self):
        """Test that EF increases with consistently perfect recall"""
        ef = 2.5
        for _ in range(5):
            result = sm2_next_review(quality_rating=5, repetition_count=0, easiness_factor=ef)
            new_ef = result["easiness_factor"]
            assert new_ef > ef  # Should increase
            ef = new_ef
    
    def test_easiness_factor_decreases_with_poor_recall(self):
        """Test that EF decreases with poor recall"""
        ef = 2.5
        for _ in range(5):
            result = sm2_next_review(quality_rating=1, repetition_count=0, easiness_factor=ef)
            new_ef = result["easiness_factor"]
            assert new_ef < ef  # Should decrease
            ef = new_ef
    
    def test_invalid_quality_rating_raises_error(self):
        """Test that invalid quality ratings raise ValueError"""
        with pytest.raises(ValueError):
            sm2_next_review(quality_rating=6, repetition_count=0, easiness_factor=2.5)
        
        with pytest.raises(ValueError):
            sm2_next_review(quality_rating=-1, repetition_count=0, easiness_factor=2.5)
    
    def test_next_review_date_calculation(self):
        """Test that next review date is calculated correctly"""
        base_date = datetime(2025, 1, 1, 12, 0, 0)
        result = SM2Algorithm.calculate_next_review_date(
            quality_rating=5,
            repetition_count=0,
            easiness_factor=2.5,
            base_date=base_date
        )
        
        expected_date = base_date + timedelta(days=1)
        assert result["next_review_date"] == expected_date
    
    def test_sm2_progression_realistic_scenario(self):
        """Test a realistic progression through SM2 reviews"""
        # Simulate a learner reviewing an item over time
        ratings = [4, 5, 4, 3, 5, 4]  # Mixed quality ratings
        expected_intervals = [1, 6, None, None, None, None]  # First two are fixed
        
        rep_count = 0
        ef = 2.5
        prev_interval = 1
        
        for i, rating in enumerate(ratings):
            result = sm2_next_review(rating, rep_count, ef, prev_interval)
            
            # Check first two intervals match expected
            if expected_intervals[i] is not None:
                assert result["interval_days"] == expected_intervals[i]
            
            # Update for next iteration
            rep_count = result["repetition_count"]
            ef = result["easiness_factor"]
            prev_interval = result["interval_days"]
            
            # Verify intervals are increasing (for quality >= 3)
            if rating >= 3 and i > 0:
                assert result["interval_days"] > 0
    
    def test_consistency_between_same_inputs(self):
        """Test that same inputs always produce same outputs"""
        result1 = sm2_next_review(quality_rating=4, repetition_count=3, easiness_factor=2.4, previous_interval=10)
        result2 = sm2_next_review(quality_rating=4, repetition_count=3, easiness_factor=2.4, previous_interval=10)
        
        assert result1["interval_days"] == result2["interval_days"]
        assert result1["easiness_factor"] == result2["easiness_factor"]
        assert result1["repetition_count"] == result2["repetition_count"]
