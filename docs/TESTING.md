# Running Automated Tests

This guide explains how to run all automated tests for the todo/calendar application.

## Backend API Tests (pytest)

### Prerequisites
```powershell
cd api
pip install -r requirements.txt
```

### Run All Tests
```powershell
# Run all tests with verbose output
pytest -v

# Run with coverage report
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_tasks.py -v
pytest tests/test_events.py -v
pytest tests/test_api.py -v
```

### Run Tests by Marker
```powershell
# Skip slow tests
pytest -m "not slow"

# Run only integration tests
pytest -m integration
```

### View Coverage Report
After running with `--cov-report=html`, open `htmlcov/index.html` in your browser.

---

## Frontend E2E Tests (Playwright)

### Prerequisites
```powershell
cd todo_ui

# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install
```

### Run Tests

#### Headless Mode (Default)
```powershell
npm run test:e2e
```

#### With UI (Interactive Mode)  
```powershell
npm run test:e2e:ui
```

#### Headed Mode (See Browser)
```powershell
npm run test:e2e:headed
```

#### Debug Mode
```powershell
npm run test:e2e:debug
```

#### Run Specific Test File
```powershell
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/tasks.spec.ts
npx playwright test e2e/onboarding.spec.ts
```

#### Run Specific Browser
```powershell
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View Test Results
After running tests, view the HTML report:
```powershell
npx playwright show-report
```

---

## Performance Benchmark

### Run API Benchmark
```powershell
cd tests
python benchmark_api.py
```

Make sure the API is running on `http://localhost:8000` before running the benchmark.

---

## Quick Test All

To run all automated tests quickly:

### Terminal 1 - Start Backend
```powershell
cd api
uvicorn main:app --reload
```

### Terminal 2 - Start Frontend  
```powershell
cd todo_ui
npm run dev
```

### Terminal 3 - Run Backend Tests
```powershell
cd api
pytest -v
```

### Terminal 4 - Run E2E Tests
```powershell
cd todo_ui
npm run test:e2e
```

---

## Continuous Integration

For CI/CD pipelines, use:

```powershell
# Backend
cd api && pytest --cov=. --cov-report=xml

# Frontend E2E
cd todo_ui && npx playwright test --reporter=junit
```

---

## Test Status

### Backend Tests
- ✅ Health check endpoints
- ✅ Task CRUD operations
- ✅ Task scheduling
- ✅ Calendar event CRUD
- ⚠️ AI agent endpoints (mocked)
- ⚠️ Settings endpoints (to be added)
- ⚠️ Onboarding endpoint (to be added)

### E2E Tests  
- ✅ Authentication flow (basic)
- ⏳ Task management (requires auth setup)
- ⏳ Calendar management (requires auth setup)
- ⏳ Onboarding flow (requires auth setup)
- ⏳ AI agent interactions (requires auth setup)
- ⏳ Settings management (requires auth setup)

**Note**: Most E2E tests are marked as `.skip()` until authentication is properly set up for testing. To enable them:
1. Create a test user account
2. Set up Playwright auth state
3. Remove `.skip()` from test descriptions

---

## Troubleshooting

### Playwright browsers not installed
```powershell
npx playwright install
```

### Port already in use
Make sure no other instances of the app are running on ports 3000 or 8000.

### Import errors in Python
```powershell
pip install -r requirements.txt
```

### Unable to find module in tests
Make sure you're running pytest from the `api` directory.
