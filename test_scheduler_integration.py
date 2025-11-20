#!/usr/bin/env python
"""Test scheduler integration with learning science features"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "api"))

from business_logic.scheduler import (
    group_tasks_by_subject,
    apply_interleaving_to_schedule,
    add_review_priority_boost
)
from datetime import datetime, timezone, timedelta

def main():
    print("Testing Scheduler Learning Science Integration...")
    print("=" * 60)
    
    # Test 1: Group tasks by subject
    tasks = [
        {"id": 1, "subject": "Math", "title": "Algebra", "duration": 60},
        {"id": 2, "subject": "Physics", "title": "Mechanics", "duration": 60},
        {"id": 3, "subject": "Math", "title": "Geometry", "duration": 60},
        {"id": 4, "title": "Chemistry", "duration": 60},  # No subject
    ]
    
    grouped = group_tasks_by_subject(tasks)
    assert "Math" in grouped, "Math group should exist"
    assert "Physics" in grouped, "Physics group should exist"
    assert "uncategorized" in grouped, "Uncategorized group should exist"
    assert len(grouped["Math"]) == 2, "Math should have 2 tasks"
    print("✓ Test 1 passed: Task grouping by subject")
    
    # Test 2: Review priority boosting
    now = datetime.now(timezone.utc)
    overdue_date = now - timedelta(days=3)  # 3 days overdue
    
    review_tasks = [
        {"id": 5, "title": "Review calculus", "next_review_date": overdue_date.isoformat()},
        {"id": 6, "title": "Active task", "next_review_date": (now + timedelta(days=2)).isoformat()},
    ]
    
    add_review_priority_boost(review_tasks, now)
    
    assert review_tasks[0].get("is_review") == True, "Overdue should be marked as review"
    assert review_tasks[0].get("importance", 0) >= 300, "3 days overdue should add 300+ importance"
    assert review_tasks[1].get("is_review") != True, "Future review shouldn't be marked yet"
    print("✓ Test 2 passed: Review priority boosting")
    
    # Test 3: Interleaving with empty slots
    task_groups = {
        "Math": [
            {"id": 1, "title": "Algebra", "duration": 30, "importance": 10},
            {"id": 2, "title": "Geometry", "duration": 30, "importance": 12}
        ],
        "Physics": [
            {"id": 3, "title": "Mechanics", "duration": 30, "importance": 15}
        ]
    }
    
    # Simple time slots: one 2-hour slot
    empty_slots = [(8.0, 2.0)]  # 8 AM, 2 hours
    
    schedule = apply_interleaving_to_schedule(
        task_groups,
        empty_slots,
        min_duration=0.5,
        max_duration=1.0,
        break_duration=0.25
    )
    
    assert len(schedule) > 0, "Schedule should have events"
    
    # Check that subjects are interleaved (not all Math then all Physics)
    subjects_in_order = []
    for event in schedule:
        if "task_id" in event:
            task_id = event["task_id"]
            # Find which subject this task belongs to
            for subject, task_list in task_groups.items():
                if any(t["id"] == task_id for t in task_list):
                    subjects_in_order.append(subject)
                    break
    
    # If we have both subjects, they should alternate
    if len(set(subjects_in_order)) > 1:
        # Check that we don't have all of one subject grouped together
        math_indices = [i for i, s in enumerate(subjects_in_order) if s == "Math"]
        if len(math_indices) > 1:
            # Math tasks shouldn't all be consecutive
            consecutive = all(math_indices[i] + 1 == math_indices[i+1] for i in range(len(math_indices)-1))
            assert not consecutive, "Math tasks should be interleaved, not consecutive"
    
    print(f"✓ Test 3 passed: Interleaving created {len(schedule)} events")
    print(f"  Subject order: {subjects_in_order}")
    
    print("=" * 60)
    print("All scheduler integration tests passed! ✅")
    return 0

if __name__ == "__main__":
    sys.exit(main())
