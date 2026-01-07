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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  CalendarClock,
  ClipboardList,
  Building2,
  Mail,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FolderOpen,
  Edit,
  HelpCircle,
  GanttChart,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

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

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  useEffect(() => {
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
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleUpdateProject = async () => {
    try {
      await axios.patch(`${API}/projects/${projectId}`, editForm, { withCredentials: true });
      toast.success("Project updated");
      setEditDialogOpen(false);
      // Refresh
      const res = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(res.data);
    } catch (error) {
      toast.error("Failed to update project");
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
          <h2 className="font-heading text-xl font-semibold text-slate-900">Project not found</h2>
          <Link to="/projects" className="text-orange-500 hover:underline mt-2 inline-block">
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  const valueChange = getValueChange(project.starting_value, project.current_value);
  const progress = getCompletionProgress();
  const outstanding = summary?.outstanding || {};

  return (
    <Layout user={user}>
      <div className="space-y-6" data-testid="project-detail">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
            </Link>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge
                variant="outline"
                className={`
                  text-[10px] uppercase tracking-wider font-mono rounded-none
                  ${project.status === "active" ? "status-active" : ""}
                  ${project.status === "completed" ? "status-completed" : ""}
                  ${project.status === "on_hold" ? "status-pending" : ""}
                `}
              >
                {project.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono rounded-none">
                {project.contract_type}
              </Badge>
              {project.location && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {project.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Program Button */}
            <Link to={`/projects/${projectId}/program`}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-sm" data-testid="view-program-btn">
                <GanttChart className="w-4 h-4 mr-2" /> Construction Program
              </Button>
            </Link>

            {isLawyer && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm" data-testid="edit-project-btn">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Edit Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Current Value ($)</Label>
                        <Input
                          type="number"
                          value={editForm.current_value || ""}
                          onChange={(e) => setEditForm({ ...editForm, current_value: parseFloat(e.target.value) || 0 })}
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                          value={editForm.status || "active"}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full h-10 border border-slate-200 rounded-sm px-3"
                        >
                          <option value="active">Active</option>
                          <option value="on_hold">On Hold</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Current Completion Date</Label>
                      <Input
                        type="date"
                        value={editForm.current_completion_date || ""}
                        onChange={(e) => setEditForm({ ...editForm, current_completion_date: e.target.value })}
                        className="rounded-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-sm">Cancel</Button>
                      <Button onClick={handleUpdateProject} className="bg-slate-900 hover:bg-slate-800 rounded-sm">Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Project Stats - Mirrors Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300"
            onClick={() => document.getElementById('deadlines-tab')?.click()}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Pending Deadlines</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{outstanding.pending_deadlines || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`border shadow-none rounded-sm cursor-pointer hover:border-slate-300 ${outstanding.overdue_deadlines > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
            onClick={() => document.getElementById('deadlines-tab')?.click()}
          >
            <CardContent className="p-4">
              <p className={`text-xs font-bold uppercase tracking-wider font-mono ${outstanding.overdue_deadlines > 0 ? 'text-red-500' : 'text-slate-500'}`}>Overdue</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${outstanding.overdue_deadlines > 0 ? 'text-red-600' : 'text-slate-900'}`}>{outstanding.overdue_deadlines || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300"
            onClick={() => document.getElementById('notices-tab')?.click()}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Draft Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{outstanding.draft_notices || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300"
            onClick={() => document.getElementById('notices-tab')?.click()}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Issued Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{outstanding.issued_notices || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300"
            onClick={() => document.getElementById('questionnaires-tab')?.click()}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Questionnaires</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{outstanding.active_questionnaires || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Value & Time Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cost Card */}
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Contract Value</p>
                {valueChange !== 0 && (
                  <span className={`text-sm flex items-center gap-1 ${parseFloat(valueChange) > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {parseFloat(valueChange) > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(valueChange)}% from original
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-3xl font-mono font-bold text-slate-900">{formatCurrency(project.current_value)}</p>
                  <p className="text-sm text-slate-500">Current Value</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono text-slate-400">{formatCurrency(project.starting_value)}</p>
                  <p className="text-xs text-slate-400">Starting Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Card */}
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Timeline</p>
                <span className="text-sm font-mono text-slate-600">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2 mb-4" />
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-mono text-slate-900">{project.start_date ? format(parseISO(project.start_date), "dd MMM yyyy") : "Not set"}</p>
                  <p className="text-xs text-slate-500">Start Date</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-slate-900">{project.current_completion_date ? format(parseISO(project.current_completion_date), "dd MMM yyyy") : "Not set"}</p>
                  <p className="text-xs text-slate-500">Completion Date</p>
                  {project.original_completion_date && project.original_completion_date !== project.current_completion_date && (
                    <p className="text-[10px] text-slate-400 line-through">
                      {format(parseISO(project.original_completion_date), "dd MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Owner</p>
                  <p className="font-medium text-slate-900">{project.owner || project.client_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Builder</p>
                  <p className="font-medium text-slate-900">{project.builder || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Client Email</p>
                  <p className="font-medium text-slate-900 text-sm truncate">{project.client_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Documents</p>
                  <p className="font-medium text-slate-900">{documents.length} files</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        {(project.client_team_members || project.bc_team_members || project.subcontractors) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {project.client_team_members && (
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">Client Team</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{project.client_team_members}</p>
                </CardContent>
              </Card>
            )}
            {project.bc_team_members && (
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">Build Compliance Team</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{project.bc_team_members}</p>
                </CardContent>
              </Card>
            )}
            {project.subcontractors && (
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">Subcontractors</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{project.subcontractors}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Description */}
        {project.description && (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="deadlines" className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-sm">
            <TabsTrigger id="deadlines-tab" value="deadlines" className="rounded-sm data-[state=active]:bg-white">
              <CalendarClock className="w-4 h-4 mr-2" /> Deadlines ({deadlines.length})
            </TabsTrigger>
            <TabsTrigger id="notices-tab" value="notices" className="rounded-sm data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" /> Notices ({notices.length})
            </TabsTrigger>
            <TabsTrigger id="questionnaires-tab" value="questionnaires" className="rounded-sm data-[state=active]:bg-white">
              <ClipboardList className="w-4 h-4 mr-2" /> Questionnaires ({questionnaires.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-sm data-[state=active]:bg-white">
              <FolderOpen className="w-4 h-4 mr-2" /> Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deadlines">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Project Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {deadlines.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No deadlines set for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deadlines.map((deadline) => (
                      <div
                        key={deadline.deadline_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-deadline-${deadline.deadline_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${deadline.status === 'overdue' ? 'bg-red-500' : deadline.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="font-medium text-slate-900">{deadline.title}</p>
                            {deadline.description && (
                              <p className="text-sm text-slate-500 mt-0.5">{deadline.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`priority-${deadline.priority} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                          >
                            {deadline.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider font-mono rounded-none"
                          >
                            {format(parseISO(deadline.due_date), "dd MMM yyyy")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notices">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Project Notices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notices.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No notices for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notices.map((notice) => (
                      <div
                        key={notice.notice_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-notice-${notice.notice_id}`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{notice.title}</p>
                          <p className="text-sm text-slate-500 mt-0.5 capitalize">
                            {notice.notice_type.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-${notice.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                        >
                          {notice.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questionnaires">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">
                  Project Questionnaires
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {questionnaires.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No questionnaires for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {questionnaires.map((qst) => (
                      <div
                        key={qst.questionnaire_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-questionnaire-${qst.questionnaire_id}`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{qst.title}</p>
                          <p className="text-sm text-slate-500 mt-0.5 capitalize">
                            {qst.category.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-${qst.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                        >
                          {qst.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg font-semibold">
                  Document Library
                </CardTitle>
                <Link to="/documents">
                  <Button variant="outline" size="sm" className="rounded-sm">Manage Documents</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No documents uploaded for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="px-6 py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{doc.filename}</p>
                          <p className="text-sm text-slate-500 mt-0.5 capitalize">{doc.category}</p>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
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
