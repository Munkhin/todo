# supabase database client and helper functions
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# load environment variables from .env file if it exists
# try both current directory and parent directory
load_dotenv()  # looks in current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))  # looks in parent

# initialize supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # use service key for backend operations

if not supabase_url or not supabase_key:
    raise ValueError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
        "In production, set these as environment variables. "
        "For local development, add them to a .env file."
    )

supabase: Client = create_client(supabase_url, supabase_key)

# ============ USER OPERATIONS ============

def create_or_update_user(google_user_id: str, email: str, name: str) -> int:
    """create or update user in database, returns user id"""
    try:
        # check if user exists
        response = supabase.table("users").select("id").eq("google_user_id", google_user_id).execute()

        if response.data:
            # update existing user
            user_id = response.data[0]["id"]
            supabase.table("users").update({
                "email": email,
                "name": name
            }).eq("id", user_id).execute()
            return user_id
        else:
            # create new user
            response = supabase.table("users").insert({
                "google_user_id": google_user_id,
                "email": email,
                "name": name,
                "subscription_plan": "free",
                "credits_used": 0,
                "subscription_status": "active"
            }).execute()
            return response.data[0]["id"]
    except Exception as e:
        print(f"Error creating/updating user: {e}")
        raise

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """get user by id"""
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

def get_user_credits(user_id: int) -> Optional[Dict[str, Any]]:
    """get user's credit information"""
    try:
        response = supabase.table("users").select(
            "subscription_plan, credits_used, subscription_status"
        ).eq("id", user_id).execute()

        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error getting user credits: {e}")
        return None

def update_user_plan(user_id: int, plan_type: str) -> bool:
    """update user's subscription plan"""
    try:
        supabase.table("users").update({
            "subscription_plan": plan_type
        }).eq("id", user_id).execute()
        return True
    except Exception as e:
        print(f"Error updating user plan: {e}")
        return False

def update_user_timezone(user_id: int, timezone: str) -> bool:
    """update user's timezone"""
    try:
        supabase.table("users").update({
            "timezone": timezone
        }).eq("id", user_id).execute()
        return True
    except Exception as e:
        print(f"Error updating timezone: {e}")
        return False

def update_user_conversation_id(user_id: int, conversation_id: str) -> bool:
    """update user's current conversation id"""
    try:
        supabase.table("users").update({
            "conversation_id": conversation_id
        }).eq("id", user_id).execute()
        return True
    except Exception as e:
        print(f"Error updating conversation id: {e}")
        return False

def get_user_conversation_id(user_id: int) -> Optional[str]:
    """get user's current conversation id"""
    try:
        response = supabase.table("users").select("conversation_id").eq("id", user_id).execute()
        if response.data and response.data[0].get("conversation_id"):
            return response.data[0]["conversation_id"]
        return None
    except Exception as e:
        print(f"Error getting conversation id: {e}")
        return None

# ============ SESSION OPERATIONS ============

def create_session(session_id: str, credentials: Dict[str, Any]) -> bool:
    """create or update session in database"""
    try:
        # check if session exists
        response = supabase.table("sessions").select("id").eq("session_id", session_id).execute()

        if response.data:
            # update existing session
            supabase.table("sessions").update({
                "credentials": credentials
            }).eq("session_id", session_id).execute()
        else:
            # create new session
            supabase.table("sessions").insert({
                "session_id": session_id,
                "credentials": credentials
            }).execute()
        return True
    except Exception as e:
        print(f"Error creating session: {e}")
        return False

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """get session by id"""
    try:
        response = supabase.table("sessions").select("*").eq("session_id", session_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error getting session: {e}")
        return None

def delete_session(session_id: str) -> bool:
    """delete session from database"""
    try:
        supabase.table("sessions").delete().eq("session_id", session_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting session: {e}")
        return False

# ============ TASK OPERATIONS ============

def create_task(task_data: Dict[str, Any]) -> Optional[int]:
    """create new task, returns task id"""
    try:
        response = supabase.table("tasks").insert(task_data).execute()
        return response.data[0]["id"] if response.data else None
    except Exception as e:
        print(f"Error creating task: {e}")
        return None

def get_tasks_by_user(user_id: int) -> list[Dict[str, Any]]:
    """get all tasks for user"""
    try:
        response = supabase.table("tasks").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        print(f"Error getting tasks: {e}")
        return []

def update_task(task_id: int, task_data: Dict[str, Any]) -> bool:
    """update task"""
    try:
        supabase.table("tasks").update(task_data).eq("id", task_id).execute()
        return True
    except Exception as e:
        print(f"Error updating task: {e}")
        return False

def delete_task(task_id: int) -> bool:
    """delete task"""
    try:
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting task: {e}")
        return False

# ============ CALENDAR EVENT OPERATIONS ============

def create_calendar_event(event_data: Dict[str, Any]) -> Optional[int]:
    """create calendar event, returns event id"""
    try:
        response = supabase.table("calendar_events").insert(event_data).execute()
        return response.data[0]["id"] if response.data else None
    except Exception as e:
        print(f"Error creating calendar event: {e}")
        return None

def get_calendar_events(user_id: int) -> list[Dict[str, Any]]:
    """get all calendar events for user"""
    try:
        response = supabase.table("calendar_events").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        print(f"Error getting calendar events: {e}")
        return []

def update_calendar_event(event_id: int, event_data: Dict[str, Any]) -> bool:
    """update calendar event"""
    try:
        supabase.table("calendar_events").update(event_data).eq("id", event_id).execute()
        return True
    except Exception as e:
        print(f"Error updating calendar event: {e}")
        return False

def delete_calendar_event(event_id: int) -> bool:
    """delete calendar event"""
    try:
        supabase.table("calendar_events").delete().eq("id", event_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting calendar event: {e}")
        return False

def get_calendar_events_by_task_id(task_id: int) -> list[Dict[str, Any]]:
    """get all calendar events linked to a specific task"""
    try:
        response = supabase.table("calendar_events").select("*").eq("task_id", task_id).execute()
        return response.data
    except Exception as e:
        print(f"Error getting calendar events by task_id: {e}")
        return []

# ============ ENERGY PROFILE OPERATIONS ============

def get_energy_profile(user_id: int) -> Optional[Dict[str, Any]]:
    """get user's energy profile"""
    try:
        response = supabase.table("energy_profiles").select("*").eq("user_id", user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error getting energy profile: {e}")
        return None

def create_or_update_energy_profile(user_id: int, profile_data: Dict[str, Any]) -> bool:
    """create or update energy profile"""
    try:
        # check if profile exists
        response = supabase.table("energy_profiles").select("id").eq("user_id", user_id).execute()

        if response.data:
            # update existing profile
            supabase.table("energy_profiles").update(profile_data).eq("user_id", user_id).execute()
        else:
            # create new profile
            profile_data["user_id"] = user_id
            supabase.table("energy_profiles").insert(profile_data).execute()
        return True
    except Exception as e:
        print(f"Error creating/updating energy profile: {e}")
        return False
