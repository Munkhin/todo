from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from api.timezone.conversions import utc_now

Base = declarative_base()

class CalendarEvent(Base):

    # defines meta params
    __tablename__ = "calendar_events" # declares the table
    __table_args__ = {"extend_existing": True} # editable attribute

    id = Column(Integer, primary_key=True) 
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) #\
    title = Column(String, nullable=False) 
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    event_type = Column(String, default="study") 
    source = Column(String, default="user")  # manually created: user AI generated: system
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True) 

    # timestamps that dedfault to current time(now) but in utc
    created_at = Column(DateTime, default=utc_now) 
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)