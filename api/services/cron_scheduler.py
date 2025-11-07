# cron_scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from api.database import SessionLocal
from api.models import Task, User
from api.services.scheduler import schedule_study_sessions
from datetime import datetime

scheduler = BackgroundScheduler()

def check_and_reschedule():
    """check for missed tasks and reschedule automatically"""
    db = SessionLocal()
    try:
        now = datetime.now()
        users = db.query(User).all()

        for user in users:
            # find missed tasks
            missed = db.query(Task).filter(
                Task.user_id == user.id,
                Task.scheduled_end < now,
                Task.status == "scheduled"
            ).all()

            if missed:
                # mark as missed
                for task in missed:
                    task.status = "missed"
                db.commit()

                # reschedule (DEPRECATED - needs reimplementation)
                # schedule_tasks(user.id, db)
                # TODO: reimplement using schedule_study_sessions(tasks, user_id, start_date, end_date, settings)
                print(f"Found {len(missed)} missed tasks for user {user.id} (auto-reschedule disabled)")

    except Exception as e:
        print(f"Error in cron job: {e}")
    finally:
        db.close()

def start_scheduler():
    """start background scheduler"""
    scheduler.add_job(check_and_reschedule, 'interval', hours=1, id='auto_reschedule')
    scheduler.start()
    print("Background scheduler started (runs every hour)")
