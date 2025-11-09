# API Handwritten - Existing Functionalities

## Architecture
FastAPI + Supabase + OpenAI/Ollama hybrid AI scheduler with Google OAuth

## Core Modules

### Authentication (`auth/auth_routes.py`)
- Google OAuth 2.0 flow (login/logout/callback)
- Session management via Supabase
- NextAuth session registration
- User credit tracking & plan upgrades
- Timezone preference storage

### Database Layer (`database.py`)
**Users**: Create/read/update (ID, email, plan, timezone, conversation_id, credits)
**Sessions**: Create/read/delete OAuth sessions
**Tasks**: CRUD operations (topic, difficulty, duration, due_date, status)
**Calendar Events**: CRUD with task linkage (title, start/end, type, source)
**Energy Profiles**: User-specific energy patterns for optimal scheduling

### Scheduling Engine (`scheduler.py`)
1. Fetches existing calendar events
2. Identifies empty time slots between events
3. Retrieves user energy profile (hourly energy levels)
4. Ranks slots by energy alignment
5. Allocates tasks using importance + urgency + difficulty heuristics
6. Inserts study breaks between sessions
7. Returns scheduled task blocks with timestamps

### AI Agent (`ai/agent.py`)
**Intent router**: Classifies user input into 7 intents (schedule, reschedule, recommend, infer, delete, check, update)
**Functions**:
- `recommend_slots`: Suggests time blocks without scheduling
- `schedule_tasks_into_calendar`: Creates calendar events from task list
- `infer_tasks`: Extracts tasks from natural language/files
- `delete_tasks_from_calendar`: Removes events by semantic matching
- `check_calendar`: Queries calendar via natural language
- `update_preferences`: Modifies user settings (energy, break duration, etc.)

Uses GPT-5 (intended) for structured JSON outputs via OpenAI SDK

### AI Utilities
**Intent Classifier** (`ai/intent_classifier.py`): Ollama nomic-embed-text embeddings → cosine similarity → top-k intent selection
**Semantic Matcher** (`ai/semantic_matcher.py`): Matches user descriptions to tasks via vector similarity (threshold 0.75)

### Calendar API (`calendar/user_actions.py`)
REST endpoints: GET/POST/PUT/DELETE calendar events
Filters: start_date, end_date query params

### Preprocessing (`preprocess_user_input/file_processing.py`)
Extracts text from PDFs (PyPDF2) and images (Tesseract OCR)

### Payments (`stripe_service.py`)
Subscription management: cancel, retrieve subscription status

### Timezone (`timezone/conversions.py`)
UTC ↔ local timezone conversions with pytz

## Data Flow
```
User Input → Intent Classifier → Route to function → OpenAI call → Database write → Response
              ↓
         Ollama embeddings
```

## Schemas
**Task**: user_id, description, difficulty (1-5), start_time, end_time, due_date, duration, scheduled
**Calendar Event**: user_id, title, description, start/end timestamps, event_type, source, task_id
**Energy Profile**: hourly_energy (JSON array), min/max study duration, break duration

## Routes
- `/api/auth/*` - Authentication flow
- `/api/calendar/events` - Calendar CRUD
- `/health` - Health check
