# cron_scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from api.database import SessionLocal
from api.models import Task, User
from api.services.scheduler import schedule_tasks
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

                # reschedule
                schedule_tasks(user.id, db)
                print(f"Auto-rescheduled {len(missed)} missed tasks for user {user.id}")

    except Exception as e:
        print(f"Error in cron job: {e}")
    finally:
        db.close()

def start_scheduler():
    """start background scheduler"""
    scheduler.add_job(check_and_reschedule, 'interval', hours=1, id='auto_reschedule')
    scheduler.start()
    print("Background scheduler started (runs every hour)")
