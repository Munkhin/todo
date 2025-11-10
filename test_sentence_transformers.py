#!/usr/bin/env python
"""Test sentence-transformers implementation for intent classification and semantic matching"""

import sys
sys.path.insert(0, '/home/user/todo')

print("Testing sentence-transformers implementation...")
print("="*60)

# Test 1: Import and model loading
print("\n1. Testing embedding module loading...")
try:
    from api.ai.embeddings import get_embedding, embed_batch, is_embedding_available
    print("✓ Embedding module imported successfully")

    if is_embedding_available():
        print("✓ Sentence-transformers model loaded successfully")
    else:
        print("✗ Model failed to load - will use keyword fallback")
except Exception as e:
    print(f"✗ Failed to import embedding module: {e}")
    sys.exit(1)

# Test 2: Test basic embedding
print("\n2. Testing basic embedding...")
try:
    test_text = "schedule a meeting"
    embedding = get_embedding(test_text)
    if embedding is not None:
        print(f"✓ Generated embedding with shape: {embedding.shape}")
    else:
        print("✗ Embedding returned None (fallback mode)")
except Exception as e:
    print(f"✗ Embedding failed: {e}")

# Test 3: Test batch embedding
print("\n3. Testing batch embedding...")
try:
    test_texts = ["delete my tasks", "what's my schedule", "add a reminder"]
    embeddings = embed_batch(test_texts)
    if embeddings is not None:
        print(f"✓ Generated batch embeddings with shape: {embeddings.shape}")
    else:
        print("✗ Batch embedding returned None (fallback mode)")
except Exception as e:
    print(f"✗ Batch embedding failed: {e}")

# Test 4: Intent classification
print("\n4. Testing intent classification...")
try:
    from api.ai.intent_classifier import classify_intent

    test_cases = [
        ("schedule a meeting from 5 to 6", ["schedule-tasks"]),
        ("delete all my tasks", ["delete-tasks"]),
        ("when should I study math?", ["recommend-slots"]),
        ("move my task to tomorrow", ["reschedule"]),
        ("when am i free tomorrow?", ["check-calendar"]),
        ("limit study blocks to 90 minutes", ["update-preferences"])
    ]

    allowed_intents = ["recommend-slots", "schedule-tasks", "delete-tasks", "reschedule", "check-calendar", "update-preferences"]

    passed = 0
    failed = 0

    for text, expected_intents in test_cases:
        result = classify_intent(text, allowed_intents)
        # Check if at least one expected intent is in the result
        if any(intent in result for intent in expected_intents):
            print(f"  ✓ '{text}' -> {result}")
            passed += 1
        else:
            print(f"  ✗ '{text}' -> {result} (expected one of: {expected_intents})")
            failed += 1

    print(f"\nIntent classification: {passed} passed, {failed} failed")

except Exception as e:
    print(f"✗ Intent classification test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Semantic task matching
print("\n5. Testing semantic task matching...")
try:
    from api.ai.semantic_matcher import match_tasks

    tasks = [
        {"description": "Study math homework", "task_id": 1},
        {"description": "Write essay for English class", "task_id": 2},
        {"description": "Practice piano", "task_id": 3},
        {"description": "Complete chemistry lab report", "task_id": 4},
    ]

    test_queries = [
        ("math homework", ["Study math homework"]),
        ("essay", ["Write essay for English class"]),
        ("music", ["Practice piano"]),
        ("chemistry", ["Complete chemistry lab report"]),
    ]

    passed = 0
    failed = 0

    for query, expected_matches in test_queries:
        matches = match_tasks(query, tasks)
        matched_descriptions = [t["description"] for t in matches]

        if any(exp in matched_descriptions for exp in expected_matches):
            print(f"  ✓ '{query}' -> {matched_descriptions}")
            passed += 1
        else:
            print(f"  ✗ '{query}' -> {matched_descriptions} (expected: {expected_matches})")
            failed += 1

    print(f"\nSemantic matching: {passed} passed, {failed} failed")

except Exception as e:
    print(f"✗ Semantic matching test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("✓ All tests completed!")
