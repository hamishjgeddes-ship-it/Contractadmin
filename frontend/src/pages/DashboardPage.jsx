import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  ArrowRight,
  CalendarClock,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  FolderOpen,
  Clock,
  CheckCircle2
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, isBefore, addDays } from "date-fns";

export const DashboardPage = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assistanceDialogOpen, setAssistanceDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [assistanceForm, setAssistanceForm] = useState({
    subject: "",
    message: "",
    priority: "normal"
  });

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, projectsRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
          axios.get(`${API}/projects`, { withCredentials: true })
        ]);
        setStats(statsRes.data);
        setProjects(projectsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRequestAssistance = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    try {
      await axios.post(`${API}/assistance-requests`, {
        project_id: selectedProject,
        ...assistanceForm
      }, { withCredentials: true });
      toast.success("Assistance request submitted");
      setAssistanceDialogOpen(false);
      setAssistanceForm({ subject: "", message: "", priority: "normal" });
      setSelectedProject("");
    } catch (error) {
      toast.error("Failed to submit request");
    }
  };

  const getValueChange = (starting, current) => {
    if (!starting || starting === 0) return 0;
    return ((current - starting) / starting * 100).toFixed(1);
  };

  const getCompletionProgress = (project) => {
    if (!project.start_date || !project.current_completion_date) return 0;
    const start = new Date(project.start_date);
    const end = new Date(project.current_completion_date);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDeadlineUrgency = (dueDate) => {
    const due = parseISO(dueDate);
    const now = new Date();
    if (isBefore(due, now)) return "overdue";
    if (isBefore(due, addDays(now, 3))) return "urgent";
    if (isBefore(due, addDays(now, 7))) return "soon";
    return "normal";
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

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-8" data-testid="dashboard">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              {isLawyer ? "Operations Dashboard" : "My Projects"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isLawyer 
                ? "Contract administration overview" 
                : "Your project status and documents"
              }
            </p>
          </div>

          {/* Request Assistance Button */}
          <Dialog open={assistanceDialogOpen} onOpenChange={setAssistanceDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                data-testid="request-assistance-btn"
              >
                <HelpCircle className="w-4 h-4 mr-2" /> Request Assistance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Request Assistance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRequestAssistance} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger data-testid="assistance-project-select" className="rounded-sm">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.project_id} value={p.project_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    data-testid="assistance-subject-input"
                    value={assistanceForm.subject}
                    onChange={(e) => setAssistanceForm({ ...assistanceForm, subject: e.target.value })}
                    placeholder="Brief description of your request"
                    required
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    data-testid="assistance-message-input"
                    value={assistanceForm.message}
                    onChange={(e) => setAssistanceForm({ ...assistanceForm, message: e.target.value })}
                    placeholder="Provide details about the assistance you need..."
                    rows={4}
                    required
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={assistanceForm.priority} 
                    onValueChange={(v) => setAssistanceForm({ ...assistanceForm, priority: v })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setAssistanceDialogOpen(false)} className="rounded-sm">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600 rounded-sm" data-testid="submit-assistance-btn">
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Active Projects</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.active_projects || 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Pending Deadlines</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.pending_deadlines || 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500 font-mono">Overdue</p>
              <p className="text-2xl font-mono font-bold text-red-600 mt-1">{stats?.overdue_deadlines || 0}</p>
            </CardContent>
          </Card>
          {isLawyer && (
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardContent className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Draft Notices</p>
                <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.draft_notices || 0}</p>
              </CardContent>
            </Card>
          )}
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Issued Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.issued_notices || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects List - Asana Style */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Your Projects</h2>
            <Link to="/projects">
              <Button variant="ghost" size="sm" className="text-xs" data-testid="view-all-projects">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No projects yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => {
                const valueChange = getValueChange(project.starting_value, project.current_value);
                const progress = getCompletionProgress(project);
                return (
                  <Link key={project.project_id} to={`/projects/${project.project_id}`} data-testid={`project-row-${project.project_id}`}>
                    <Card className="border border-slate-200 shadow-none rounded-sm hover:border-slate-300 transition-colors">
                      <CardContent className="p-0">
                        <div className="grid grid-cols-12 gap-4 p-4 items-center">
                          {/* Project Name & Status */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={`
                                  text-[10px] uppercase tracking-wider font-mono rounded-none shrink-0
                                  ${project.status === "active" ? "status-active" : ""}
                                  ${project.status === "completed" ? "status-completed" : ""}
                                  ${project.status === "on_hold" ? "status-pending" : ""}
                                `}
                              >
                                {project.status}
                              </Badge>
                              <div>
                                <p className="font-medium text-slate-900 line-clamp-1">{project.name}</p>
                                <p className="text-xs text-slate-500">{project.client_name}</p>
                              </div>
                            </div>
                          </div>

                          {/* Value */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-1">Value</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-900">
                                {formatCurrency(project.current_value)}
                              </span>
                              {valueChange !== 0 && (
                                <span className={`text-xs flex items-center ${parseFloat(valueChange) > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {parseFloat(valueChange) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(valueChange)}%
                                </span>
                              )}
                            </div>
                            {project.starting_value > 0 && (
                              <p className="text-[10px] text-slate-400">from {formatCurrency(project.starting_value)}</p>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-1">Completion</p>
                            {project.current_completion_date ? (
                              <>
                                <span className="font-mono text-sm text-slate-900">
                                  {format(parseISO(project.current_completion_date), "dd MMM yyyy")}
                                </span>
                                {project.original_completion_date && project.original_completion_date !== project.current_completion_date && (
                                  <p className="text-[10px] text-slate-400 line-through">
                                    {format(parseISO(project.original_completion_date), "dd MMM yyyy")}
                                  </p>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">Not set</span>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-1">Progress</p>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-1.5 flex-1" />
                              <span className="text-xs font-mono text-slate-600">{Math.round(progress)}%</span>
                            </div>
                          </div>

                          {/* Outstanding */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-1">Outstanding</p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs">
                                <CalendarClock className="w-3 h-3 text-amber-500" />
                                <span className="text-slate-600">{stats?.pending_deadlines || 0}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <FileText className="w-3 h-3 text-blue-500" />
                                <span className="text-slate-600">{stats?.draft_notices || 0}</span>
                              </div>
                              {stats?.overdue_deadlines > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span className="text-red-600">{stats?.overdue_deadlines}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="col-span-1 flex justify-end">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Deadlines */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-heading font-semibold">Upcoming Deadlines</h3>
                <Link to="/deadlines">
                  <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                </Link>
              </div>
              <div className="p-0">
                {stats?.upcoming_deadlines?.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No upcoming deadlines
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {stats?.upcoming_deadlines?.map((deadline) => {
                      const urgency = getDeadlineUrgency(deadline.due_date);
                      return (
                        <div key={deadline.deadline_id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-2 h-2 rounded-full
                              ${urgency === "overdue" ? "bg-red-500" : ""}
                              ${urgency === "urgent" ? "bg-orange-500" : ""}
                              ${urgency === "soon" ? "bg-amber-500" : ""}
                              ${urgency === "normal" ? "bg-slate-300" : ""}
                            `} />
                            <div>
                              <p className="font-medium text-sm text-slate-900">{deadline.title}</p>
                              <p className="text-xs text-slate-500">{deadline.project_id}</p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`
                              text-[10px] uppercase tracking-wider font-mono rounded-none
                              ${urgency === "overdue" ? "border-red-200 text-red-700 bg-red-50" : ""}
                              ${urgency === "urgent" ? "border-orange-200 text-orange-700 bg-orange-50" : ""}
                              ${urgency === "soon" ? "border-amber-200 text-amber-700 bg-amber-50" : ""}
                              ${urgency === "normal" ? "border-slate-200 text-slate-600" : ""}
                            `}
                          >
                            {format(parseISO(deadline.due_date), "dd MMM")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-heading font-semibold">Quick Links</h3>
              </div>
              <div className="p-2">
                <Link to="/documents" className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm">
                  <FolderOpen className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm text-slate-900">Document Library</p>
                    <p className="text-xs text-slate-500">Access your project files</p>
                  </div>
                </Link>
                <Link to="/notices" className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm text-slate-900">Notices</p>
                    <p className="text-xs text-slate-500">View issued notices</p>
                  </div>
                </Link>
                <Link to="/deadlines" className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm text-slate-900">Deadlines</p>
                    <p className="text-xs text-slate-500">Track key dates</p>
                  </div>
                </Link>
              </div>
            </Card>

            {/* Escalation Status */}
            {stats?.overdue_deadlines > 0 && (
              <Card className="border border-red-200 bg-red-50 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-sm text-red-800">
                        {stats.overdue_deadlines} Overdue Deadline{stats.overdue_deadlines > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-red-600">Escalation notifications sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
