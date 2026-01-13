import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
  Plus,
  CalendarIcon,
  FolderKanban,
  Users,
  Building2,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Zap,
  Archive,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, isBefore, addDays } from "date-fns";

export const DashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assistanceDialogOpen, setAssistanceDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [creating, setCreating] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [originalCompletionDate, setOriginalCompletionDate] = useState(null);
  
  // View controls
  const [viewMode, setViewMode] = useState("list"); // "list" or "cards"
  const [sortBy, setSortBy] = useState("status"); // "status", "client", "due_date", "name"
  const [filterClient, setFilterClient] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState([]);
  
  // Selected triggers for new project
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  
  const [assistanceForm, setAssistanceForm] = useState({
    subject: "",
    message: "",
    priority: "normal"
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    client_name: "",
    client_email: "",
    contract_type: "",
    description: "",
    starting_value: "",
    current_value: "",
    location: "",
    owner: "",
    builder: "",
    subcontractors: "",
    client_team_members: "",
    bc_team_members: "",
  });

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const fetchData = async () => {
    try {
      const requests = [
        axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
        axios.get(`${API}/projects/with-status`, { withCredentials: true })
      ];
      
      if (isLawyer) {
        requests.push(axios.get(`${API}/clients`, { withCredentials: true }));
        requests.push(axios.get(`${API}/triggers`, { withCredentials: true }));
        requests.push(axios.get(`${API}/projects/archived`, { withCredentials: true }));
      }
      
      const results = await Promise.all(requests);
      setStats(results[0].data);
      setProjects(results[1].data);
      if (isLawyer && results[2]) {
        setClients(results[2].data);
      }
      if (isLawyer && results[3]) {
        setTriggers(results[3].data);
        // Pre-select all triggers by default
        setSelectedTriggers(results[3].data.map(t => t.trigger_id));
      }
      if (isLawyer && results[4]) {
        setArchivedProjects(results[4].data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: projectForm.name,
        client_name: projectForm.client_name,
        client_email: projectForm.client_email,
        contract_type: projectForm.contract_type,
        description: projectForm.description,
        starting_value: parseFloat(projectForm.starting_value) || 0,
        current_value: parseFloat(projectForm.current_value) || parseFloat(projectForm.starting_value) || 0,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        original_completion_date: originalCompletionDate ? format(originalCompletionDate, "yyyy-MM-dd") : null,
        current_completion_date: originalCompletionDate ? format(originalCompletionDate, "yyyy-MM-dd") : null,
        location: projectForm.location,
        owner: projectForm.owner,
        builder: projectForm.builder,
        subcontractors: projectForm.subcontractors,
        client_team_members: projectForm.client_team_members,
        bc_team_members: projectForm.bc_team_members,
      };
      
      // Create the project
      const projectRes = await axios.post(`${API}/projects`, payload, { withCredentials: true });
      const newProjectId = projectRes.data.project_id;
      
      // Create events from selected triggers
      if (selectedTriggers.length > 0 && newProjectId) {
        const eventPromises = selectedTriggers.map(triggerId => {
          const trigger = triggers.find(t => t.trigger_id === triggerId);
          if (!trigger) return Promise.resolve();
          
          return axios.post(`${API}/projects/${newProjectId}/events`, {
            project_id: newProjectId,
            trigger_id: triggerId,
            title: trigger.name,
            description: trigger.description || null,
            due_date: null, // Lawyer will set specific due dates later
            value: null,
            notes: trigger.next_steps || null,
          }, { withCredentials: true }).catch(err => {
            console.error(`Failed to create event for trigger ${trigger.name}:`, err);
          });
        });
        
        await Promise.all(eventPromises);
        toast.success(`Project created with ${selectedTriggers.length} trigger events`);
      } else {
        toast.success("Project created successfully");
      }
      
      setProjectDialogOpen(false);
      setProjectForm({
        name: "", client_name: "", client_email: "", contract_type: "", description: "",
        starting_value: "", current_value: "", location: "", owner: "", builder: "",
        subcontractors: "", client_team_members: "", bc_team_members: "",
      });
      setStartDate(null);
      setOriginalCompletionDate(null);
      // Reset selected triggers to all
      setSelectedTriggers(triggers.map(t => t.trigger_id));
      fetchData();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
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

  const contractTypes = ["AS4000", "AS4902", "AS2124", "NEC4", "FIDIC", "JCT", "Custom"];

  // Sort and filter projects
  const getFilteredProjects = () => {
    let filtered = showArchived ? [...archivedProjects] : [...projects];
    
    // Filter by client
    if (filterClient !== "all") {
      filtered = filtered.filter(p => p.client_name === filterClient);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "status":
          const statusOrder = { red: 0, orange: 1, green: 2 };
          return (statusOrder[a.status_color] || 2) - (statusOrder[b.status_color] || 2);
        case "client":
          return (a.client_name || "").localeCompare(b.client_name || "");
        case "due_date":
          if (!a.next_due_date && !b.next_due_date) return 0;
          if (!a.next_due_date) return 1;
          if (!b.next_due_date) return -1;
          return a.next_due_date.localeCompare(b.next_due_date);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getStatusColorClasses = (color) => {
    switch (color) {
      case "red":
        return "bg-red-500 border-red-500";
      case "orange":
        return "bg-orange-500 border-orange-500";
      case "green":
      default:
        return "bg-emerald-500 border-emerald-500";
    }
  };

  const getStatusBadgeClasses = (color) => {
    switch (color) {
      case "red":
        return "border-red-200 text-red-700 bg-red-50";
      case "orange":
        return "border-orange-200 text-orange-700 bg-orange-50";
      case "green":
      default:
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
    }
  };

  const getStatusLabel = (color) => {
    switch (color) {
      case "red":
        return "Action Overdue";
      case "orange":
        return "Action Needed";
      case "green":
      default:
        return "On Track";
    }
  };

  const getStatusIcon = (color) => {
    switch (color) {
      case "red":
        return <AlertTriangle className="w-4 h-4" />;
      case "orange":
        return <AlertCircle className="w-4 h-4" />;
      case "green":
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  // Get unique client names for filter
  const uniqueClients = [...new Set(projects.map(p => p.client_name))].filter(Boolean).sort();

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
      <div className="space-y-6" data-testid="dashboard">
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

          <div className="flex items-center gap-3">
            {/* Add New Project Button */}
            {isLawyer && (
              <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                    data-testid="add-new-project-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Create New Project</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name *</Label>
                      <Input
                        id="name"
                        data-testid="new-project-name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        placeholder="e.g., Melbourne Tower Development"
                        required
                        className="rounded-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contract Type *</Label>
                        <Select
                          value={projectForm.contract_type || undefined}
                          onValueChange={(v) => setProjectForm({ ...projectForm, contract_type: v })}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {contractTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={projectForm.location}
                          onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                          placeholder="Project location"
                          className="rounded-sm"
                        />
                      </div>
                    </div>

                    {/* Time - Dates */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">Time</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Completion Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {originalCompletionDate ? format(originalCompletionDate, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={originalCompletionDate} onSelect={setOriginalCompletionDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Cost - Values */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">Cost</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Starting Value ($)</Label>
                          <Input
                            type="number"
                            value={projectForm.starting_value}
                            onChange={(e) => setProjectForm({ ...projectForm, starting_value: e.target.value })}
                            placeholder="0"
                            className="rounded-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Current Value ($)</Label>
                          <Input
                            type="number"
                            value={projectForm.current_value}
                            onChange={(e) => setProjectForm({ ...projectForm, current_value: e.target.value })}
                            placeholder="0"
                            className="rounded-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">Client</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Client Name *</Label>
                          <Input
                            value={projectForm.client_name}
                            onChange={(e) => setProjectForm({ ...projectForm, client_name: e.target.value })}
                            placeholder="Client/Company name"
                            required
                            className="rounded-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Client Email *</Label>
                          <Input
                            type="email"
                            value={projectForm.client_email}
                            onChange={(e) => setProjectForm({ ...projectForm, client_email: e.target.value })}
                            placeholder="client@example.com"
                            required
                            className="rounded-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stakeholders */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">Stakeholders</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Owner</Label>
                          <Input
                            value={projectForm.owner}
                            onChange={(e) => setProjectForm({ ...projectForm, owner: e.target.value })}
                            placeholder="Property owner"
                            className="rounded-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Builder</Label>
                          <Input
                            value={projectForm.builder}
                            onChange={(e) => setProjectForm({ ...projectForm, builder: e.target.value })}
                            placeholder="Builder/Contractor"
                            className="rounded-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        placeholder="Brief project description..."
                        rows={2}
                        className="rounded-sm"
                      />
                    </div>

                    {/* Trigger Templates */}
                    {triggers.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                              Trigger Templates
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Select triggers to track for this project
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTriggers(triggers.map(t => t.trigger_id))}
                              className="text-xs h-7"
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTriggers([])}
                              className="text-xs h-7"
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        <div className="border rounded-sm max-h-48 overflow-y-auto">
                          {triggers.map((trigger) => {
                            const isSelected = selectedTriggers.includes(trigger.trigger_id);
                            return (
                              <div
                                key={trigger.trigger_id}
                                className={`flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-slate-50' : ''}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedTriggers(selectedTriggers.filter(id => id !== trigger.trigger_id));
                                  } else {
                                    setSelectedTriggers([...selectedTriggers, trigger.trigger_id]);
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTriggers([...selectedTriggers, trigger.trigger_id]);
                                    } else {
                                      setSelectedTriggers(selectedTriggers.filter(id => id !== trigger.trigger_id));
                                    }
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-slate-900">{trigger.name}</p>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none">
                                      {trigger.event_type}
                                    </Badge>
                                    {trigger.causes_red_flag && (
                                      <span className="w-2 h-2 rounded-full bg-red-500" title="Can trigger red status" />
                                    )}
                                  </div>
                                  {trigger.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{trigger.description}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          <Zap className="w-3 h-3 inline mr-1" />
                          {selectedTriggers.length} trigger{selectedTriggers.length !== 1 ? 's' : ''} will be added as events. You can set due dates and customize each event after project creation.
                        </p>
                      </div>
                    )}

                    {triggers.length === 0 && (
                      <div className="border-t pt-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-sm p-3">
                          <p className="text-sm text-amber-800">
                            <AlertTriangle className="w-4 h-4 inline mr-2" />
                            No trigger templates configured. Visit the{' '}
                            <Link to="/triggers" className="underline font-medium">Trigger Library</Link>
                            {' '}to set up event triggers first.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)} className="rounded-sm">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                        {creating ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

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
                    <Select value={selectedProject || undefined} onValueChange={setSelectedProject}>
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
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => navigate("/projects")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Active Projects</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.active_projects || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => navigate("/deadlines")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Pending Deadlines</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.pending_deadlines || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-red-200 bg-red-50 shadow-none rounded-sm cursor-pointer hover:border-red-300 transition-colors"
            onClick={() => navigate("/deadlines")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">Overdue</p>
              <p className="text-2xl font-mono font-bold text-red-700 mt-1">{stats?.overdue_deadlines || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => navigate("/notices")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Draft Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.draft_notices || 0}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border border-slate-200 shadow-none rounded-sm cursor-pointer hover:border-slate-300 transition-colors"
            onClick={() => navigate("/notices")}
          >
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Issued Notices</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats?.issued_notices || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-sm">
            <TabsTrigger value="projects" className="rounded-sm data-[state=active]:bg-white">
              <FolderKanban className="w-4 h-4 mr-2" /> Projects
            </TabsTrigger>
            {isLawyer && (
              <TabsTrigger value="clients" className="rounded-sm data-[state=active]:bg-white">
                <Users className="w-4 h-4 mr-2" /> Clients ({clients.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Filter by Client */}
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="w-48 rounded-sm">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 rounded-sm">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Sort by Status</SelectItem>
                    <SelectItem value="client">Sort by Client</SelectItem>
                    <SelectItem value="due_date">Sort by Due Date</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                  </SelectContent>
                </Select>

                {/* Archived Toggle */}
                {isLawyer && archivedProjects.length > 0 && (
                  <Button
                    variant={showArchived ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="rounded-sm"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {showArchived ? "Showing Archived" : `Archived (${archivedProjects.length})`}
                  </Button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-sm">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 rounded-sm"
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-8 rounded-sm"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Projects Display */}
            {getFilteredProjects().length === 0 ? (
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No projects found</p>
                  {isLawyer && (
                    <Button onClick={() => setProjectDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                      <Plus className="w-4 h-4 mr-2" /> Create First Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === "list" ? (
              /* List View */
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-mono text-xs uppercase">Project</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Client</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Value</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Next Due</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Actions</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredProjects().map((project) => (
                      <TableRow 
                        key={project.project_id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/projects/${project.project_id}`)}
                      >
                        <TableCell>
                          <div className={`w-3 h-3 rounded-full ${getStatusColorClasses(project.status_color)}`} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{project.name}</p>
                            <p className="text-xs text-slate-500">{project.contract_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{project.client_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCurrency(project.current_value)}
                        </TableCell>
                        <TableCell>
                          {project.next_due_date ? (
                            <span className="text-sm font-mono">
                              {format(parseISO(project.next_due_date), "dd MMM yyyy")}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] uppercase font-mono rounded-none ${getStatusBadgeClasses(project.status_color)}`}
                          >
                            {getStatusIcon(project.status_color)}
                            <span className="ml-1">{getStatusLabel(project.status_color)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {project.pending_events_count || 0} pending
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              /* Cards View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredProjects().map((project) => {
                  const valueChange = getValueChange(project.starting_value, project.current_value);
                  return (
                    <Card 
                      key={project.project_id}
                      className={`border-l-4 shadow-none rounded-sm cursor-pointer hover:shadow-md transition-all ${
                        project.status_color === "red" ? "border-l-red-500" :
                        project.status_color === "orange" ? "border-l-orange-500" :
                        "border-l-emerald-500"
                      }`}
                      onClick={() => navigate(`/projects/${project.project_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">{project.name}</p>
                            <p className="text-xs text-slate-500">{project.client_name}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] uppercase font-mono rounded-none shrink-0 ${getStatusBadgeClasses(project.status_color)}`}
                          >
                            {getStatusLabel(project.status_color)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Value</p>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-semibold text-slate-900">
                                {formatCurrency(project.current_value)}
                              </span>
                              {valueChange !== 0 && (
                                <span className={`text-[10px] ${parseFloat(valueChange) > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {parseFloat(valueChange) > 0 ? "+" : ""}{valueChange}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Next Due</p>
                            <span className="font-mono text-sm text-slate-900">
                              {project.next_due_date 
                                ? format(parseISO(project.next_due_date), "dd MMM")
                                : "—"
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t">
                          <span>{project.pending_events_count || 0} pending actions</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Clients Tab */}
          {isLawyer && (
            <TabsContent value="clients">
              <Card className="border border-slate-200 shadow-none rounded-sm">
                {clients.length === 0 ? (
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No clients yet. Create a project to add clients.</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs uppercase">Client</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Projects</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Active</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Action Items</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Overdue</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow 
                          key={client.client_name}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => setFilterClient(client.client_name)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{client.client_name}</p>
                                <p className="text-xs text-slate-500">{client.client_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-lg font-semibold">{client.project_count}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{client.active_projects}</span>
                          </TableCell>
                          <TableCell>
                            {client.action_items > 0 ? (
                              <Badge variant="outline" className="rounded-none font-mono">
                                {client.action_items}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {client.overdue_items > 0 ? (
                              <Badge variant="outline" className="rounded-none font-mono border-red-200 text-red-700 bg-red-50">
                                {client.overdue_items}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(client.total_value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
          )}
        </Tabs>

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
                {isLawyer && (
                  <Link to="/triggers" className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm">
                    <AlertTriangle className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-sm text-slate-900">Trigger Library</p>
                      <p className="text-xs text-slate-500">Manage event triggers</p>
                    </div>
                  </Link>
                )}
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
                        {stats.overdue_deadlines} Overdue Item{stats.overdue_deadlines > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-red-600">Immediate attention required</p>
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
