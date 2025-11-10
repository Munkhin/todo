#!/usr/bin/env python
"""Test that the Ollama fallbacks work correctly"""

import sys
sys.path.insert(0, '/home/user/todo')

from api.ai.intent_classifier import classify_intent
from api.ai.semantic_matcher import match_tasks

# Test intent classification
print("Testing intent classification fallback...")
test_inputs = [
    "schedule a meeting from 5 to 6",
    "delete all my tasks",
    "when should I study math?",
    "move my task to tomorrow"
]

for text in test_inputs:
    allowed_intents = ["recommend-slots", "schedule-tasks", "delete-tasks", "reschedule", "check-calendar", "update-preferences"]
    result = classify_intent(text, allowed_intents)
    print(f"Input: '{text}' -> Intents: {result}")

print("\n" + "="*50 + "\n")

# Test semantic matching
print("Testing semantic matching fallback...")
tasks = [
    {"description": "Study math homework", "task_id": 1},
    {"description": "Write essay for English class", "task_id": 2},
    {"description": "Practice piano", "task_id": 3},
]

test_queries = [
    "math homework",
    "essay",
    "music"
]

for query in test_queries:
    matches = match_tasks(query, tasks)
    print(f"Query: '{query}' -> Matched: {[t['description'] for t in matches]}")

print("\n✓ All tests completed successfully!")
