from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import httpx
from datetime import datetime, timezone, timedelta
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Build Compliance Portal")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "client"  # "lawyer", "admin", "client"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    project_id: str = Field(default_factory=lambda: f"proj_{uuid.uuid4().hex[:12]}")
    name: str
    client_name: str
    client_email: str
    contract_type: str
    description: Optional[str] = None
    status: str = "active"  # active, completed, on_hold
    archived: bool = False  # Archived projects don't show in main list
    # Value tracking (Cost)
    starting_value: float = 0.0
    current_value: float = 0.0
    # Claims tracking
    total_claimed: float = 0.0
    total_approved: float = 0.0
    # Date tracking (Time)
    start_date: Optional[str] = None
    original_completion_date: Optional[str] = None
    current_completion_date: Optional[str] = None
    # Location
    location: Optional[str] = None
    # Stakeholders
    owner: Optional[str] = None
    builder: Optional[str] = None
    subcontractors: Optional[str] = None
    # Team Members
    client_team_members: Optional[str] = None
    bc_team_members: Optional[str] = None
    # Contract Workflow Rules (auto-calculate dates)
    workflow_rules: dict = Field(default_factory=lambda: {
        "notice_to_claim_days": 5,  # Days after notice to submit claim
        "claim_to_response_days": 14,  # Days for response after claim
        "eot_notice_days": 7,  # Days to submit EOT notice
        "variation_claim_days": 14,  # Days to submit variation claim
        "payment_claim_days": 28,  # Days for payment claim cycle
    })
    # Legacy fields
    key_dates: dict = Field(default_factory=dict)
    commercial_params: dict = Field(default_factory=dict)
    assigned_lawyers: List[str] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    client_name: str
    client_email: EmailStr
    contract_type: str
    description: Optional[str] = None
    starting_value: float = 0.0
    current_value: float = 0.0
    start_date: Optional[str] = None
    original_completion_date: Optional[str] = None
    current_completion_date: Optional[str] = None
    location: Optional[str] = None
    owner: Optional[str] = None
    builder: Optional[str] = None
    subcontractors: Optional[str] = None
    client_team_members: Optional[str] = None
    bc_team_members: Optional[str] = None

class Deadline(BaseModel):
    deadline_id: str = Field(default_factory=lambda: f"dl_{uuid.uuid4().hex[:12]}")
    project_id: str
    title: str
    description: Optional[str] = None
    due_date: datetime
    status: str = "pending"  # pending, completed, overdue, suppressed
    priority: str = "medium"  # low, medium, high, critical
    # Escalation tracking
    reminder_7_sent: bool = False
    reminder_3_sent: bool = False
    reminder_1_sent: bool = False
    escalated: bool = False
    escalation_sent_at: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeadlineCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    due_date: datetime
    priority: str = "medium"

class Notice(BaseModel):
    notice_id: str = Field(default_factory=lambda: f"ntc_{uuid.uuid4().hex[:12]}")
    project_id: str
    title: str
    notice_type: str  # variation, delay, latent_condition, design_issue, contamination, general, claim
    content: str
    status: str = "draft"  # draft, submitted, approved, closed
    recipient_email: Optional[str] = None
    # Financial tracking
    claimed_amount: Optional[float] = None
    approved_amount: Optional[float] = None
    # Dates
    submitted_date: Optional[str] = None
    response_due_date: Optional[str] = None
    approved_date: Optional[str] = None
    issued_at: Optional[datetime] = None
    response_deadline: Optional[datetime] = None
    # Edit tracking
    edited_at: Optional[str] = None
    edit_count: int = 0
    # Linked event (if generated from trigger)
    linked_event_id: Optional[str] = None
    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoticeCreate(BaseModel):
    project_id: str
    title: str
    notice_type: str
    content: str
    recipient_email: Optional[str] = None
    response_deadline: Optional[datetime] = None
    claimed_amount: Optional[float] = None
    response_due_date: Optional[str] = None
    linked_event_id: Optional[str] = None

class Questionnaire(BaseModel):
    questionnaire_id: str = Field(default_factory=lambda: f"qst_{uuid.uuid4().hex[:12]}")
    project_id: str
    title: str
    category: str  # latent_conditions, variations, delays, design_issues, contamination
    questions: List[dict] = Field(default_factory=list)
    responses: dict = Field(default_factory=dict)
    status: str = "draft"  # draft, active, completed
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionnaireCreate(BaseModel):
    project_id: str
    title: str
    category: str
    questions: List[dict] = Field(default_factory=list)

class Notification(BaseModel):
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    notification_type: str  # deadline, notice, project, system, escalation
    reference_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Document(BaseModel):
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    project_id: str
    filename: str
    file_type: str
    file_size: int
    category: str = "general"  # contract, notice, correspondence, report, general
    description: Optional[str] = None
    uploaded_by: str
    content_base64: Optional[str] = None  # Store small files directly
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    project_id: str
    filename: str
    category: str = "general"
    description: Optional[str] = None

class EmailDraft(BaseModel):
    """Store email drafts for later sending"""
    draft_id: str = Field(default_factory=lambda: f"email_{uuid.uuid4().hex[:12]}")
    project_id: str
    to_email: str
    subject: str
    body: str
    status: str = "draft"  # draft, sent
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None

class EmailDraftCreate(BaseModel):
    project_id: str
    to_email: str
    subject: str
    body: str

class AssistanceRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    project_id: str
    user_id: str
    subject: str
    message: str
    status: str = "pending"  # pending, in_progress, resolved
    priority: str = "normal"  # normal, urgent
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class AssistanceRequestCreate(BaseModel):
    project_id: str
    subject: str
    message: str
    priority: str = "normal"

# ============ CONSTRUCTION PROGRAM MODELS ============

class ProgramTask(BaseModel):
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    project_id: str
    name: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    progress: int = 0  # 0-100
    status: str = "not_started"  # not_started, in_progress, completed, delayed
    assigned_subcontractor_id: Optional[str] = None
    dependencies: List[str] = Field(default_factory=list)  # List of task_ids
    color: str = "#3b82f6"  # Default blue
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProgramTaskCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    assigned_subcontractor_id: Optional[str] = None
    color: str = "#3b82f6"

class Subcontractor(BaseModel):
    subcontractor_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    project_id: str
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    trade: str  # e.g., Electrical, Plumbing, Structural
    status: str = "pending"  # pending, invited, active, inactive
    invited_at: Optional[datetime] = None
    user_id: Optional[str] = None  # Linked user account when they sign up
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubcontractorCreate(BaseModel):
    project_id: str
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    trade: str

class Subcontract(BaseModel):
    subcontract_id: str = Field(default_factory=lambda: f"contract_{uuid.uuid4().hex[:12]}")
    project_id: str
    subcontractor_id: str
    title: str
    contract_value: float = 0.0
    scope_of_work: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    terms: Optional[str] = None
    status: str = "draft"  # draft, issued, signed, terminated
    issued_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubcontractCreate(BaseModel):
    project_id: str
    subcontractor_id: str
    title: str
    contract_value: float = 0.0
    scope_of_work: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    terms: Optional[str] = None

class ClaimTemplate(BaseModel):
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    project_id: str
    template_type: str  # variation, delay, extension_of_time, payment_claim
    title: str
    content: str
    available_to_subcontractors: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ TRIGGER LIBRARY MODELS ============

class TriggerTemplate(BaseModel):
    """Trigger library - configurable triggers for project events"""
    trigger_id: str = Field(default_factory=lambda: f"trig_{uuid.uuid4().hex[:12]}")
    name: str  # e.g., "Delay Notice Required", "Variation Claim Due"
    event_type: str  # delay, cost, variation, dispute, extension_of_time, payment_claim, defect, general
    description: Optional[str] = None
    importance: str = "medium"  # low, medium, high, critical
    next_steps: Optional[str] = None  # Instructions for what to do
    outcome: Optional[str] = None  # Expected outcome if not actioned
    # Thresholds for status colors
    days_to_orange: int = 7  # Days before due date to show orange
    days_to_red: int = 1  # Days before due date to show red
    # Red flag rules
    causes_red_flag: bool = True  # Whether overdue triggers red status
    requires_due_date: bool = True  # Events without due date won't trigger status
    requires_value: bool = False  # Events without value won't trigger red
    min_value_for_red: float = 0.0  # Minimum value to trigger red flag
    # Status
    is_active: bool = True
    is_system: bool = False  # System triggers can't be deleted
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TriggerTemplateCreate(BaseModel):
    name: str
    event_type: str
    description: Optional[str] = None
    importance: str = "medium"
    next_steps: Optional[str] = None
    outcome: Optional[str] = None
    days_to_orange: int = 7
    days_to_red: int = 1
    causes_red_flag: bool = True
    requires_due_date: bool = True
    requires_value: bool = False
    min_value_for_red: float = 0.0

class ProjectEvent(BaseModel):
    """Events assigned to projects, linked to triggers"""
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    project_id: str
    trigger_id: str  # Reference to TriggerTemplate
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None  # ISO date string
    value: Optional[float] = None  # Associated monetary value
    status: str = "pending"  # pending, in_progress, completed, overdue, dismissed
    # Computed status color (updated by system)
    status_color: str = "green"  # green, orange, red
    # Manual override
    manual_status_override: Optional[str] = None  # lawyer can override
    override_reason: Optional[str] = None
    overridden_by: Optional[str] = None
    # Completion tracking
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectEventCreate(BaseModel):
    project_id: str
    trigger_id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None

# ============ AUTH HELPERS ============

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookies or Authorization header."""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def require_lawyer(user: User = Depends(get_current_user)) -> User:
    """Require user to be a lawyer or admin."""
    if user.role not in ["lawyer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Lawyers only.")
    return user

# ============ ESCALATION LOGIC ============

async def check_and_send_escalations():
    """Background task to check deadlines and send escalations."""
    now = datetime.now(timezone.utc)
    
    # Find all pending deadlines
    deadlines = await db.deadlines.find({"status": "pending"}, {"_id": 0}).to_list(1000)
    
    for deadline in deadlines:
        due_date = deadline.get("due_date")
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        
        days_until = (due_date - now).days
        deadline_id = deadline["deadline_id"]
        project_id = deadline["project_id"]
        
        # Get project for context
        project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
        if not project:
            continue
        
        # Check if overdue
        if days_until < 0 and not deadline.get("escalated"):
            # Mark as overdue and escalate
            await db.deadlines.update_one(
                {"deadline_id": deadline_id},
                {"$set": {
                    "status": "overdue",
                    "escalated": True,
                    "escalation_sent_at": now.isoformat()
                }}
            )
            # Notify all lawyers
            lawyers = await db.users.find({"role": {"$in": ["lawyer", "admin"]}}, {"_id": 0}).to_list(100)
            for lawyer in lawyers:
                await create_notification(
                    lawyer["user_id"],
                    f"ESCALATION: Overdue Deadline",
                    f"Deadline '{deadline['title']}' for project '{project['name']}' is overdue!",
                    "escalation",
                    deadline_id
                )
        
        # 7-day reminder
        elif days_until <= 7 and days_until > 3 and not deadline.get("reminder_7_sent"):
            await db.deadlines.update_one(
                {"deadline_id": deadline_id},
                {"$set": {"reminder_7_sent": True}}
            )
            await create_notification(
                deadline["created_by"],
                "Deadline Reminder - 7 Days",
                f"Deadline '{deadline['title']}' is due in {days_until} days",
                "deadline",
                deadline_id
            )
        
        # 3-day reminder
        elif days_until <= 3 and days_until > 1 and not deadline.get("reminder_3_sent"):
            await db.deadlines.update_one(
                {"deadline_id": deadline_id},
                {"$set": {"reminder_3_sent": True}}
            )
            await create_notification(
                deadline["created_by"],
                "Deadline Reminder - 3 Days",
                f"URGENT: Deadline '{deadline['title']}' is due in {days_until} days",
                "deadline",
                deadline_id
            )
        
        # 1-day reminder
        elif days_until <= 1 and days_until >= 0 and not deadline.get("reminder_1_sent"):
            await db.deadlines.update_one(
                {"deadline_id": deadline_id},
                {"$set": {"reminder_1_sent": True}}
            )
            await create_notification(
                deadline["created_by"],
                "Deadline Reminder - Tomorrow!",
                f"CRITICAL: Deadline '{deadline['title']}' is due tomorrow!",
                "deadline",
                deadline_id
            )

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token and user data."""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
        role = existing_user.get("role", "client")
    else:
        # Create new user (default to client role)
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "client"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user data."""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session."""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============ TEST LOGIN (DEVELOPMENT ONLY) ============

@api_router.post("/auth/test-login")
async def test_login(request: Request, response: Response):
    """
    Development-only endpoint for testing the UX without Google OAuth.
    Creates or uses a test user with the specified role.
    """
    body = await request.json()
    role = body.get("role", "admin")  # admin, lawyer, or client
    
    if role not in ["admin", "lawyer", "client"]:
        raise HTTPException(status_code=400, detail="Invalid role. Use: admin, lawyer, or client")
    
    # Test user emails by role
    test_emails = {
        "admin": "admin@test.com",
        "lawyer": "lawyer@test.com",
        "client": "client@test.com"
    }
    
    test_email = test_emails[role]
    test_name = f"Test {role.title()} User"
    
    # Check if test user exists
    existing_user = await db.users.find_one({"email": test_email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create test user
        user_id = f"test_{role}_{uuid.uuid4().hex[:8]}"
        new_user = {
            "user_id": user_id,
            "email": test_email,
            "name": test_name,
            "picture": None,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = f"test_session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,  # For development
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {
        "message": f"Logged in as test {role}",
        "user_id": user_id,
        "email": test_email,
        "name": test_name,
        "role": role
    }

# ============ USER MANAGEMENT ============

@api_router.get("/users", response_model=List[dict])
async def list_users(user: User = Depends(require_lawyer)):
    """List all users (lawyers only)."""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: User = Depends(require_lawyer)):
    """Update user role (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if role not in ["lawyer", "admin", "client"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}

# ============ PROJECT ENDPOINTS ============

@api_router.get("/projects", response_model=List[dict])
async def list_projects(user: User = Depends(get_current_user), include_archived: bool = False):
    """List projects. Lawyers see all, clients see their own. Archived excluded by default."""
    query = {} if include_archived else {"archived": {"$ne": True}}
    
    if user.role in ["lawyer", "admin"]:
        projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    else:
        query["client_email"] = user.email
        projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    return projects

@api_router.get("/projects/archived", response_model=List[dict])
async def list_archived_projects(user: User = Depends(require_lawyer)):
    """List archived projects (lawyers only)."""
    projects = await db.projects.find({"archived": True}, {"_id": 0}).to_list(1000)
    return projects

@api_router.post("/projects/{project_id}/archive")
async def archive_project(project_id: str, user: User = Depends(require_lawyer)):
    """Archive a project."""
    result = await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"archived": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project archived"}

@api_router.post("/projects/{project_id}/unarchive")
async def unarchive_project(project_id: str, user: User = Depends(require_lawyer)):
    """Unarchive a project."""
    result = await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"archived": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project unarchived"}

@api_router.get("/projects/with-status", response_model=List[dict])
async def list_projects_with_status(user: User = Depends(get_current_user), include_archived: bool = False):
    """List all projects with their calculated status colors."""
    query = {} if include_archived else {"archived": {"$ne": True}}
    
    if user.role in ["lawyer", "admin"]:
        projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    else:
        query["client_email"] = user.email
        projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    # Get all events
    project_ids = [p["project_id"] for p in projects]
    all_events = await db.project_events.find(
        {"project_id": {"$in": project_ids}}, 
        {"_id": 0}
    ).to_list(10000)
    
    # Get all triggers
    trigger_ids = list(set(e.get("trigger_id") for e in all_events if e.get("trigger_id")))
    triggers = await db.trigger_templates.find({"trigger_id": {"$in": trigger_ids}}, {"_id": 0}).to_list(1000)
    trigger_map = {t["trigger_id"]: t for t in triggers}
    
    # Group events by project
    events_by_project = {}
    for event in all_events:
        pid = event["project_id"]
        if pid not in events_by_project:
            events_by_project[pid] = []
        events_by_project[pid].append(event)
    
    # Calculate status for each project
    for project in projects:
        pid = project["project_id"]
        events = events_by_project.get(pid, [])
        
        has_red = False
        has_orange = False
        next_due = None
        pending_count = 0
        
        for event in events:
            if event.get("status") in ["completed", "dismissed"]:
                continue
            pending_count += 1
            trigger = trigger_map.get(event.get("trigger_id"), {})
            color = calculate_event_status_color(event, trigger)
            if color == "red":
                has_red = True
            elif color == "orange":
                has_orange = True
            
            if event.get("due_date") and (not next_due or event["due_date"] < next_due):
                next_due = event["due_date"]
        
        project["status_color"] = "red" if has_red else ("orange" if has_orange else "green")
        project["next_due_date"] = next_due
        project["pending_events_count"] = pending_count
    
    return projects

@api_router.post("/projects", response_model=dict)
async def create_project(project_data: ProjectCreate, user: User = Depends(require_lawyer)):
    """Create a new project (lawyers only)."""
    project = Project(
        **project_data.model_dump(),
        created_by=user.user_id,
        assigned_lawyers=[user.user_id]
    )
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    
    # Create notification for client if they exist
    client_user = await db.users.find_one({"email": project_data.client_email}, {"_id": 0})
    if client_user:
        await create_notification(
            client_user["user_id"],
            "New Project Created",
            f"You've been added to project: {project_data.name}",
            "project",
            project.project_id
        )
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/projects/{project_id}", response_model=dict)
async def get_project(project_id: str, user: User = Depends(get_current_user)):
    """Get project details."""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if user.role == "client" and project.get("client_email") != user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return project

@api_router.patch("/projects/{project_id}")
async def update_project(project_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update project (lawyers only)."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"project_id": project_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project updated"}

@api_router.get("/projects/{project_id}/summary")
async def get_project_summary(project_id: str, user: User = Depends(get_current_user)):
    """Get project summary with outstanding items."""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if user.role == "client" and project.get("client_email") != user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get outstanding items
    pending_deadlines = await db.deadlines.count_documents({"project_id": project_id, "status": "pending"})
    overdue_deadlines = await db.deadlines.count_documents({"project_id": project_id, "status": "overdue"})
    draft_notices = await db.notices.count_documents({"project_id": project_id, "status": "draft"})
    issued_notices = await db.notices.count_documents({"project_id": project_id, "status": "issued"})
    active_questionnaires = await db.questionnaires.count_documents({"project_id": project_id, "status": "active"})
    
    return {
        "project": project,
        "outstanding": {
            "pending_deadlines": pending_deadlines,
            "overdue_deadlines": overdue_deadlines,
            "draft_notices": draft_notices,
            "issued_notices": issued_notices,
            "active_questionnaires": active_questionnaires,
            "total_action_items": pending_deadlines + overdue_deadlines + draft_notices
        }
    }

# ============ DEADLINE ENDPOINTS ============

@api_router.get("/deadlines", response_model=List[dict])
async def list_deadlines(user: User = Depends(get_current_user), project_id: Optional[str] = None):
    """List deadlines."""
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    if user.role == "client":
        # Get client's projects
        projects = await db.projects.find({"client_email": user.email}, {"project_id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["project_id"] for p in projects]
        query["project_id"] = {"$in": project_ids}
    
    deadlines = await db.deadlines.find(query, {"_id": 0}).to_list(1000)
    return deadlines

@api_router.post("/deadlines", response_model=dict)
async def create_deadline(deadline_data: DeadlineCreate, user: User = Depends(require_lawyer)):
    """Create a deadline (lawyers only)."""
    deadline = Deadline(**deadline_data.model_dump(), created_by=user.user_id)
    doc = deadline.model_dump()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.deadlines.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/deadlines/{deadline_id}")
async def update_deadline(deadline_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update deadline (lawyers only)."""
    if "due_date" in updates and isinstance(updates["due_date"], datetime):
        updates["due_date"] = updates["due_date"].isoformat()
    result = await db.deadlines.update_one({"deadline_id": deadline_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"message": "Deadline updated"}

@api_router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: str, user: User = Depends(require_lawyer)):
    """Delete deadline (lawyers only)."""
    result = await db.deadlines.delete_one({"deadline_id": deadline_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"message": "Deadline deleted"}

# ============ NOTICE ENDPOINTS ============

@api_router.get("/notices", response_model=List[dict])
async def list_notices(user: User = Depends(get_current_user), project_id: Optional[str] = None):
    """List notices."""
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    if user.role == "client":
        projects = await db.projects.find({"client_email": user.email}, {"project_id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["project_id"] for p in projects]
        query["project_id"] = {"$in": project_ids}
        # Clients only see issued notices
        query["status"] = {"$ne": "draft"}
    
    notices = await db.notices.find(query, {"_id": 0}).to_list(1000)
    return notices

@api_router.post("/notices", response_model=dict)
async def create_notice(notice_data: NoticeCreate, user: User = Depends(require_lawyer)):
    """Create a notice (lawyers only)."""
    notice = Notice(**notice_data.model_dump(), created_by=user.user_id)
    doc = notice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('issued_at'):
        doc['issued_at'] = doc['issued_at'].isoformat()
    if doc.get('response_deadline'):
        doc['response_deadline'] = doc['response_deadline'].isoformat()
    await db.notices.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/notices/{notice_id}")
async def update_notice(notice_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update notice (lawyers only). Tracks edit history."""
    notice = await db.notices.find_one({"notice_id": notice_id}, {"_id": 0})
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track edits if notice was already submitted
    if notice.get("status") in ["submitted", "approved", "closed"]:
        updates["edited_at"] = datetime.now(timezone.utc).isoformat()
        updates["edit_count"] = notice.get("edit_count", 0) + 1
    
    if "issued_at" in updates and isinstance(updates["issued_at"], datetime):
        updates["issued_at"] = updates["issued_at"].isoformat()
    
    await db.notices.update_one({"notice_id": notice_id}, {"$set": updates})
    
    # Update project totals if claimed/approved amounts changed
    if "claimed_amount" in updates or "approved_amount" in updates:
        await update_project_totals(notice["project_id"])
    
    return {"message": "Notice updated"}

@api_router.post("/notices/{notice_id}/submit")
async def submit_notice(notice_id: str, user: User = Depends(require_lawyer)):
    """Submit a notice/claim (changes status to submitted)."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.notices.update_one(
        {"notice_id": notice_id},
        {"$set": {"status": "submitted", "submitted_date": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    notice = await db.notices.find_one({"notice_id": notice_id}, {"_id": 0})
    await update_project_totals(notice["project_id"])
    
    return {"message": "Notice submitted"}

@api_router.post("/notices/{notice_id}/approve")
async def approve_notice(notice_id: str, approved_amount: float, user: User = Depends(require_lawyer)):
    """Approve a notice/claim with approved amount."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.notices.update_one(
        {"notice_id": notice_id},
        {"$set": {
            "status": "approved", 
            "approved_amount": approved_amount,
            "approved_date": now, 
            "updated_at": now
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    notice = await db.notices.find_one({"notice_id": notice_id}, {"_id": 0})
    await update_project_totals(notice["project_id"])
    
    return {"message": "Notice approved", "approved_amount": approved_amount}

async def update_project_totals(project_id: str):
    """Update project's total claimed and approved amounts."""
    pipeline = [
        {"$match": {"project_id": project_id, "status": {"$in": ["submitted", "approved", "closed"]}}},
        {"$group": {
            "_id": None,
            "total_claimed": {"$sum": {"$ifNull": ["$claimed_amount", 0]}},
            "total_approved": {"$sum": {"$ifNull": ["$approved_amount", 0]}}
        }}
    ]
    result = await db.notices.aggregate(pipeline).to_list(1)
    if result:
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": {
                "total_claimed": result[0].get("total_claimed", 0),
                "total_approved": result[0].get("total_approved", 0)
            }}
        )

@api_router.post("/notices/{notice_id}/issue")
async def issue_notice(notice_id: str, user: User = Depends(require_lawyer)):
    """Issue a notice (changes status and sets issued_at)."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.notices.update_one(
        {"notice_id": notice_id},
        {"$set": {"status": "issued", "issued_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    # Get notice for notification
    notice = await db.notices.find_one({"notice_id": notice_id}, {"_id": 0})
    project = await db.projects.find_one({"project_id": notice["project_id"]}, {"_id": 0})
    if project:
        client_user = await db.users.find_one({"email": project.get("client_email")}, {"_id": 0})
        if client_user:
            await create_notification(
                client_user["user_id"],
                "Notice Issued",
                f"A new notice has been issued: {notice['title']}",
                "notice",
                notice_id
            )
    
    return {"message": "Notice issued"}

# ============ EMAIL DRAFTS ENDPOINTS ============

@api_router.get("/projects/{project_id}/emails", response_model=List[dict])
async def list_email_drafts(project_id: str, user: User = Depends(require_lawyer)):
    """List email drafts for a project."""
    drafts = await db.email_drafts.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    return drafts

@api_router.post("/projects/{project_id}/emails", response_model=dict)
async def create_email_draft(project_id: str, email_data: EmailDraftCreate, user: User = Depends(require_lawyer)):
    """Create an email draft."""
    draft = EmailDraft(**email_data.model_dump(), created_by=user.user_id)
    doc = draft.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.email_drafts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/projects/{project_id}/emails/{draft_id}")
async def update_email_draft(project_id: str, draft_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update an email draft."""
    result = await db.email_drafts.update_one(
        {"draft_id": draft_id, "project_id": project_id}, 
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email draft not found")
    return {"message": "Draft updated"}

@api_router.delete("/projects/{project_id}/emails/{draft_id}")
async def delete_email_draft(project_id: str, draft_id: str, user: User = Depends(require_lawyer)):
    """Delete an email draft."""
    result = await db.email_drafts.delete_one({"draft_id": draft_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Email draft not found")
    return {"message": "Draft deleted"}

# ============ QUESTIONNAIRE ENDPOINTS ============

@api_router.get("/questionnaires", response_model=List[dict])
async def list_questionnaires(user: User = Depends(get_current_user), project_id: Optional[str] = None):
    """List questionnaires."""
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    if user.role == "client":
        projects = await db.projects.find({"client_email": user.email}, {"project_id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["project_id"] for p in projects]
        query["project_id"] = {"$in": project_ids}
        query["status"] = {"$ne": "draft"}
    
    questionnaires = await db.questionnaires.find(query, {"_id": 0}).to_list(1000)
    return questionnaires

@api_router.post("/questionnaires", response_model=dict)
async def create_questionnaire(qst_data: QuestionnaireCreate, user: User = Depends(require_lawyer)):
    """Create a questionnaire (lawyers only)."""
    questionnaire = Questionnaire(**qst_data.model_dump(), created_by=user.user_id)
    doc = questionnaire.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.questionnaires.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/questionnaires/{questionnaire_id}")
async def update_questionnaire(questionnaire_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update questionnaire (lawyers only)."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.questionnaires.update_one({"questionnaire_id": questionnaire_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    return {"message": "Questionnaire updated"}

@api_router.post("/questionnaires/{questionnaire_id}/respond")
async def respond_to_questionnaire(questionnaire_id: str, responses: dict, user: User = Depends(get_current_user)):
    """Submit responses to a questionnaire (clients can respond)."""
    questionnaire = await db.questionnaires.find_one({"questionnaire_id": questionnaire_id}, {"_id": 0})
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    # Verify client access
    if user.role == "client":
        project = await db.projects.find_one({"project_id": questionnaire["project_id"]}, {"_id": 0})
        if not project or project.get("client_email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")
    
    await db.questionnaires.update_one(
        {"questionnaire_id": questionnaire_id},
        {"$set": {"responses": responses, "status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Responses submitted"}

# ============ DOCUMENT LIBRARY ENDPOINTS ============

@api_router.get("/documents", response_model=List[dict])
async def list_documents(user: User = Depends(get_current_user), project_id: Optional[str] = None):
    """List documents."""
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    if user.role == "client":
        projects = await db.projects.find({"client_email": user.email}, {"project_id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["project_id"] for p in projects]
        query["project_id"] = {"$in": project_ids}
    
    # Don't return content_base64 in list view
    documents = await db.documents.find(query, {"_id": 0, "content_base64": 0}).to_list(1000)
    return documents

@api_router.post("/documents")
async def upload_document(
    project_id: str,
    category: str = "general",
    description: str = "",
    file: UploadFile = File(...),
    user: User = Depends(require_lawyer)
):
    """Upload a document (lawyers only)."""
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Max 10MB
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    
    # Create document record
    doc = Document(
        project_id=project_id,
        filename=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        category=category,
        description=description,
        uploaded_by=user.user_id,
        content_base64=base64.b64encode(content).decode('utf-8')
    )
    
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    await db.documents.insert_one(doc_dict)
    
    # Return without content
    return {k: v for k, v in doc_dict.items() if k not in ["_id", "content_base64"]}

@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    """Get document with content."""
    document = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if user.role == "client":
        project = await db.projects.find_one({"project_id": document["project_id"]}, {"_id": 0})
        if not project or project.get("client_email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return document

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: User = Depends(require_lawyer)):
    """Delete document (lawyers only)."""
    result = await db.documents.delete_one({"document_id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ============ ASSISTANCE REQUEST ENDPOINTS ============

@api_router.get("/assistance-requests", response_model=List[dict])
async def list_assistance_requests(user: User = Depends(get_current_user)):
    """List assistance requests."""
    if user.role in ["lawyer", "admin"]:
        requests = await db.assistance_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        requests = await db.assistance_requests.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return requests

@api_router.post("/assistance-requests", response_model=dict)
async def create_assistance_request(req_data: AssistanceRequestCreate, user: User = Depends(get_current_user)):
    """Create an assistance request."""
    request = AssistanceRequest(
        **req_data.model_dump(),
        user_id=user.user_id
    )
    doc = request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.assistance_requests.insert_one(doc)
    
    # Notify lawyers
    lawyers = await db.users.find({"role": {"$in": ["lawyer", "admin"]}}, {"_id": 0}).to_list(100)
    project = await db.projects.find_one({"project_id": req_data.project_id}, {"_id": 0})
    for lawyer in lawyers:
        await create_notification(
            lawyer["user_id"],
            f"New Assistance Request{' - URGENT' if req_data.priority == 'urgent' else ''}",
            f"{user.name} needs help with project '{project['name'] if project else req_data.project_id}': {req_data.subject}",
            "system",
            request.request_id
        )
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/assistance-requests/{request_id}")
async def update_assistance_request(request_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update assistance request status (lawyers only)."""
    if updates.get("status") == "resolved":
        updates["resolved_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.assistance_requests.update_one({"request_id": request_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request updated"}

# ============ CONSTRUCTION PROGRAM ENDPOINTS ============

@api_router.get("/projects/{project_id}/program", response_model=List[dict])
async def get_program_tasks(project_id: str, user: User = Depends(get_current_user)):
    """Get all program tasks for a project."""
    # Verify access
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "client" and project.get("client_email") != user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    tasks = await db.program_tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.post("/projects/{project_id}/program", response_model=dict)
async def create_program_task(project_id: str, task_data: ProgramTaskCreate, user: User = Depends(require_lawyer)):
    """Create a program task."""
    task = ProgramTask(**task_data.model_dump(), created_by=user.user_id)
    doc = task.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.program_tasks.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.post("/projects/{project_id}/program/import")
async def import_program(project_id: str, file: UploadFile = File(...), user: User = Depends(require_lawyer)):
    """Import a construction program from CSV file.
    
    Expected CSV columns: task_name, start_date, end_date, subcontractor_name, subcontractor_trade, subcontractor_email
    Dates should be in YYYY-MM-DD or DD/MM/YYYY format.
    """
    import csv
    import io
    
    # Verify project exists
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read file content
    content = await file.read()
    try:
        # Try to decode as UTF-8
        text_content = content.decode('utf-8')
    except UnicodeDecodeError:
        # Try latin-1 as fallback
        text_content = content.decode('latin-1')
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(text_content))
    
    tasks_created = 0
    subcontractors_created = 0
    errors = []
    
    # Color palette for auto-assignment
    colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"]
    color_index = 0
    
    for row_num, row in enumerate(reader, start=2):
        try:
            task_name = row.get('task_name', '').strip()
            start_date = row.get('start_date', '').strip()
            end_date = row.get('end_date', '').strip()
            subcontractor_name = row.get('subcontractor_name', '').strip()
            subcontractor_trade = row.get('subcontractor_trade', '').strip()
            subcontractor_email = row.get('subcontractor_email', '').strip()
            
            if not task_name or not start_date or not end_date:
                errors.append(f"Row {row_num}: Missing required fields (task_name, start_date, end_date)")
                continue
            
            # Parse dates - support multiple formats
            def parse_date(date_str):
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']:
                    try:
                        from datetime import datetime
                        return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                    except ValueError:
                        continue
                return None
            
            parsed_start = parse_date(start_date)
            parsed_end = parse_date(end_date)
            
            if not parsed_start or not parsed_end:
                errors.append(f"Row {row_num}: Invalid date format for '{task_name}'")
                continue
            
            # Handle subcontractor
            subcontractor_id = None
            if subcontractor_name:
                # Check if subcontractor exists
                existing_sub = await db.subcontractors.find_one({
                    "project_id": project_id,
                    "company_name": {"$regex": f"^{subcontractor_name}$", "$options": "i"}
                }, {"_id": 0})
                
                if existing_sub:
                    subcontractor_id = existing_sub["subcontractor_id"]
                else:
                    # Create new subcontractor
                    new_sub = Subcontractor(
                        project_id=project_id,
                        company_name=subcontractor_name,
                        contact_name=subcontractor_name,
                        email=subcontractor_email or f"{subcontractor_name.lower().replace(' ', '')}@placeholder.com",
                        trade=subcontractor_trade or "Other",
                        status="pending",
                        created_by=user.user_id
                    )
                    sub_doc = new_sub.model_dump()
                    sub_doc['created_at'] = sub_doc['created_at'].isoformat()
                    await db.subcontractors.insert_one(sub_doc)
                    subcontractor_id = new_sub.subcontractor_id
                    subcontractors_created += 1
            
            # Create task
            task = ProgramTask(
                project_id=project_id,
                name=task_name,
                start_date=parsed_start,
                end_date=parsed_end,
                assigned_subcontractor_id=subcontractor_id,
                color=colors[color_index % len(colors)],
                created_by=user.user_id
            )
            task_doc = task.model_dump()
            task_doc['created_at'] = task_doc['created_at'].isoformat()
            await db.program_tasks.insert_one(task_doc)
            tasks_created += 1
            color_index += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Import completed",
        "tasks_created": tasks_created,
        "subcontractors_created": subcontractors_created,
        "errors": errors[:10] if errors else []  # Return first 10 errors
    }

@api_router.patch("/projects/{project_id}/program/{task_id}")
async def update_program_task(project_id: str, task_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update a program task."""
    result = await db.program_tasks.update_one(
        {"task_id": task_id, "project_id": project_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task updated"}

@api_router.delete("/projects/{project_id}/program/{task_id}")
async def delete_program_task(project_id: str, task_id: str, user: User = Depends(require_lawyer)):
    """Delete a program task."""
    result = await db.program_tasks.delete_one({"task_id": task_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ============ SUBCONTRACTOR ENDPOINTS ============

@api_router.get("/projects/{project_id}/subcontractors", response_model=List[dict])
async def list_subcontractors(project_id: str, user: User = Depends(get_current_user)):
    """List subcontractors for a project."""
    subcontractors = await db.subcontractors.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return subcontractors

@api_router.post("/projects/{project_id}/subcontractors", response_model=dict)
async def create_subcontractor(project_id: str, sub_data: SubcontractorCreate, user: User = Depends(require_lawyer)):
    """Create and invite a subcontractor."""
    subcontractor = Subcontractor(**sub_data.model_dump(), created_by=user.user_id)
    doc = subcontractor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.subcontractors.insert_one(doc)
    
    # Create user account for subcontractor (they'll be linked when they log in)
    existing_user = await db.users.find_one({"email": sub_data.email}, {"_id": 0})
    if not existing_user:
        new_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": sub_data.email,
            "name": sub_data.contact_name,
            "role": "subcontractor",
            "linked_subcontractor_id": subcontractor.subcontractor_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Update status to invited
    await db.subcontractors.update_one(
        {"subcontractor_id": subcontractor.subcontractor_id},
        {"$set": {"status": "invited", "invited_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/projects/{project_id}/subcontractors/{subcontractor_id}")
async def update_subcontractor(project_id: str, subcontractor_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update subcontractor details."""
    result = await db.subcontractors.update_one(
        {"subcontractor_id": subcontractor_id, "project_id": project_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcontractor not found")
    return {"message": "Subcontractor updated"}

# ============ SUBCONTRACT ENDPOINTS ============

@api_router.get("/projects/{project_id}/subcontracts", response_model=List[dict])
async def list_subcontracts(project_id: str, user: User = Depends(get_current_user)):
    """List subcontracts for a project."""
    subcontracts = await db.subcontracts.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return subcontracts

@api_router.post("/projects/{project_id}/subcontracts", response_model=dict)
async def create_subcontract(project_id: str, contract_data: SubcontractCreate, user: User = Depends(require_lawyer)):
    """Create a draft subcontract."""
    subcontract = Subcontract(**contract_data.model_dump(), created_by=user.user_id)
    doc = subcontract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.subcontracts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/projects/{project_id}/subcontracts/{subcontract_id}")
async def update_subcontract(project_id: str, subcontract_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update subcontract."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.subcontracts.update_one(
        {"subcontract_id": subcontract_id, "project_id": project_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcontract not found")
    return {"message": "Subcontract updated"}

@api_router.post("/projects/{project_id}/subcontracts/{subcontract_id}/issue")
async def issue_subcontract(project_id: str, subcontract_id: str, user: User = Depends(require_lawyer)):
    """Issue a subcontract to the subcontractor."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.subcontracts.update_one(
        {"subcontract_id": subcontract_id, "project_id": project_id},
        {"$set": {"status": "issued", "issued_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcontract not found")
    
    # Notify subcontractor
    subcontract = await db.subcontracts.find_one({"subcontract_id": subcontract_id}, {"_id": 0})
    subcontractor = await db.subcontractors.find_one({"subcontractor_id": subcontract["subcontractor_id"]}, {"_id": 0})
    if subcontractor:
        sub_user = await db.users.find_one({"email": subcontractor["email"]}, {"_id": 0})
        if sub_user:
            await create_notification(
                sub_user["user_id"],
                "Subcontract Issued",
                f"A subcontract has been issued for your review: {subcontract['title']}",
                "notice",
                subcontract_id
            )
    
    return {"message": "Subcontract issued"}

@api_router.post("/projects/{project_id}/subcontracts/{subcontract_id}/sign")
async def sign_subcontract(project_id: str, subcontract_id: str, user: User = Depends(get_current_user)):
    """Sign a subcontract (by subcontractor)."""
    subcontract = await db.subcontracts.find_one({"subcontract_id": subcontract_id}, {"_id": 0})
    if not subcontract:
        raise HTTPException(status_code=404, detail="Subcontract not found")
    if subcontract["status"] != "issued":
        raise HTTPException(status_code=400, detail="Subcontract must be issued before signing")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.subcontracts.update_one(
        {"subcontract_id": subcontract_id},
        {"$set": {"status": "signed", "signed_at": now, "signed_by": user.user_id, "updated_at": now}}
    )
    
    # Update subcontractor status to active
    await db.subcontractors.update_one(
        {"subcontractor_id": subcontract["subcontractor_id"]},
        {"$set": {"status": "active"}}
    )
    
    # Notify lawyers
    lawyers = await db.users.find({"role": {"$in": ["lawyer", "admin"]}}, {"_id": 0}).to_list(100)
    for lawyer in lawyers:
        await create_notification(
            lawyer["user_id"],
            "Subcontract Signed",
            f"Subcontract '{subcontract['title']}' has been signed by {user.name}",
            "notice",
            subcontract_id
        )
    
    return {"message": "Subcontract signed"}

# ============ CLAIM TEMPLATES ENDPOINTS ============

@api_router.get("/projects/{project_id}/templates", response_model=List[dict])
async def list_claim_templates(project_id: str, user: User = Depends(get_current_user)):
    """List claim templates for a project."""
    query = {"project_id": project_id}
    # Subcontractors only see templates available to them
    if user.role == "subcontractor":
        query["available_to_subcontractors"] = True
    templates = await db.claim_templates.find(query, {"_id": 0}).to_list(1000)
    return templates

@api_router.post("/projects/{project_id}/templates", response_model=dict)
async def create_claim_template(project_id: str, template_type: str, title: str, content: str, user: User = Depends(require_lawyer)):
    """Create a claim template."""
    template = ClaimTemplate(
        project_id=project_id,
        template_type=template_type,
        title=title,
        content=content,
        created_by=user.user_id
    )
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.claim_templates.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

# ============ NOTIFICATION ENDPOINTS ============

async def create_notification(user_id: str, title: str, message: str, notification_type: str, reference_id: str = None):
    """Helper to create a notification."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id
    )
    doc = notif.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)

@api_router.get("/notifications", response_model=List[dict])
async def list_notifications(user: User = Depends(get_current_user)):
    """List user's notifications."""
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark notification as read."""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read."""
    await db.notifications.update_many(
        {"user_id": user.user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All marked as read"}

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user), background_tasks: BackgroundTasks = None):
    """Get dashboard statistics."""
    # Run escalation check in background
    if background_tasks:
        background_tasks.add_task(check_and_send_escalations)
    
    if user.role in ["lawyer", "admin"]:
        total_projects = await db.projects.count_documents({})
        active_projects = await db.projects.count_documents({"status": "active"})
        pending_deadlines = await db.deadlines.count_documents({"status": "pending"})
        overdue_deadlines = await db.deadlines.count_documents({"status": "overdue"})
        draft_notices = await db.notices.count_documents({"status": "draft"})
        issued_notices = await db.notices.count_documents({"status": "issued"})
        pending_requests = await db.assistance_requests.count_documents({"status": "pending"})
    else:
        projects = await db.projects.find({"client_email": user.email}, {"project_id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["project_id"] for p in projects]
        total_projects = len(project_ids)
        active_projects = await db.projects.count_documents({"project_id": {"$in": project_ids}, "status": "active"})
        pending_deadlines = await db.deadlines.count_documents({"project_id": {"$in": project_ids}, "status": "pending"})
        overdue_deadlines = await db.deadlines.count_documents({"project_id": {"$in": project_ids}, "status": "overdue"})
        draft_notices = 0
        issued_notices = await db.notices.count_documents({"project_id": {"$in": project_ids}, "status": {"$ne": "draft"}})
        pending_requests = await db.assistance_requests.count_documents({"user_id": user.user_id, "status": "pending"})
    
    # Get upcoming deadlines
    now = datetime.now(timezone.utc).isoformat()
    upcoming_query = {"status": "pending", "due_date": {"$gte": now}}
    if user.role == "client":
        upcoming_query["project_id"] = {"$in": project_ids}
    upcoming_deadlines = await db.deadlines.find(upcoming_query, {"_id": 0}).sort("due_date", 1).to_list(5)
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "pending_deadlines": pending_deadlines,
        "overdue_deadlines": overdue_deadlines,
        "draft_notices": draft_notices,
        "issued_notices": issued_notices,
        "pending_requests": pending_requests,
        "upcoming_deadlines": upcoming_deadlines
    }

# ============ TRIGGER LIBRARY ENDPOINTS ============

@api_router.get("/triggers", response_model=List[dict])
async def list_triggers(user: User = Depends(get_current_user)):
    """List all trigger templates."""
    triggers = await db.trigger_templates.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return triggers

@api_router.post("/triggers", response_model=dict)
async def create_trigger(trigger_data: TriggerTemplateCreate, user: User = Depends(require_lawyer)):
    """Create a new trigger template (lawyers only)."""
    trigger = TriggerTemplate(**trigger_data.model_dump(), created_by=user.user_id)
    doc = trigger.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.trigger_templates.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/triggers/{trigger_id}", response_model=dict)
async def get_trigger(trigger_id: str, user: User = Depends(get_current_user)):
    """Get a specific trigger template."""
    trigger = await db.trigger_templates.find_one({"trigger_id": trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return trigger

@api_router.patch("/triggers/{trigger_id}")
async def update_trigger(trigger_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update a trigger template (lawyers only)."""
    trigger = await db.trigger_templates.find_one({"trigger_id": trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.get("is_system"):
        raise HTTPException(status_code=403, detail="Cannot modify system triggers")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.trigger_templates.update_one({"trigger_id": trigger_id}, {"$set": updates})
    return {"message": "Trigger updated"}

@api_router.delete("/triggers/{trigger_id}")
async def delete_trigger(trigger_id: str, user: User = Depends(require_lawyer)):
    """Soft delete a trigger template (lawyers only)."""
    trigger = await db.trigger_templates.find_one({"trigger_id": trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    if trigger.get("is_system"):
        raise HTTPException(status_code=403, detail="Cannot delete system triggers")
    
    await db.trigger_templates.update_one({"trigger_id": trigger_id}, {"$set": {"is_active": False}})
    return {"message": "Trigger deleted"}

# ============ PROJECT EVENTS ENDPOINTS ============

def calculate_event_status_color(event: dict, trigger: dict) -> str:
    """Calculate the status color for an event based on its trigger rules."""
    # If manually overridden, use that
    if event.get("manual_status_override"):
        return event["manual_status_override"]
    
    # If completed or dismissed, it's green
    if event.get("status") in ["completed", "dismissed"]:
        return "green"
    
    # Check if trigger causes red flag
    if not trigger.get("causes_red_flag", True):
        return "green"
    
    # Check if due date is required but missing
    if trigger.get("requires_due_date", True) and not event.get("due_date"):
        return "green"  # No due date, no urgency
    
    # Check if value is required but missing or below threshold
    if trigger.get("requires_value", False):
        event_value = event.get("value") or 0
        min_value = trigger.get("min_value_for_red", 0)
        if event_value < min_value:
            return "green"
    
    # Calculate based on due date
    if event.get("due_date"):
        try:
            due_date = datetime.fromisoformat(event["due_date"].replace('Z', '+00:00'))
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_until_due = (due_date - now).days
            
            days_to_red = trigger.get("days_to_red", 1)
            days_to_orange = trigger.get("days_to_orange", 7)
            
            if days_until_due < 0:  # Overdue
                return "red" if trigger.get("causes_red_flag", True) else "orange"
            elif days_until_due <= days_to_red:
                return "red"
            elif days_until_due <= days_to_orange:
                return "orange"
        except (ValueError, TypeError):
            pass
    
    return "green"

@api_router.get("/projects/{project_id}/events", response_model=List[dict])
async def list_project_events(project_id: str, user: User = Depends(get_current_user)):
    """List all events for a project with calculated status colors."""
    # Verify project access
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "client" and project.get("client_email") != user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    events = await db.project_events.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    # Get all triggers for color calculation
    trigger_ids = list(set(e.get("trigger_id") for e in events if e.get("trigger_id")))
    triggers = await db.trigger_templates.find({"trigger_id": {"$in": trigger_ids}}, {"_id": 0}).to_list(1000)
    trigger_map = {t["trigger_id"]: t for t in triggers}
    
    # Calculate status colors
    for event in events:
        trigger = trigger_map.get(event.get("trigger_id"), {})
        event["status_color"] = calculate_event_status_color(event, trigger)
        event["trigger_name"] = trigger.get("name", "Unknown")
        event["trigger_event_type"] = trigger.get("event_type", "general")
        event["trigger_importance"] = trigger.get("importance", "medium")
    
    return events

@api_router.post("/projects/{project_id}/events", response_model=dict)
async def create_project_event(project_id: str, event_data: ProjectEventCreate, user: User = Depends(require_lawyer)):
    """Create a new project event (lawyers only)."""
    # Verify project exists
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify trigger exists
    trigger = await db.trigger_templates.find_one({"trigger_id": event_data.trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    event = ProjectEvent(**event_data.model_dump(), created_by=user.user_id)
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Calculate initial status color
    doc['status_color'] = calculate_event_status_color(doc, trigger)
    
    await db.project_events.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/projects/{project_id}/events/{event_id}")
async def update_project_event(project_id: str, event_id: str, updates: dict, user: User = Depends(require_lawyer)):
    """Update a project event (lawyers only)."""
    event = await db.project_events.find_one({"event_id": event_id, "project_id": project_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If completing the event
    if updates.get("status") == "completed" and event.get("status") != "completed":
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        updates["completed_by"] = user.user_id
    
    # If setting manual override
    if "manual_status_override" in updates:
        updates["overridden_by"] = user.user_id
    
    await db.project_events.update_one({"event_id": event_id}, {"$set": updates})
    return {"message": "Event updated"}

@api_router.delete("/projects/{project_id}/events/{event_id}")
async def delete_project_event(project_id: str, event_id: str, user: User = Depends(require_lawyer)):
    """Delete a project event (lawyers only)."""
    result = await db.project_events.delete_one({"event_id": event_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ============ CLIENTS ENDPOINT ============

@api_router.get("/clients", response_model=List[dict])
async def list_clients(user: User = Depends(require_lawyer)):
    """List all clients with their project counts (lawyers only)."""
    # Aggregate clients from projects
    pipeline = [
        {"$group": {
            "_id": "$client_name",
            "client_email": {"$first": "$client_email"},
            "project_count": {"$sum": 1},
            "active_projects": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
            "total_value": {"$sum": "$current_value"}
        }},
        {"$project": {
            "_id": 0,
            "client_name": "$_id",
            "client_email": 1,
            "project_count": 1,
            "active_projects": 1,
            "total_value": 1
        }},
        {"$sort": {"client_name": 1}}
    ]
    
    clients = await db.projects.aggregate(pipeline).to_list(1000)
    
    # Get action items count per client
    for client in clients:
        # Get all projects for this client
        client_projects = await db.projects.find(
            {"client_name": client["client_name"]}, 
            {"project_id": 1, "_id": 0}
        ).to_list(1000)
        project_ids = [p["project_id"] for p in client_projects]
        
        # Count pending events (action items)
        action_items = await db.project_events.count_documents({
            "project_id": {"$in": project_ids},
            "status": {"$in": ["pending", "in_progress"]}
        })
        
        # Count overdue events
        overdue_items = await db.project_events.count_documents({
            "project_id": {"$in": project_ids},
            "status_color": "red"
        })
        
        client["action_items"] = action_items
        client["overdue_items"] = overdue_items
    
    return clients

# ============ PROJECT STATUS CALCULATION ============

@api_router.get("/projects/{project_id}/status")
async def get_project_status(project_id: str, user: User = Depends(get_current_user)):
    """Get calculated project status color based on events."""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if user.role == "client" and project.get("client_email") != user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all events for this project
    events = await db.project_events.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    # Get triggers for color calculation
    trigger_ids = list(set(e.get("trigger_id") for e in events if e.get("trigger_id")))
    triggers = await db.trigger_templates.find({"trigger_id": {"$in": trigger_ids}}, {"_id": 0}).to_list(1000)
    trigger_map = {t["trigger_id"]: t for t in triggers}
    
    # Calculate overall status
    has_red = False
    has_orange = False
    red_events = []
    orange_events = []
    
    for event in events:
        if event.get("status") in ["completed", "dismissed"]:
            continue
        trigger = trigger_map.get(event.get("trigger_id"), {})
        color = calculate_event_status_color(event, trigger)
        if color == "red":
            has_red = True
            red_events.append({"event_id": event["event_id"], "title": event["title"], "due_date": event.get("due_date")})
        elif color == "orange":
            has_orange = True
            orange_events.append({"event_id": event["event_id"], "title": event["title"], "due_date": event.get("due_date")})
    
    overall_status = "red" if has_red else ("orange" if has_orange else "green")
    
    # Find next due date
    next_due = None
    for event in sorted(events, key=lambda x: x.get("due_date") or "9999"):
        if event.get("due_date") and event.get("status") not in ["completed", "dismissed"]:
            next_due = event.get("due_date")
            break
    
    return {
        "project_id": project_id,
        "overall_status": overall_status,
        "red_events_count": len(red_events),
        "orange_events_count": len(orange_events),
        "red_events": red_events[:5],  # First 5 red events
        "orange_events": orange_events[:5],  # First 5 orange events
        "next_due_date": next_due,
        "total_pending_events": len([e for e in events if e.get("status") not in ["completed", "dismissed"]])
    }

# ============ SEED DEFAULT TRIGGERS ============

@api_router.post("/triggers/seed-defaults")
async def seed_default_triggers(user: User = Depends(require_lawyer)):
    """Seed the trigger library with default construction triggers."""
    default_triggers = [
        {
            "name": "Delay Notice Required",
            "event_type": "delay",
            "description": "Notice must be given for delay claim entitlement",
            "importance": "critical",
            "next_steps": "Prepare and issue delay notice to principal/contractor",
            "outcome": "Entitlement to extension of time and/or delay costs may be lost",
            "days_to_orange": 7,
            "days_to_red": 1,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Variation Claim Due",
            "event_type": "variation",
            "description": "Variation claim must be submitted",
            "importance": "critical",
            "next_steps": "Prepare and submit variation claim with supporting documentation",
            "outcome": "Entitlement to variation payment may be barred",
            "days_to_orange": 14,
            "days_to_red": 3,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": True,
            "min_value_for_red": 1000,
            "is_system": True
        },
        {
            "name": "Extension of Time Claim",
            "event_type": "extension_of_time",
            "description": "EOT claim must be submitted",
            "importance": "critical",
            "next_steps": "Prepare EOT claim with delay analysis",
            "outcome": "Liquidated damages may apply",
            "days_to_orange": 14,
            "days_to_red": 3,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Payment Claim Due",
            "event_type": "payment_claim",
            "description": "Progress payment claim submission deadline",
            "importance": "high",
            "next_steps": "Prepare and submit payment claim",
            "outcome": "Delayed payment for work completed",
            "days_to_orange": 7,
            "days_to_red": 2,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": True,
            "min_value_for_red": 5000,
            "is_system": True
        },
        {
            "name": "Defect Notice Response",
            "event_type": "defect",
            "description": "Response to defect notice required",
            "importance": "high",
            "next_steps": "Review defect notice and prepare response",
            "outcome": "May be deemed to accept defect allegation",
            "days_to_orange": 7,
            "days_to_red": 2,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Dispute Notice",
            "event_type": "dispute",
            "description": "Formal dispute notice required",
            "importance": "critical",
            "next_steps": "Prepare and issue dispute notice",
            "outcome": "Right to dispute may be waived",
            "days_to_orange": 14,
            "days_to_red": 3,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Internal Review",
            "event_type": "general",
            "description": "Internal document review or check",
            "importance": "low",
            "next_steps": "Complete internal review",
            "outcome": "Administrative task only",
            "days_to_orange": 7,
            "days_to_red": 1,
            "causes_red_flag": False,  # Does NOT cause red flag
            "requires_due_date": False,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Meeting/Site Visit",
            "event_type": "general",
            "description": "Scheduled meeting or site visit",
            "importance": "medium",
            "next_steps": "Attend meeting or site visit",
            "outcome": "N/A",
            "days_to_orange": 3,
            "days_to_red": 1,
            "causes_red_flag": False,  # Does NOT cause red flag
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        },
        {
            "name": "Latent Condition Notice",
            "event_type": "cost",
            "description": "Notice for latent condition claim",
            "importance": "critical",
            "next_steps": "Document latent condition and issue notice",
            "outcome": "Entitlement to additional costs may be lost",
            "days_to_orange": 5,
            "days_to_red": 1,
            "causes_red_flag": True,
            "requires_due_date": True,
            "requires_value": False,
            "is_system": True
        }
    ]
    
    created_count = 0
    for trigger_data in default_triggers:
        # Check if trigger already exists
        existing = await db.trigger_templates.find_one({"name": trigger_data["name"], "is_system": True})
        if not existing:
            trigger = TriggerTemplate(**trigger_data, created_by=user.user_id)
            doc = trigger.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.trigger_templates.insert_one(doc)
            created_count += 1
    
    return {"message": f"Created {created_count} default triggers", "total_defaults": len(default_triggers)}

# ============ API INTEGRATIONS INFO ============

@api_router.get("/integrations/available")
async def list_available_integrations():
    """List available API integrations."""
    return {
        "integrations": [
            {
                "id": "webhook",
                "name": "Webhooks",
                "description": "Send notifications to external systems via webhooks",
                "status": "available",
                "config_required": ["webhook_url"]
            },
            {
                "id": "email",
                "name": "Email Notifications",
                "description": "Send email notifications via SendGrid",
                "status": "ready",
                "config_required": ["sendgrid_api_key", "sender_email"]
            },
            {
                "id": "teams",
                "name": "Microsoft Teams",
                "description": "Post notifications to Teams channels",
                "status": "planned",
                "config_required": ["teams_webhook_url"]
            },
            {
                "id": "zoom",
                "name": "Zoom",
                "description": "Schedule and manage meetings",
                "status": "planned",
                "config_required": ["zoom_api_key", "zoom_api_secret"]
            },
            {
                "id": "calendar",
                "name": "Calendar Sync",
                "description": "Sync deadlines with Google/Outlook calendar",
                "status": "planned",
                "config_required": ["calendar_oauth"]
            }
        ]
    }

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Build Compliance Portal API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "build-compliance"}

# Include the router
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
