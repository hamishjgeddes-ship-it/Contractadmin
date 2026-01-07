# Build Compliance - Contract Compliance Portal PRD

## Original Problem Statement
A simple, secure client portal for Build Compliance that gives construction clients clear visibility over their projects while the team operates the entire contract administration backend. The system standardizes contract admin, produces defensible outputs, and makes ongoing legal value visible to clients.

## User Personas

### Internal (Build Compliance Team)
- **Lawyers/Admins**: Full control over projects, workflows, notices, and outputs
- Role: `lawyer` or `admin`

### External (Clients)
- **Construction Clients**: Read-only (or near read-only) access
- Can view status, notices, deadlines, documents, and summaries
- Role: `client`

## Core Requirements
- Google OAuth authentication
- Role-based access control (lawyers vs clients)
- Project management with value and date tracking
- Deadline tracking with automated escalation
- Notice/document workflow
- Document library per project
- Digital questionnaires
- In-app notifications
- Request assistance functionality
- API integrations ready

## What's Been Implemented (January 2025)

### Backend (FastAPI)
- ✅ Authentication via Emergent Google OAuth
- ✅ User management with roles (admin, lawyer, client)
- ✅ Project CRUD with value/date tracking
- ✅ Deadline management with automated escalation (7/3/1 day reminders)
- ✅ Notice workflow with status tracking
- ✅ Questionnaire builder
- ✅ Document library with upload/download (max 10MB)
- ✅ Assistance request system
- ✅ In-app notification system
- ✅ API integrations info endpoint
- ✅ Dashboard statistics with overdue tracking

### Frontend (React)
- ✅ Login page with Build Compliance branding
- ✅ Asana-style dashboard with:
  - Project name, status
  - Starting & current value (with % change)
  - Starting & current completion dates
  - Outstanding items count
  - Progress bar
- ✅ Request Assistance button & dialog
- ✅ Document Library page with upload/download
- ✅ Integrations page showing available APIs
- ✅ Projects with value/date fields
- ✅ Deadlines with escalation status
- ✅ Notices creation and issuing
- ✅ Questionnaires builder
- ✅ User management (admin only)
- ✅ Quick Links sidebar

### Automated Escalation System
- 7-day reminder notification
- 3-day urgent reminder notification
- 1-day critical reminder notification
- Overdue → Escalation to all lawyers/admins
- Status tracking: `reminder_7_sent`, `reminder_3_sent`, `reminder_1_sent`, `escalated`

### Design System
- Theme: Swiss & High-Contrast ("Digital Blueprint")
- Colors: Slate 900, Safety Orange accent, White
- Typography: Manrope (headings), Inter (body), JetBrains Mono (data)
- Sharp corners, border-heavy, flat design

## API Endpoints

### Auth
- `POST /api/auth/session` - Exchange session_id for token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Projects
- `GET/POST /api/projects` - List/Create projects
- `GET/PATCH /api/projects/:id` - Get/Update project
- `GET /api/projects/:id/summary` - Get project summary with outstanding items

### Deadlines
- `GET/POST /api/deadlines` - List/Create deadlines
- `PATCH/DELETE /api/deadlines/:id` - Update/Delete deadline

### Notices
- `GET/POST /api/notices` - List/Create notices
- `PATCH /api/notices/:id` - Update notice
- `POST /api/notices/:id/issue` - Issue notice

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document (multipart)
- `GET /api/documents/:id` - Download document
- `DELETE /api/documents/:id` - Delete document

### Assistance
- `GET/POST /api/assistance-requests` - List/Create requests
- `PATCH /api/assistance-requests/:id` - Update request status

### Integrations
- `GET /api/integrations/available` - List available integrations

### Other
- `GET /api/questionnaires` - Questionnaire management
- `GET /api/notifications` - User notifications
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/PATCH /api/users` - User management

## Available Integrations (Ready for Config)
1. **Webhooks** - Send notifications to external systems
2. **Email (SendGrid)** - Ready for activation
3. **Microsoft Teams** - Planned
4. **Zoom** - Planned
5. **Calendar Sync** - Planned

## Prioritized Backlog

### P0 - Critical (Next)
- Activate SendGrid email integration
- Site meeting minute templates
- Communication integrations (Teams webhook)

### P1 - High Priority
- Calendar sync for deadlines
- Webhook configuration UI
- Advanced document categorization

### P2 - Medium Priority
- Report generation
- Advanced questionnaire logic
- Audit trail/activity log

## Technical Stack
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind CSS + Shadcn/UI
- Auth: Emergent Google OAuth
- Database: MongoDB (test_database)
- File Storage: MongoDB (base64, max 10MB)

## Next Tasks
1. Configure SendGrid for email notifications
2. Add Teams webhook integration
3. Build site meeting minute templates
4. Add calendar sync for Google/Outlook
