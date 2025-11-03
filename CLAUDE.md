# Instruction for claude code to operate in this codebase

## responding to prompts
- ALWAYS ensure that your code comments are in the same style as mine
- ALWAYS ensure that your implementation is modular, robust and lean
- ALWAYS ensure that the feature you are working on works 100% before moving on, by testing and debugging until success
- return with a brief summary 5 lines max of what was completed in each prompt, no long explanation

## reference
next.js docs: https://nextjs.org/docs (navigate within this route)

## codebase information
A FastAPI application that aggregates todos from Google Classroom and Gmail, using AI to prioritize tasks.

## App Idea
- Fetch data from Google Classroom and Gmail
- Use AI (ChatGPT) to identify and prioritize todos
- Export to Google Calendar (future feature)

## Features
- ✅ Google OAuth 2.0 authentication
- ✅ Fetch coursework from Google Classroom
- ✅ Fetch emails from Gmail
- ✅ AI-powered todo extraction and prioritization
- ✅ Filter todos by importance score
- ✅ Write todos to Google Calendar
- ✅ Modular route structure for easy expansion

## Outline
- [x] Google auth
- [x] Routes to fetch data from email and Google Classroom
- [x] Send to ChatGPT for todo extraction
- [x] Route to write to Google Calendar

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 3. Set Up Google OAuth Credentials
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `http://localhost:8000/api/auth/callback`
- Download credentials as `credentials.json` and place in root directory

### 4. Run the API
```bash
# Development mode with auto-reload
python -m uvicorn api.main:app --reload --port 8000

# Or using the main.py directly
python api/main.py
```

### 5. Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `GET /api/auth/login` - Start OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/user` - Get user info
- `POST /api/auth/logout` - Logout

### Google Classroom
- `GET /api/classroom/courses` - List courses
- `GET /api/classroom/coursework/{course_id}` - Get coursework
- `POST /api/classroom/todos` - Generate todos from coursework
- `POST /api/classroom/todos/filter` - Filter todos by importance

### Gmail
- `GET /api/gmail/messages` - List messages
- `GET /api/gmail/messages/{message_id}` - Get message details
- `POST /api/gmail/todos` - Generate todos from emails
- `POST /api/gmail/todos/filter` - Filter todos by importance

### Google Calendar
- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/write-todo` - Write single todo to calendar
- `POST /api/calendar/write-todos` - Write multiple todos to calendar
- `DELETE /api/calendar/event/{event_id}` - Delete calendar event

## Project Structure

```
todo/
├── api/
│   ├── routes/              # Route modules
│   │   ├── auth_routes.py
│   │   ├── classroom_routes.py
│   │   ├── gmail_routes.py
│   │   ├── calendar_routes.py
│   │   └── README.md        # Routes documentation
│   ├── main.py              # FastAPI app entry point
│   ├── auth.py              # Auth helpers
│   ├── google_classroom_toods.py
│   ├── gmail_todos.py
│   └── calendar_todos.py
├── .env                     # Environment variables
├── credentials.json         # Google OAuth credentials
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Adding New Routes

See [api/routes/README.md](api/routes/README.md) for detailed instructions on adding new routes.

**Quick steps:**
1. Create new route file in `api/routes/`
2. Import and register in `api/main.py`
3. Test using `/docs` endpoint

## Usage Example

```python
import requests

# 1. Login (in browser)
# Visit: http://localhost:8000/api/auth/login

# 2. Get todos from classroom
response = requests.post(
    "http://localhost:8000/api/classroom/todos",
    json={
        "session_id": "your_session_id",
        "criteria": "urgent assignments due this week",
        "days_range": 7
    }
)
todos = response.json()

# 3. Filter by importance
response = requests.post(
    "http://localhost:8000/api/classroom/todos/filter",
    json={
        "todos": todos["todos"],
        "minimum_importance": 0.7
    }
)
filtered = response.json()
```

## Technologies Used

- **FastAPI** - Modern Python web framework
- **Google APIs** - Classroom, Gmail, Calendar
- **OpenAI** - GPT for todo extraction and prioritization
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
