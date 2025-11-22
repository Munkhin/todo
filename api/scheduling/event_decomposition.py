"""
Helper module to decompose tasks into multiple calendar events.
"""
from typing import List, Dict, Any
import math


def decompose_tasks_to_events(tasks: List[dict], settings: dict) -> List[dict]:
    """
    Decompose tasks into events with complete schema.
    
    Args:
        tasks: List of tasks to decompose
        settings: User settings with max_study_duration, min_study_duration, and subject_colors
    
    Returns:
        List of event dictionaries with complete schema
    """
    events = []
    
    # Validate settings
    max_d = settings.get("max_study_duration", 90)
    min_d = settings.get("min_study_duration", 45)
    subject_colors = settings.get("subject_colors", {})
    
    # Ensure valid values
    if max_d <= 0:
        max_d = 90
    if min_d <= 0 or min_d > max_d:
        min_d = 45

    for task in tasks:
        # Validate task has required fields
        if not task.get("id") or not task.get("user_id"):
            continue  # Skip invalid tasks
        
        total_duration = task.get("estimated_duration", 0)
        if total_duration <= 0:
            continue  # Skip tasks with no duration

        # Decompose duration into chunks
        chunks = decompose_duration(total_duration, max_d, min_d)
        
        # Get color from subject_colors mapping in settings
        subject = task.get("subject")
        color_hex = None
        if subject and subject_colors:
            color_hex = subject_colors.get(subject)
        
        # Create event for each chunk with complete schema
        for i, duration in enumerate(chunks):
            part_suffix = f" (Part {i + 1}/{len(chunks)})" if len(chunks) > 1 else ""
            
            events.append({
                "user_id": task["user_id"],
                "task_id": task["id"],
                "title": f"{task.get('title', 'Study Session')}{part_suffix}",
                "description": task.get("description"),
                "duration_minutes": duration,  # Store duration in minutes
                "event_type": task.get("event_type", "study"),
                "source": "scheduler",
                "priority": task.get("priority", "medium"),
                "subject": subject,
                "color_hex": color_hex  # From settings subject_colors mapping
            })
    
    return events


def decompose_duration(total_minutes: int, max_d: int, min_d: int) -> List[int]:
    """
    Decompose total duration into chunks respecting max and min constraints.
    
    Args:
        total_minutes: Total duration to decompose (in minutes)
        max_d: Maximum chunk size (in minutes)
        min_d: Minimum chunk size (in minutes)
        
    Returns:
        List of chunk durations in minutes
    """
    # Input validation
    if total_minutes <= 0:
        return []
    if max_d <= 0:
        max_d = 90
    if min_d <= 0 or min_d > max_d:
        min_d = max(45, max_d // 2)
    
    chunks = []
    
    # Keep placing max chunks as long as we don't break the min rule
    while total_minutes >= max_d + min_d:
        chunks.append(max_d)
        total_minutes -= max_d
    
    # Now we have <= max + min left — decide how to finish
    if total_minutes >= max_d:
        chunks.append(max_d)
        total_minutes -= max_d
    
    # If there's still time left, break it into min-sized blocks
    while total_minutes > 0:
        if total_minutes >= min_d:
            chunks.append(min_d)
            total_minutes -= min_d
        else:
            # If leftover is smaller than min, merge it into the last block
            if chunks:
                chunks[-1] += total_minutes
            else:
                # Edge case: input smaller than min duration
                chunks.append(total_minutes)
            break

    return chunks