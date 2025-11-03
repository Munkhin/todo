# API Documentation

## File Purpose Summary

### Core Application Files
- **main.py** - FastAPI application entry point; registers routers and initializes database/scheduler
- **database.py** - SQLAlchemy database configuration and session management for SQLite
- **models.py** - SQLAlchemy ORM models for Task, User, EnergyProfile, CalendarEvent, and BrainDump tables
- **schemas.py** - Pydantic validation schemas for request/response serialization
- **agent.py** - OpenAI-powered conversational agent with function calling for task management

### Route Modules (api/routes/)
- **auth_routes.py** - Google OAuth 2.0 authentication, session management, and user info endpoints
- **task_routes.py** - CRUD operations for tasks with filtering, sorting, and completion tracking
- **schedule_routes.py** - Schedule generation and energy profile management endpoints
- **calendar_routes.py** - Calendar event CRUD operations with user/system event distinction
- **chat_routes.py** - Conversational AI interface, file upload, and brain dump processing

### Service Modules (api/services/)
- **scheduler.py** - Core scheduling algorithm: splits tasks, finds time blocks, assigns by difficulty/energy
- **task_generator.py** - OpenAI integration to generate structured tasks from unstructured user input
- **agent_tools.py** - Function implementations for AI agent tool calling (tasks, calendar, profile management)
- **date_parser.py** - Natural language date parsing (e.g., "next Friday", "in 3 days")
- **file_processor.py** - PDF and image text extraction using PyPDF2 and Tesseract OCR
- **cron_scheduler.py** - Background job scheduler for automatic task rescheduling on hourly basis
- **consts.py** - Default constants and user-specific configuration retrieval for scheduling

---

## Information Flow Diagram

### Example Flow: User Creates Tasks via Chat

```
┌─────────────────────────────────────────────────────────────────────┐
│ User sends message: "Study linear algebra tomorrow, 2 hours"        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. chat_routes.py: /api/chat/message                                │
│    - Authenticates session_id → user_id                             │
│    - Retrieves conversation history from memory store               │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. agent.py: run_agent()                                            │
│    - Sends message + history to OpenAI with tool schemas            │
│    - AI decides to call: create_tasks() and schedule_all_tasks()    │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. agent_tools.py: create_tasks()                                   │
│    - Calls date_parser.py to parse "tomorrow" → datetime            │
│    - Creates Task ORM objects with user_id, topic, duration         │
│    - Commits to database.py (SQLite via models.py)                  │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. agent_tools.py: schedule_all_tasks()                             │
│    - Calls scheduler.py: schedule_tasks()                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. scheduler.py: schedule_tasks()                                   │
│    - Gets user constants from consts.py (wake/sleep times, energy)  │
│    - Fetches unscheduled tasks from models.py via task_routes.py    │
│    - Splits tasks > MAX_STUDY_DURATION into subtasks                │
│    - Gets existing CalendarEvents to find available time blocks     │
│    - Assigns tasks to blocks matching difficulty → energy level     │
│    - Creates CalendarEvent entries (source="system")                │
│    - Updates Task.scheduled_start/end fields                        │
│    - Commits all changes to database                                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. agent.py: Second OpenAI call                                     │
│    - Receives tool results (created tasks, schedule stats)          │
│    - Generates human-readable response                              │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. chat_routes.py: Returns response                                 │
│    - Updates conversation_store with new history                    │
│    - Returns ChatMessageResponse to user                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Background Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ main.py: @app.on_event("startup")                                   │
│    - Calls cron_scheduler.py: start_scheduler()                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ cron_scheduler.py: Runs every hour                                  │
│    - Checks for tasks with scheduled_end < now                      │
│    - Marks missed tasks as status="missed"                          │
│    - Calls scheduler.py: schedule_tasks() for auto-rescheduling     │
└─────────────────────────────────────────────────────────────────────┘
```

### File Upload Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User uploads PDF/image via /api/chat/upload                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ chat_routes.py: upload_file()                                       │
│    - Saves file to uploads/ directory                               │
│    - Calls file_processor.py (extract_text_from_pdf/image)          │
│    - Creates BrainDump record in models.py                          │
│    - Returns extracted text preview                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Direct API Flow (without AI agent)

```
User → task_routes.py: POST /api/tasks → models.py → database.py
                                       ↓
User → schedule_routes.py: POST /api/schedule/generate
                                       ↓
                            scheduler.py → models.py → database.py
```

---

## API Endpoints Reference

**Auth**:
- [✔] /auth/login (POST) : Login user (email/password or OAuth token)
- [✔] /auth/logout (POST) : Logout and revoke session
- [✔] /auth/google-oauth (GET) : Initiate Google OAuth for calendar integration
- [✔] /auth/google-oauth/callback (GET) : Receive OAuth callback and store refresh/access tokens

**Study Tasks Management**:
- [✔] /tasks (GET) : Get all user study tasks (with progress info)
- [✔] /tasks (POST) : Add new study task (topic, estimated duration, difficulty, due date)
- [✔] /tasks/:id (PUT) : Update existing task (edit details, mark as completed, adjust difficulty)
- [✔] /tasks/:id (DELETE) : Delete a study task
- [✔] /tasks/:id/complete (POST) : Mark task as done (updates progress and schedules next review if spaced repetition enabled)

**Scheduler Endpoints**:
- [✔] /schedule/generate (POST) : Generate the study schedule for the user (initial scheduling or after new tasks added)
- [✔] /schedule/reschedule (POST) : Reschedule missed tasks (auto-adjust conflicts, insert rest sessions, apply energy optimization)
- [✔] /schedule/energy-profile (GET/POST) : Get or update user's energy profile (time-of-day preferences, max study blocks, fatigue modeling)
- [✔] /schedule/rest-insert (POST) : Add rest/micro-break sessions based on schedule rules

**Calendar Integration**:
- [✔] /calendar/events (GET) : Fetch user's calendar events (to avoid conflicts)
- [✔] /calendar/events (POST) : Create a new calendar event (study session or rest)
- [✔] /calendar/events/:id (PUT) : Update an existing calendar event (reschedule, change duration)
- [✔] /calendar/events/:id (DELETE) : Delete a calendar event

**Chat Interface**:
- [✔] /chat/message (POST) : Send message to AI agent for conversational task management
- [✔] /chat/upload (POST) : Upload PDF/image file for text extraction and task generation
- [✔] /chat/history/:user_id (GET) : Retrieve conversation history
- [✔] /chat/history/:user_id (DELETE) : Clear conversation history
