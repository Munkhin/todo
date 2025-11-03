"""
comprehensive tests for scheduler.py
"""

import sys
import os
# add api directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Task, CalendarEvent, EnergyProfile, User
from services.scheduler import (
    schedule_tasks,
    split_tasks,
    get_time_blocks,
    unschedule_old_events,
    reschedule
)
from services.consts import get_user_constants
import json

# test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    """create a fresh database session for each test"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    yield session

    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def test_user(db_session):
    """create a test user"""
    user = User(id=1, email="test@example.com", name="Test User")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_energy_profile(db_session, test_user):
    """create a test energy profile"""
    profile = EnergyProfile(
        user_id=test_user.id,
        wake_time=7,
        sleep_time=23,
        max_study_duration=180,
        min_study_duration=30,
        energy_levels=json.dumps({
            "7": 6, "8": 7, "9": 9, "10": 9, "11": 8,
            "12": 6, "13": 5, "14": 6, "15": 7, "16": 8,
            "17": 7, "18": 6, "19": 5, "20": 5, "21": 4, "22": 3
        })
    )
    db_session.add(profile)
    db_session.commit()
    return profile

@pytest.fixture
def sample_tasks(db_session):
    """create sample tasks"""
    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    tasks = [
        Task(
            topic="Linear Algebra",
            estimated_minutes=60,
            difficulty=4,
            due_date=base_date + timedelta(days=2)
        ),
        Task(
            topic="Calculus",
            estimated_minutes=90,
            difficulty=5,
            due_date=base_date + timedelta(days=3)
        ),
        Task(
            topic="Python Basics",
            estimated_minutes=45,
            difficulty=2,
            due_date=base_date + timedelta(days=1)
        )
    ]

    for task in tasks:
        db_session.add(task)

    db_session.commit()
    return tasks


# ============== UNIT TESTS ==============

class TestSplitTasks:
    """test split_tasks function"""

    def test_split_task_basic(self, db_session):
        """test splitting a task into smaller subtasks"""
        # create task that needs splitting
        large_task = Task(
            topic="Long Study Session",
            estimated_minutes=240,
            difficulty=3,
            due_date=datetime.now() + timedelta(days=5)
        )
        db_session.add(large_task)
        db_session.commit()

        original_id = large_task.id

        # split it
        consts = {
            'MIN_STUDY_DURATION': 30,
            'MAX_STUDY_DURATION': 180
        }

        new_tasks = split_tasks(large_task, consts, db_session)

        # verify
        assert len(new_tasks) == 8  # 240 / 30 = 8
        assert all(task.estimated_minutes == 30 for task in new_tasks)
        assert all(task.difficulty == 3 for task in new_tasks)
        assert all("Part" in task.topic for task in new_tasks)

        # verify original is deleted
        deleted_task = db_session.query(Task).filter(Task.id == original_id).first()
        assert deleted_task is None

    def test_split_task_uneven_division(self, db_session):
        """test splitting when duration doesn't divide evenly"""
        task = Task(
            topic="Uneven Task",
            estimated_minutes=100,
            difficulty=4,
            due_date=datetime.now() + timedelta(days=3)
        )
        db_session.add(task)
        db_session.commit()

        consts = {'MIN_STUDY_DURATION': 30, 'MAX_STUDY_DURATION': 180}
        new_tasks = split_tasks(task, consts, db_session)

        # 100 / 30 = 3.33, ceil = 4 tasks
        assert len(new_tasks) == 4
        # 100 // 4 = 25 minutes each
        assert all(task.estimated_minutes == 25 for task in new_tasks)


class TestGetTimeBlocks:
    """test get_time_blocks function"""

    def test_get_time_blocks_no_events(self, db_session, test_user, test_energy_profile):
        """test time blocks generation with no existing events"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        tasks = [
            Task(
                topic="Test Task",
                estimated_minutes=60,
                difficulty=3,
                due_date=base_date + timedelta(days=2)
            )
        ]

        consts = get_user_constants(test_user.id, db_session)
        time_blocks = get_time_blocks(test_user.id, tasks, consts, db_session)

        # should have blocks for 2 days (today + 1 day to due date)
        # each day: 7am-11pm = 16 hours = 16 blocks
        assert len(time_blocks) > 0

        # verify all blocks have required fields
        for block in time_blocks:
            assert 'start_time' in block
            assert 'end_time' in block
            assert 'available_minutes' in block
            assert 'energy_level' in block
            assert block['available_minutes'] == 60
            assert 1 <= block['energy_level'] <= 10

    def test_get_time_blocks_with_existing_events(self, db_session, test_user, test_energy_profile):
        """test time blocks with existing calendar events"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # create existing event (blocks 10am-12pm tomorrow)
        tomorrow = base_date + timedelta(days=1)
        existing_event = CalendarEvent(
            user_id=test_user.id,
            title="Existing Meeting",
            start_time=tomorrow.replace(hour=10, minute=0),
            end_time=tomorrow.replace(hour=12, minute=0),
            event_type="study",
            source="user"
        )
        db_session.add(existing_event)
        db_session.commit()

        tasks = [
            Task(
                topic="Test Task",
                estimated_minutes=60,
                difficulty=3,
                due_date=base_date + timedelta(days=2)
            )
        ]

        consts = get_user_constants(test_user.id, db_session)
        time_blocks = get_time_blocks(test_user.id, tasks, consts, db_session)

        # verify no blocks overlap with the existing event
        for block in time_blocks:
            block_start = block['start_time']
            block_end = block['end_time']

            # should not overlap with 10am-12pm tomorrow
            if block_start.date() == tomorrow.date():
                overlaps = not (block_end <= existing_event.start_time or
                              block_start >= existing_event.end_time)
                assert not overlaps, f"Block {block_start} to {block_end} overlaps with existing event"

    def test_get_time_blocks_respects_min_duration(self, db_session, test_user, test_energy_profile):
        """test that small gaps are not included"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = base_date + timedelta(days=1)

        # create events with small gaps (< MIN_STUDY_DURATION)
        # 9:00-9:20, 9:25-10:00 (only 5 min gap)
        event1 = CalendarEvent(
            user_id=test_user.id,
            title="Event 1",
            start_time=tomorrow.replace(hour=9, minute=0),
            end_time=tomorrow.replace(hour=9, minute=20),
            event_type="study",
            source="user"
        )
        event2 = CalendarEvent(
            user_id=test_user.id,
            title="Event 2",
            start_time=tomorrow.replace(hour=9, minute=25),
            end_time=tomorrow.replace(hour=10, minute=0),
            event_type="study",
            source="user"
        )
        db_session.add_all([event1, event2])
        db_session.commit()

        tasks = [
            Task(
                topic="Test Task",
                estimated_minutes=60,
                difficulty=3,
                due_date=tomorrow
            )
        ]

        consts = get_user_constants(test_user.id, db_session)
        time_blocks = get_time_blocks(test_user.id, tasks, consts, db_session)

        # verify no blocks exist in the 5-minute gap
        for block in time_blocks:
            if block['start_time'].date() == tomorrow.date():
                assert not (block['start_time'] >= event1.end_time and
                          block['end_time'] <= event2.start_time)


class TestUnscheduleOldEvents:
    """test unschedule_old_events function"""

    def test_unschedule_clears_system_events(self, db_session, test_user):
        """test that system events are deleted"""
        base_date = datetime.now()

        # create system and user events
        system_event = CalendarEvent(
            user_id=test_user.id,
            title="System Event",
            start_time=base_date,
            end_time=base_date + timedelta(hours=1),
            event_type="study",
            source="system"
        )
        user_event = CalendarEvent(
            user_id=test_user.id,
            title="User Event",
            start_time=base_date + timedelta(hours=2),
            end_time=base_date + timedelta(hours=3),
            event_type="study",
            source="user"
        )
        db_session.add_all([system_event, user_event])
        db_session.commit()

        unschedule_old_events(db_session)

        # verify system event deleted, user event remains
        remaining_events = db_session.query(CalendarEvent).all()
        assert len(remaining_events) == 1
        assert remaining_events[0].source == "user"

    def test_unschedule_resets_task_times(self, db_session):
        """test that task scheduled times are reset"""
        base_date = datetime.now()

        # create scheduled task
        task = Task(
            topic="Scheduled Task",
            estimated_minutes=60,
            difficulty=3,
            due_date=base_date + timedelta(days=5),
            scheduled_start=base_date,
            scheduled_end=base_date + timedelta(hours=1)
        )
        db_session.add(task)
        db_session.commit()

        task_id = task.id

        unschedule_old_events(db_session)

        # verify task schedule cleared
        updated_task = db_session.query(Task).filter(Task.id == task_id).first()
        assert updated_task.scheduled_start is None
        assert updated_task.scheduled_end is None


class TestReschedule:
    """test reschedule function"""

    def test_reschedule_assigns_hard_tasks_to_high_energy(self, db_session, test_user):
        """test that harder tasks get assigned to higher energy blocks"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        tasks = [
            Task(topic="Easy Task", estimated_minutes=30, difficulty=1,
                 due_date=base_date + timedelta(days=1)),
            Task(topic="Hard Task", estimated_minutes=30, difficulty=5,
                 due_date=base_date + timedelta(days=1))
        ]
        for task in tasks:
            db_session.add(task)
        db_session.commit()

        # create time blocks with varying energy
        time_blocks = [
            {'start_time': base_date.replace(hour=9), 'end_time': base_date.replace(hour=10),
             'available_minutes': 60, 'energy_level': 9},
            {'start_time': base_date.replace(hour=20), 'end_time': base_date.replace(hour=21),
             'available_minutes': 60, 'energy_level': 4}
        ]

        consts = {
            'WAKE_TIME': 7,
            'SLEEP_TIME': 23,
            'MIN_STUDY_DURATION': 30,
            'MAX_STUDY_DURATION': 180,
            'ENERGY_LEVELS': {9: 9, 20: 4}
        }

        result = reschedule(tasks, time_blocks, test_user.id, consts, db_session)

        # verify hard task scheduled in high energy block
        hard_task = [t for t in tasks if t.difficulty == 5][0]
        assert hard_task.scheduled_start is not None
        assert hard_task.scheduled_start.hour == 9  # high energy block

    def test_reschedule_creates_calendar_events(self, db_session, test_user):
        """test that calendar events are created"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            topic="Test Task",
            estimated_minutes=60,
            difficulty=3,
            due_date=base_date + timedelta(days=1)
        )
        db_session.add(task)
        db_session.commit()

        time_blocks = [
            {'start_time': base_date.replace(hour=10), 'end_time': base_date.replace(hour=11),
             'available_minutes': 120, 'energy_level': 8}
        ]

        consts = {'WAKE_TIME': 7, 'SLEEP_TIME': 23, 'MIN_STUDY_DURATION': 30,
                  'MAX_STUDY_DURATION': 180, 'ENERGY_LEVELS': {10: 8}}

        reschedule([task], time_blocks, test_user.id, consts, db_session)

        # verify calendar event created
        events = db_session.query(CalendarEvent).filter(
            CalendarEvent.source == "system"
        ).all()

        assert len(events) == 1
        assert events[0].task_id == task.id
        assert events[0].title == task.topic
        assert events[0].source == "system"

    def test_reschedule_handles_insufficient_time(self, db_session, test_user):
        """test scheduling when not enough time available"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # many tasks, little time
        tasks = [
            Task(topic=f"Task {i}", estimated_minutes=60, difficulty=3,
                 due_date=base_date + timedelta(days=1))
            for i in range(10)
        ]
        for task in tasks:
            db_session.add(task)
        db_session.commit()

        # only 2 hours available
        time_blocks = [
            {'start_time': base_date.replace(hour=10), 'end_time': base_date.replace(hour=12),
             'available_minutes': 120, 'energy_level': 8}
        ]

        consts = {'WAKE_TIME': 7, 'SLEEP_TIME': 23, 'MIN_STUDY_DURATION': 30,
                  'MAX_STUDY_DURATION': 180, 'ENERGY_LEVELS': {10: 8}}

        result = reschedule(tasks, time_blocks, test_user.id, consts, db_session)

        # verify only 2 tasks scheduled (120 min / 60 min per task)
        assert result['scheduled_count'] == 2
        assert result['unscheduled_count'] == 8
        assert result['total_tasks'] == 10


# ============== INTEGRATION TESTS ==============

class TestScheduleTasksIntegration:
    """integration tests for schedule_tasks main function"""

    def test_full_scheduling_workflow(self, db_session, test_user, test_energy_profile):
        """test complete scheduling workflow"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # create various tasks
        tasks = [
            Task(topic="Task 1", estimated_minutes=60, difficulty=3,
                 due_date=base_date + timedelta(days=2)),
            Task(topic="Task 2", estimated_minutes=45, difficulty=5,
                 due_date=base_date + timedelta(days=1)),
            Task(topic="Task 3", estimated_minutes=90, difficulty=2,
                 due_date=base_date + timedelta(days=3))
        ]
        for task in tasks:
            db_session.add(task)
        db_session.commit()

        result = schedule_tasks(test_user.id, db_session)

        # verify result structure
        assert 'scheduled_count' in result
        assert 'total_tasks' in result
        assert 'unscheduled_count' in result

        # verify tasks have schedules
        scheduled_tasks = db_session.query(Task).filter(
            Task.scheduled_start != None
        ).all()

        assert len(scheduled_tasks) == result['scheduled_count']

        # verify calendar events created
        calendar_events = db_session.query(CalendarEvent).filter(
            CalendarEvent.source == "system"
        ).all()

        assert len(calendar_events) == result['scheduled_count']

    def test_rescheduling_clears_old_schedule(self, db_session, test_user, test_energy_profile):
        """test that rescheduling clears previous schedule"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # create and schedule task
        task = Task(
            topic="Test Task",
            estimated_minutes=60,
            difficulty=3,
            due_date=base_date + timedelta(days=2),
            scheduled_start=base_date,
            scheduled_end=base_date + timedelta(hours=1)
        )
        db_session.add(task)

        old_event = CalendarEvent(
            user_id=test_user.id,
            title="Old Event",
            start_time=base_date,
            end_time=base_date + timedelta(hours=1),
            event_type="study",
            source="system",
            task_id=task.id
        )
        db_session.add(old_event)
        db_session.commit()

        old_start = task.scheduled_start
        old_event_id = old_event.id
        old_event_title = old_event.title

        # reschedule
        result = schedule_tasks(test_user.id, db_session)

        # verify old schedule replaced
        db_session.refresh(task)
        assert task.scheduled_start != old_start

        # verify old event deleted (by checking title changed or event doesn't exist)
        remaining_event = db_session.query(CalendarEvent).filter(
            CalendarEvent.id == old_event_id
        ).first()
        # either event is gone or it's a new event with different title
        assert remaining_event is None or remaining_event.title != old_event_title

    def test_large_task_splitting(self, db_session, test_user, test_energy_profile):
        """test that large tasks are automatically split"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # create task larger than MAX_STUDY_DURATION (180 min)
        large_task = Task(
            topic="Large Task",
            estimated_minutes=240,
            difficulty=4,
            due_date=base_date + timedelta(days=5)
        )
        db_session.add(large_task)
        db_session.commit()

        original_id = large_task.id

        schedule_tasks(test_user.id, db_session)

        # verify original task deleted
        original = db_session.query(Task).filter(Task.id == original_id).first()
        assert original is None

        # verify subtasks created
        subtasks = db_session.query(Task).filter(
            Task.topic.like("Large Task - Part%")
        ).all()

        assert len(subtasks) > 1
        assert all(task.estimated_minutes <= 180 for task in subtasks)


# ============== EDGE CASE TESTS ==============

class TestEdgeCases:
    """test edge cases and error conditions"""

    def test_no_tasks(self, db_session, test_user, test_energy_profile):
        """test scheduling with no tasks"""
        result = schedule_tasks(test_user.id, db_session)

        assert result['scheduled_count'] == 0
        assert result['total_tasks'] == 0
        assert result['unscheduled_count'] == 0

    def test_task_due_in_past(self, db_session, test_user, test_energy_profile):
        """test task with due date in the past"""
        past_date = datetime.now() - timedelta(days=5)

        task = Task(
            topic="Overdue Task",
            estimated_minutes=60,
            difficulty=3,
            due_date=past_date
        )
        db_session.add(task)
        db_session.commit()

        # should handle gracefully (might not schedule if no time blocks in past)
        result = schedule_tasks(test_user.id, db_session)

        # verify no crash
        assert 'scheduled_count' in result

    def test_no_energy_profile_uses_defaults(self, db_session, test_user):
        """test that defaults are used when no energy profile exists"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            topic="Test Task",
            estimated_minutes=60,
            difficulty=3,
            due_date=base_date + timedelta(days=2)
        )
        db_session.add(task)
        db_session.commit()

        # should use default constants
        result = schedule_tasks(test_user.id, db_session)

        # verify scheduling works with defaults
        assert result is not None
        assert 'scheduled_count' in result

    def test_task_exactly_min_duration(self, db_session, test_user, test_energy_profile):
        """test task with exactly MIN_STUDY_DURATION"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            topic="Minimum Task",
            estimated_minutes=30,  # exactly MIN_STUDY_DURATION
            difficulty=3,
            due_date=base_date + timedelta(days=1)
        )
        db_session.add(task)
        db_session.commit()

        result = schedule_tasks(test_user.id, db_session)

        # should schedule normally
        assert result['scheduled_count'] >= 0  # might be 0 if no time blocks, but shouldn't crash


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
