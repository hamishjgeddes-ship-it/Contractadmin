import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  ArrowLeft,
  FileText,
  CalendarClock,
  ClipboardList,
  Building2,
  Mail,
  CalendarIcon,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FolderOpen,
  Edit,
  HelpCircle,
  GanttChart,
  Archive,
  Send,
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ProjectEventsSection } from "../components/ProjectEventsSection";

export const ProjectDetailPage = ({ user }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [notices, setNotices] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const fetchData = async () => {
    try {
      const [projectRes, summaryRes, deadlinesRes, noticesRes, questionnairesRes, docsRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/summary`, { withCredentials: true }),
        axios.get(`${API}/deadlines?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/notices?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/questionnaires?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/documents?project_id=${projectId}`, { withCredentials: true }),
      ]);
      setProject(projectRes.data);
      setSummary(summaryRes.data);
      setDeadlines(deadlinesRes.data);
      setNotices(noticesRes.data);
      setQuestionnaires(questionnairesRes.data);
      setDocuments(docsRes.data);
      setEditForm(projectRes.data);
      // Pre-fill email form
      setEmailForm({
        subject: `Re: ${projectRes.data.name}`,
        body: `Dear ${projectRes.data.client_name},\n\n\n\nKind regards,\nMorrissey Law + Advisory`
      });
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleUpdateProject = async () => {
    try {
      await axios.patch(`${API}/projects/${projectId}`, editForm, { withCredentials: true });
      toast.success("Project updated");
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to update project");
    }
  };

  const handleArchiveProject = async () => {
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await axios.post(`${API}/projects/${projectId}/archive`, {}, { withCredentials: true });
      toast.success("Project archived");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to archive project");
    }
  };

  const handleSaveEmailDraft = async () => {
    try {
      await axios.post(`${API}/projects/${projectId}/emails`, {
        project_id: projectId,
        to_email: project.client_email,
        subject: emailForm.subject,
        body: emailForm.body,
      }, { withCredentials: true });
      toast.success("Email draft saved");
      setEmailDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save email draft");
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-AU', { 
      style: 'currency', 
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getValueChange = (starting, current) => {
    if (!starting || starting === 0) return 0;
    return ((current - starting) / starting * 100).toFixed(1);
  };

  const getCompletionProgress = () => {
    if (!project?.start_date || !project?.current_completion_date) return 0;
    const start = new Date(project.start_date);
    const end = new Date(project.current_completion_date);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  // Calendar helpers
  const getCalendarDays = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (day) => {
    const events = [];
    // Add notices with dates
    notices.forEach(notice => {
      if (notice.submitted_date && isSameDay(parseISO(notice.submitted_date), day)) {
        events.push({ type: 'submitted', notice, color: 'blue' });
      }
      if (notice.response_due_date && isSameDay(parseISO(notice.response_due_date), day)) {
        const isOverdue = new Date(notice.response_due_date) < new Date() && notice.status !== 'approved';
        events.push({ type: 'response_due', notice, color: isOverdue ? 'red' : 'orange' });
      }
    });
    // Add deadlines
    deadlines.forEach(deadline => {
      if (deadline.due_date && isSameDay(parseISO(deadline.due_date), day)) {
        const isOverdue = new Date(deadline.due_date) < new Date() && deadline.status !== 'completed';
        events.push({ type: 'deadline', deadline, color: isOverdue ? 'red' : 'amber' });
      }
    });
    return events;
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout user={user}>
        <div className="text-center py-12">
          <p className="text-slate-500">Project not found</p>
          <Link to="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const valueChange = getValueChange(project.starting_value, project.current_value);
  const progress = getCompletionProgress();

  return (
    <Layout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
                  {project.name}
                </h1>
                {project.archived && (
                  <Badge variant="outline" className="rounded-none bg-slate-100">Archived</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {project.client_name}
                </span>
                {project.contract_type && (
                  <Badge variant="outline" className="text-[10px] rounded-none">{project.contract_type}</Badge>
                )}
                {project.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {project.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Contact Client Button */}
            {isLawyer && (
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm">
                    <Mail className="w-4 h-4 mr-2" /> Contact Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Contact Client</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="bg-slate-50 p-3 rounded-sm">
                      <p className="text-xs text-slate-500 uppercase font-mono">To</p>
                      <p className="font-medium">{project.client_name} &lt;{project.client_email}&gt;</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        value={emailForm.body}
                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                        rows={8}
                        className="rounded-sm font-mono text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="rounded-sm">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEmailDraft} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                        <Send className="w-4 h-4 mr-2" /> Save Draft
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      Email will be saved as draft. Backend email sending not yet implemented.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Construction Program Button */}
            <Link to={`/projects/${projectId}/program`}>
              <Button variant="outline" className="rounded-sm">
                <GanttChart className="w-4 h-4 mr-2" /> Construction Program
              </Button>
            </Link>

            {/* Edit Button */}
            {isLawyer && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Edit Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contract Type</Label>
                        <Input
                          value={editForm.contract_type || ""}
                          onChange={(e) => setEditForm({ ...editForm, contract_type: e.target.value })}
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input
                          value={editForm.client_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Email</Label>
                        <Input
                          value={editForm.client_email || ""}
                          onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })}
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Starting Value ($)</Label>
                        <Input
                          type="number"
                          value={editForm.starting_value || ""}
                          onChange={(e) => setEditForm({ ...editForm, starting_value: parseFloat(e.target.value) || 0 })}
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Value ($)</Label>
                        <Input
                          type="number"
                          value={editForm.current_value || ""}
                          onChange={(e) => setEditForm({ ...editForm, current_value: parseFloat(e.target.value) || 0 })}
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={editForm.location || ""}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description || ""}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                        className="rounded-sm"
                      />
                    </div>
                    
                    {/* Archive Section */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-sm">
                        <div>
                          <p className="font-medium text-red-800">Archive Project</p>
                          <p className="text-xs text-red-600">Archived projects won't appear in the main list</p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleArchiveProject}
                          className="border-red-300 text-red-700 hover:bg-red-100 rounded-sm"
                        >
                          <Archive className="w-4 h-4 mr-2" /> Archive
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-sm">
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateProject} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Quick Stats - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => setActiveTab("deadlines")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Deadlines</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{deadlines.length}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-red-200 bg-red-50 shadow-none rounded-sm cursor-pointer hover:border-red-300 transition-colors"
            onClick={() => setActiveTab("deadlines")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">Overdue</p>
              <p className="text-2xl font-mono font-bold text-red-700 mt-1">
                {deadlines.filter(d => new Date(d.due_date) < new Date() && d.status !== 'completed').length}
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => setActiveTab("notices")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{notices.length}</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => setActiveTab("notices")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Claimed</p>
              <p className="text-lg font-mono font-bold text-slate-900 mt-1">{formatCurrency(project.total_claimed || 0)}</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-emerald-200 bg-emerald-50 shadow-none rounded-sm cursor-pointer hover:border-emerald-300 transition-colors"
            onClick={() => setActiveTab("notices")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono">Approved</p>
              <p className="text-lg font-mono font-bold text-emerald-700 mt-1">{formatCurrency(project.total_approved || 0)}</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => setActiveTab("documents")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Documents</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{documents.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Value & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-500">Contract Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-mono font-bold text-slate-900">{formatCurrency(project.current_value)}</p>
                  <p className="text-sm text-slate-500">Starting: {formatCurrency(project.starting_value)}</p>
                </div>
                {parseFloat(valueChange) !== 0 && (
                  <div className={`flex items-center gap-1 ${parseFloat(valueChange) > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {parseFloat(valueChange) > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-mono font-semibold">{parseFloat(valueChange) > 0 ? "+" : ""}{valueChange}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-500">Timeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2 mb-2" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {project.start_date ? format(parseISO(project.start_date), "dd MMM yyyy") : "Not set"}
                </span>
                <span className="font-mono font-semibold">{progress.toFixed(0)}%</span>
                <span className="text-slate-500">
                  {project.current_completion_date ? format(parseISO(project.current_completion_date), "dd MMM yyyy") : "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Project Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-32 text-center">
                  {format(calendarMonth, "MMMM yyyy")}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-mono text-slate-500 py-2">
                  {day}
                </div>
              ))}
              {/* Empty cells for days before start of month */}
              {Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 bg-slate-50 rounded-sm" />
              ))}
              {getCalendarDays().map(day => {
                const events = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`h-20 p-1 border rounded-sm ${isToday ? 'border-slate-900 bg-slate-50' : 'border-slate-100'}`}
                  >
                    <div className={`text-xs font-mono ${isToday ? 'font-bold' : 'text-slate-500'}`}>
                      {format(day, "d")}
                    </div>
                    <div className="mt-1 space-y-0.5 overflow-hidden">
                      {events.slice(0, 2).map((event, i) => (
                        <div 
                          key={i}
                          className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80
                            ${event.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                            ${event.color === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                            ${event.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                            ${event.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                          `}
                          title={event.notice?.title || event.deadline?.title}
                          onClick={() => setActiveTab(event.notice ? 'notices' : 'deadlines')}
                        >
                          {event.notice?.title || event.deadline?.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[9px] text-slate-500 px-1">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-100"></span> Submitted
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-100"></span> Response Due
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-100"></span> Deadline
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100"></span> Overdue
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {project.description && (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Events & Triggers Section */}
        <ProjectEventsSection projectId={projectId} user={user} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-sm">
            <TabsTrigger value="overview" className="rounded-sm data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="rounded-sm data-[state=active]:bg-white">
              <CalendarClock className="w-4 h-4 mr-2" /> Deadlines ({deadlines.length})
            </TabsTrigger>
            <TabsTrigger value="notices" className="rounded-sm data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" /> Notices ({notices.length})
            </TabsTrigger>
            <TabsTrigger value="questionnaires" className="rounded-sm data-[state=active]:bg-white">
              <ClipboardList className="w-4 h-4 mr-2" /> Questionnaires ({questionnaires.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-sm data-[state=active]:bg-white">
              <FolderOpen className="w-4 h-4 mr-2" /> Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Stakeholders */}
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Key Stakeholders
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Owner</span>
                      <span className="font-medium text-slate-900">{project.owner || "Not specified"}</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Builder</span>
                      <span className="font-medium text-slate-900">{project.builder || "Not specified"}</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Client Contact</span>
                      <span className="font-medium text-slate-900">{project.client_email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Dates */}
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Start Date</span>
                      <span className="font-mono font-medium text-slate-900">
                        {project.start_date ? format(parseISO(project.start_date), "dd MMM yyyy") : "Not set"}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Original Completion</span>
                      <span className="font-mono font-medium text-slate-900">
                        {project.original_completion_date ? format(parseISO(project.original_completion_date), "dd MMM yyyy") : "Not set"}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-500">Current Completion</span>
                      <span className="font-mono font-medium text-slate-900">
                        {project.current_completion_date ? format(parseISO(project.current_completion_date), "dd MMM yyyy") : "Not set"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Deadlines</CardTitle>
                  <Link to="/deadlines">
                    <Button variant="outline" size="sm" className="rounded-sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {deadlines.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No deadlines set for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deadlines.map((deadline) => {
                      const isOverdue = new Date(deadline.due_date) < new Date() && deadline.status !== 'completed';
                      return (
                        <div key={deadline.deadline_id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <div>
                              <p className="font-medium text-slate-900">{deadline.title}</p>
                              <p className="text-xs text-slate-500">{deadline.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`rounded-none font-mono ${isOverdue ? 'border-red-200 text-red-700 bg-red-50' : ''}`}>
                            {format(parseISO(deadline.due_date), "dd MMM yyyy")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notices Tab */}
          <TabsContent value="notices">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Notices & Claims</CardTitle>
                  <Link to="/notices">
                    <Button variant="outline" size="sm" className="rounded-sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {notices.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No notices for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notices.map((notice) => (
                      <div key={notice.notice_id} className="px-4 py-3 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{notice.title}</p>
                              {notice.edited_at && (
                                <Badge variant="outline" className="text-[10px] rounded-none bg-amber-50 text-amber-700 border-amber-200">
                                  <Pencil className="w-3 h-3 mr-1" /> Edited
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none">
                                {notice.notice_type}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] uppercase font-mono rounded-none
                                  ${notice.status === 'draft' ? 'bg-slate-50' : ''}
                                  ${notice.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                  ${notice.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                `}
                              >
                                {notice.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            {notice.claimed_amount > 0 && (
                              <p className="text-sm font-mono">
                                Claimed: {formatCurrency(notice.claimed_amount)}
                              </p>
                            )}
                            {notice.approved_amount > 0 && (
                              <p className="text-sm font-mono text-emerald-600">
                                Approved: {formatCurrency(notice.approved_amount)}
                              </p>
                            )}
                            {notice.response_due_date && (
                              <p className="text-xs text-slate-500 mt-1">
                                Response due: {format(parseISO(notice.response_due_date), "dd MMM")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questionnaires Tab */}
          <TabsContent value="questionnaires">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Questionnaires</CardTitle>
                  <Link to="/questionnaires">
                    <Button variant="outline" size="sm" className="rounded-sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {questionnaires.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No questionnaires for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {questionnaires.map((q) => (
                      <div key={q.questionnaire_id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{q.title}</p>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none mt-1">
                            {q.category}
                          </Badge>
                        </div>
                        <Badge variant="outline" className={`rounded-none ${q.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                          {q.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Documents</CardTitle>
                  <Link to="/documents">
                    <Button variant="outline" size="sm" className="rounded-sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No documents uploaded for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <div key={doc.document_id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">{doc.filename}</p>
                            <p className="text-xs text-slate-500">{doc.category}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {format(parseISO(doc.created_at), "dd MMM yyyy")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetailPage;
