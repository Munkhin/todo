#!/usr/bin/env python
"""Quick validation test for SM2 algorithm"""

import sys
from pathlib import Path

# Add api directory to path
sys.path.insert(0, str(Path(__file__).parent / "api"))

from business_logic.sm2_algorithm import sm2_next_review

def main():
    print("Testing SM2 Algorithm...")
    print("=" * 50)
    
    # Test 1: First review with perfect recall
    result = sm2_next_review(quality_rating=5, repetition_count=0, easiness_factor=2.5)
    assert result["interval_days"] == 1,  f"Expected 1 day, got {result['interval_days']}"
    print("✓ Test 1 passed: First review = 1 day")
    
    # Test 2: Second review with perfect recall
    result = sm2_next_review(quality_rating=5, repetition_count=1, easiness_factor=2.6)
    assert result["interval_days"] == 6, f"Expected 6 days, got {result['interval_days']}"
    print("✓ Test 2 passed: Second review = 6 days")
    
    # Test 3: Third review with good recall
    result = sm2_next_review(quality_rating=4, repetition_count=2, easiness_factor=2.5, previous_interval=6)
    assert result["interval_days"] > 6, "Expected interval > 6 days"
    assert result["repetition_count"] == 3, "Expected repetition count to increment"
    print(f"✓ Test 3 passed: Third review = {result['interval_days']} days")
    
    # Test 4: Forgotten item resets
    result = sm2_next_review(quality_rating=2, repetition_count=5, easiness_factor=2.5, previous_interval=30)
    assert result["repetition_count"] == 0, "Expected reset to 0"
    assert result["interval_days"] == 1, "Expected reset to 1 day"
    print("✓ Test 4 passed: Forgetting resets progress")
    
    # Test 5: Easiness factor bounds
    result = sm2_next_review(quality_rating=0, repetition_count=0, easiness_factor=1.3)
    assert result["easiness_factor"] >= 1.3, "EF should not fall below 1.3"
    print(f"✓ Test 5 passed: EF bounded at {result['easiness_factor']}")
    
    print("=" * 50)
    print("All SM2 algorithm tests passed! ✅")
    return 0

if __name__ == "__main__":
    sys.exit(main())
