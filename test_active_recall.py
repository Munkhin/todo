#!/usr/bin/env python
"""Test active recall session generation"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "api"))

from datetime import datetime, timezone, timedelta

def test_active_recall_trigger():
    """Test the trigger logic for active recall"""
    from business_logic.active_recall import should_trigger_active_recall_generation
    
    # Should trigger: completed task with subject
    task1 = {"status": "completed", "subject": "Math"}
    assert should_trigger_active_recall_generation(task1) == True
    
    # Should NOT trigger: pending task
    task2 = {"status": "pending", "subject": "Math"}
    assert should_trigger_active_recall_generation(task2) == False
    
    # Should NOT trigger: no subject
    task3 = {"status": "completed", "subject": None}
    assert should_trigger_active_recall_generation(task3) == False
    
    # Should NOT trigger: already a review task
    task4 = {"status": "completed", "subject": "Math", "is_review": True}
    assert should_trigger_active_recall_generation(task4) == False
    
    print("✓ Active recall trigger logic tests passed")


def test_session_generation_logic():
    """Test session generation logic (without DB)"""
    from business_logic.active_recall import generate_active_recall_sessions
    
    # Mock completed tasks
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)
    
    # Would need mock DB here - just verify function exists
    assert callable(generate_active_recall_sessions)
    print("✓ Active recall session generation function available")


def main():
    print("Testing Active Recall Generation...")
    print("=" * 60)
    
    test_active_recall_trigger()
    test_session_generation_logic()
    
    print("=" * 60)
    print("All active recall tests passed! ✅")
    return 0

if __name__ == "__main__":
    sys.exit(main())
