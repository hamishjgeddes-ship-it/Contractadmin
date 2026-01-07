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
    # Value tracking (Cost)
    starting_value: float = 0.0
    current_value: float = 0.0
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
    notice_type: str  # variation, delay, latent_condition, design_issue, contamination, general
    content: str
    status: str = "draft"  # draft, issued, responded, closed
    recipient_email: Optional[str] = None
    issued_at: Optional[datetime] = None
    response_deadline: Optional[datetime] = None
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
async def list_projects(user: User = Depends(get_current_user)):
    """List projects. Lawyers see all, clients see their own."""
    if user.role in ["lawyer", "admin"]:
        projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    else:
        projects = await db.projects.find({"client_email": user.email}, {"_id": 0}).to_list(1000)
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
    """Update notice (lawyers only)."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "issued_at" in updates and isinstance(updates["issued_at"], datetime):
        updates["issued_at"] = updates["issued_at"].isoformat()
    result = await db.notices.update_one({"notice_id": notice_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice updated"}

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
