# services/task_generator.py
import os
import openai
from typing import List, Dict
from datetime import datetime, timedelta

# Set your OpenAI API key as environment variable
# export OPENAI_API_KEY="your_key"
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_tasks_from_text(
    user_input: str,
    default_estimated_minutes: int = 60,
    max_tasks: int = 10,
    default_due_date: int = 7
) -> List[Dict]:
    """
    Converts user input (syllabus, notes, topics) into structured study tasks.

    Returns a list of dictionaries:
    [
        {
            "topic": "Linear Algebra - Matrix Multiplication",
            "estimated_minutes": 60,
            "difficulty": 3,
            "due_date": "2025-11-05T00:00:00"
        }, ...
    ]
    """
    prompt = f"""
You are an AI study planner. 
Convert the following user input into a list of at most {max_tasks} study tasks.
Output JSON array where each element has:
- topic (string)
- estimated_minutes (integer)
- difficulty (1=easy, 5=hard)
- due_date (ISO format, optional, can be null)

User input:
\"\"\"{user_input}\"\"\"
"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "You are a helpful study task generator."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=500,
        )

        # Extract JSON from the response
        text = response['choices'][0]['message']['content']

        # Attempt to parse JSON
        import json
        tasks = json.loads(text)
        
        # Fill defaults and convert due_date if missing
        for task in tasks:
            task['estimated_minutes'] = task.get('estimated_minutes', default_estimated_minutes)
            task['difficulty'] = task.get('difficulty', 3)
            if 'due_date' in task and task['due_date']:
                try:
                    task['due_date'] = datetime.fromisoformat(task['due_date'])
                except:
                    task['due_date'] = None
            else:
                # set default due date to one week from now
                task['due_date'] = datetime.utcnow() + timedelta(days=default_due_date)

        return tasks

    except Exception as e:
        print("Error generating tasks:", e)
        return []

