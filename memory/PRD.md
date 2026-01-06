# MLA Contract Compliance Portal - PRD

## Original Problem Statement
A simple, secure client portal for Morrissey Law + Advisory (MLA) that gives construction clients clear visibility over their projects while MLA operates the entire contract administration backend. The system standardizes how MLA runs contract admin, produces defensible outputs, and makes ongoing legal value visible to clients.

## User Personas

### Internal (MLA)
- **Lawyers/Admins**: Full control over projects, workflows, notices, and outputs
- Role: `lawyer` or `admin`

### External (Clients)
- **Construction Clients**: Read-only (or near read-only) access
- Can view status, notices, deadlines, and summaries
- Role: `client`

## Core Requirements
- Google OAuth authentication
- Role-based access control (lawyers vs clients)
- Project management with client association
- Deadline tracking with alerts
- Notice/document workflow (draft → issued → responded → closed)
- Digital questionnaires
- In-app notifications

## What's Been Implemented (January 2025)

### Backend (FastAPI)
- ✅ Authentication via Emergent Google OAuth
- ✅ User management with roles (admin, lawyer, client)
- ✅ Project CRUD with client association
- ✅ Deadline management with priorities
- ✅ Notice workflow with status tracking
- ✅ Questionnaire builder
- ✅ In-app notification system
- ✅ Dashboard statistics endpoint
- ✅ Role-based access control on all endpoints

### Frontend (React)
- ✅ Login page with Google OAuth
- ✅ Dashboard with KPIs and upcoming deadlines
- ✅ Projects list and detail pages
- ✅ Deadlines management page
- ✅ Notices creation and issuing
- ✅ Questionnaires builder
- ✅ User management (admin only)
- ✅ Role-based navigation
- ✅ Responsive design with modern SaaS aesthetic

### Design System
- Theme: Swiss & High-Contrast ("Digital Blueprint")
- Colors: Slate 900, Safety Orange accent, White
- Typography: Manrope (headings), Inter (body), JetBrains Mono (data)
- Sharp corners, border-heavy, flat design

## Prioritized Backlog

### P0 - Critical (Next)
- Email notifications for deadlines (SendGrid integration ready)
- Document upload/storage functionality

### P1 - High Priority
- Site meeting templates
- Communication integrations (Teams, Zoom)
- Automated deadline reminders

### P2 - Medium Priority
- Report generation from questionnaires
- Advanced questionnaire logic (conditional questions)
- Audit trail/activity log

### P3 - Lower Priority
- Mobile app optimization
- Client feedback/response on notices
- Dashboard customization

## Technical Stack
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind CSS + Shadcn/UI
- Auth: Emergent Google OAuth
- Database: MongoDB (test_database)

## API Endpoints
- `POST /api/auth/session` - Exchange session_id for token
- `GET /api/auth/me` - Get current user
- `GET/POST /api/projects` - Project management
- `GET/POST/PATCH/DELETE /api/deadlines` - Deadline management
- `GET/POST/PATCH /api/notices` - Notice management
- `POST /api/notices/{id}/issue` - Issue a notice
- `GET/POST/PATCH /api/questionnaires` - Questionnaire management
- `GET /api/notifications` - User notifications
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/PATCH /api/users` - User management

## Next Tasks
1. Integrate SendGrid for email notifications
2. Add document upload functionality
3. Implement site meeting minute templates
4. Add Teams/Zoom integration
