import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Calendar } from "../components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  CalendarIcon,
  Users,
  FileText,
  Send,
  CheckCircle2,
  Clock,
  UserPlus,
  Building2,
  Trash2,
  Upload,
  MoreVertical,
  FileUp,
  AlertCircle,
  Download,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, addDays } from "date-fns";

export const ProgramPage = ({ user }) => {
  const { projectId } = useParams();
  const fileInputRef = useRef(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [subcontracts, setSubcontracts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [subcontractorDialogOpen, setSubcontractorDialogOpen] = useState(false);
  const [subcontractDialogOpen, setSubcontractDialogOpen] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Form states
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    start_date: null,
    end_date: null,
    assigned_subcontractor_id: "",
    color: "#3b82f6",
  });
  
  const [subcontractorForm, setSubcontractorForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    trade: "",
  });
  
  const [subcontractForm, setSubcontractForm] = useState({
    title: "",
    contract_value: "",
    scope_of_work: "",
    terms: "",
  });

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    notice_type: "general",
    content: "",
  });

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const trades = [
    "Structural", "Electrical", "Plumbing", "HVAC", "Concrete", 
    "Roofing", "Glazing", "Flooring", "Painting", "Landscaping",
    "Fire Protection", "Demolition", "Excavation", "Steel", "Other"
  ];

  const taskColors = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Green" },
    { value: "#f59e0b", label: "Orange" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
    { value: "#64748b", label: "Gray" },
  ];

  const noticeTypes = [
    { value: "variation", label: "Variation" },
    { value: "delay", label: "Delay Notice" },
    { value: "extension_of_time", label: "Extension of Time" },
    { value: "payment_claim", label: "Payment Claim" },
    { value: "defect", label: "Defect Notice" },
    { value: "general", label: "General Notice" },
  ];

  const fetchData = async () => {
    try {
      const [projectRes, tasksRes, subsRes, contractsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/program`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/subcontractors`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/subcontracts`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/templates`, { withCredentials: true }),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setSubcontractors(subsRes.data);
      setSubcontracts(contractsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load program data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${API}/projects/${projectId}/program/import`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      
      const { tasks_created, subcontractors_created, errors } = response.data;
      
      if (tasks_created > 0 || subcontractors_created > 0) {
        toast.success(`Imported ${tasks_created} tasks and ${subcontractors_created} subcontractors`);
      }
      
      if (errors && errors.length > 0) {
        toast.error(`${errors.length} rows had errors`);
        console.error("Import errors:", errors);
      }
      
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to import program");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Download template
  const downloadTemplate = () => {
    const csvContent = "task_name,start_date,end_date,subcontractor_name,subcontractor_trade,subcontractor_email\nFoundation Works,2025-02-01,2025-03-15,ABC Concrete,Concrete,contact@abcconcrete.com\nStructural Steel,2025-03-01,2025-04-30,Steel Fabricators Ltd,Steel,info@steelfab.com\nElectrical Rough-In,2025-04-01,2025-05-15,Sparky Electric,Electrical,sparky@electric.com";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "program_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Task handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.start_date || !taskForm.end_date) {
      toast.error("Please select start and end dates");
      return;
    }
    try {
      await axios.post(`${API}/projects/${projectId}/program`, {
        ...taskForm,
        project_id: projectId,
        start_date: format(taskForm.start_date, "yyyy-MM-dd"),
        end_date: format(taskForm.end_date, "yyyy-MM-dd"),
        assigned_subcontractor_id: taskForm.assigned_subcontractor_id === "none" ? null : taskForm.assigned_subcontractor_id || null,
      }, { withCredentials: true });
      toast.success("Task created");
      setTaskDialogOpen(false);
      setTaskForm({ name: "", description: "", start_date: null, end_date: null, assigned_subcontractor_id: "", color: "#3b82f6" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/program/${taskId}`, { withCredentials: true });
      toast.success("Task deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleUpdateTaskProgress = async (taskId, progress) => {
    try {
      await axios.patch(`${API}/projects/${projectId}/program/${taskId}`, { 
        progress,
        status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"
      }, { withCredentials: true });
      fetchData();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  // Subcontractor handlers
  const handleCreateSubcontractor = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/projects/${projectId}/subcontractors`, {
        ...subcontractorForm,
        project_id: projectId,
      }, { withCredentials: true });
      toast.success("Subcontractor added and invited");
      setSubcontractorDialogOpen(false);
      setSubcontractorForm({ company_name: "", contact_name: "", email: "", phone: "", trade: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add subcontractor");
    }
  };

  // Subcontract handlers
  const handleCreateSubcontract = async (e) => {
    e.preventDefault();
    if (!selectedSubcontractor) return;
    try {
      await axios.post(`${API}/projects/${projectId}/subcontracts`, {
        ...subcontractForm,
        project_id: projectId,
        subcontractor_id: selectedSubcontractor.subcontractor_id,
        contract_value: parseFloat(subcontractForm.contract_value) || 0,
      }, { withCredentials: true });
      toast.success("Subcontract created");
      setSubcontractDialogOpen(false);
      setSubcontractForm({ title: "", contract_value: "", scope_of_work: "", terms: "" });
      setSelectedSubcontractor(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to create subcontract");
    }
  };

  const handleIssueSubcontract = async (subcontractId) => {
    try {
      await axios.post(`${API}/projects/${projectId}/subcontracts/${subcontractId}/issue`, {}, { withCredentials: true });
      toast.success("Subcontract issued");
      fetchData();
    } catch (error) {
      toast.error("Failed to issue subcontract");
    }
  };

  const handleSignSubcontract = async (subcontractId) => {
    try {
      await axios.post(`${API}/projects/${projectId}/subcontracts/${subcontractId}/sign`, {}, { withCredentials: true });
      toast.success("Subcontract signed");
      fetchData();
    } catch (error) {
      toast.error("Failed to sign subcontract");
    }
  };

  // Notice handler
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/notices`, {
        project_id: projectId,
        ...noticeForm,
        recipient_email: selectedSubcontractor?.email || "",
      }, { withCredentials: true });
      toast.success("Notice created");
      setNoticeDialogOpen(false);
      setNoticeForm({ title: "", notice_type: "general", content: "" });
      setSelectedSubcontractor(null);
      setSelectedTask(null);
    } catch (error) {
      toast.error("Failed to create notice");
    }
  };

  // Quick action handlers for tasks
  const openSubcontractForTask = (task) => {
    const sub = subcontractors.find(s => s.subcontractor_id === task.assigned_subcontractor_id);
    if (sub) {
      setSelectedSubcontractor(sub);
      setSubcontractForm({
        title: `${sub.trade} Works - ${task.name}`,
        contract_value: "",
        scope_of_work: `Scope for ${task.name}:\n- Work period: ${task.start_date} to ${task.end_date}`,
        terms: "",
      });
      setSubcontractDialogOpen(true);
    } else {
      toast.error("Please assign a subcontractor to this task first");
    }
  };

  const openNoticeForTask = (task) => {
    const sub = subcontractors.find(s => s.subcontractor_id === task.assigned_subcontractor_id);
    setSelectedTask(task);
    setSelectedSubcontractor(sub || null);
    setNoticeForm({
      title: `Notice - ${task.name}`,
      notice_type: "general",
      content: `Re: ${task.name}\n\nDear ${sub?.company_name || "Contractor"},\n\n`,
    });
    setNoticeDialogOpen(true);
  };

  // Gantt chart helpers
  const getGanttDateRange = () => {
    if (tasks.length === 0) {
      const today = new Date();
      return { start: today, end: addDays(today, 30) };
    }
    const dates = tasks.flatMap(t => [parseISO(t.start_date), parseISO(t.end_date)]);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return { 
      start: addDays(minDate, -7), 
      end: addDays(maxDate, 7) 
    };
  };

  const getTaskPosition = (task, dateRange) => {
    const totalDays = differenceInDays(dateRange.end, dateRange.start);
    const startOffset = differenceInDays(parseISO(task.start_date), dateRange.start);
    const duration = differenceInDays(parseISO(task.end_date), parseISO(task.start_date)) + 1;
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getSubcontractorName = (subcontractorId) => {
    const sub = subcontractors.find(s => s.subcontractor_id === subcontractorId);
    return sub?.company_name || "Unassigned";
  };

  const getSubcontractorForTask = (task) => {
    return subcontractors.find(s => s.subcontractor_id === task.assigned_subcontractor_id);
  };

  const getSubcontractForSubcontractor = (subcontractorId) => {
    return subcontracts.find(c => c.subcontractor_id === subcontractorId);
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

  const dateRange = getGanttDateRange();
  const totalDays = differenceInDays(dateRange.end, dateRange.start);

  return (
    <Layout user={user}>
      <div className="space-y-6" data-testid="program-page">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to={`/projects/${projectId}`}
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project
            </Link>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Construction Program
            </h1>
            <p className="text-slate-500 text-sm mt-1">{project?.name}</p>
          </div>

          {isLawyer && (
            <div className="flex items-center gap-3">
              {/* Upload Program */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-sm" disabled={uploading} data-testid="upload-program-btn">
                    <Upload className="w-4 h-4 mr-2" /> {uploading ? "Uploading..." : "Upload Program"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="w-4 h-4 mr-2" /> Import from CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" /> Download Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={subcontractorDialogOpen} onOpenChange={setSubcontractorDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm" data-testid="add-subcontractor-btn">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Subcontractor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Add Subcontractor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSubcontractor} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input
                          value={subcontractorForm.company_name}
                          onChange={(e) => setSubcontractorForm({ ...subcontractorForm, company_name: e.target.value })}
                          required
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Trade *</Label>
                        <Select
                          value={subcontractorForm.trade || undefined}
                          onValueChange={(v) => setSubcontractorForm({ ...subcontractorForm, trade: v })}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                          <SelectContent>
                            {trades.map((trade) => (
                              <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Name *</Label>
                        <Input
                          value={subcontractorForm.contact_name}
                          onChange={(e) => setSubcontractorForm({ ...subcontractorForm, contact_name: e.target.value })}
                          required
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={subcontractorForm.email}
                          onChange={(e) => setSubcontractorForm({ ...subcontractorForm, email: e.target.value })}
                          required
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={subcontractorForm.phone}
                        onChange={(e) => setSubcontractorForm({ ...subcontractorForm, phone: e.target.value })}
                        className="rounded-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      The subcontractor will be invited via email to access the portal.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setSubcontractorDialogOpen(false)} className="rounded-sm">Cancel</Button>
                      <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">Add & Invite</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 rounded-sm" data-testid="add-task-btn">
                    <Plus className="w-4 h-4 mr-2" /> Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Add Program Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Task Name *</Label>
                      <Input
                        value={taskForm.name}
                        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        placeholder="e.g., Foundation Works"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taskForm.start_date ? format(taskForm.start_date, "PPP") : "Select"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={taskForm.start_date} onSelect={(d) => setTaskForm({ ...taskForm, start_date: d })} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {taskForm.end_date ? format(taskForm.end_date, "PPP") : "Select"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={taskForm.end_date} onSelect={(d) => setTaskForm({ ...taskForm, end_date: d })} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Assign Subcontractor</Label>
                        <Select
                          value={taskForm.assigned_subcontractor_id || "none"}
                          onValueChange={(v) => setTaskForm({ ...taskForm, assigned_subcontractor_id: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue placeholder="Select subcontractor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {subcontractors.map((sub) => (
                              <SelectItem key={sub.subcontractor_id} value={sub.subcontractor_id}>
                                {sub.company_name} ({sub.trade})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select
                          value={taskForm.color}
                          onValueChange={(v) => setTaskForm({ ...taskForm, color: v })}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taskColors.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.value }} />
                                  <span>{c.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={2}
                        className="rounded-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)} className="rounded-sm">Cancel</Button>
                      <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">Add Task</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="gantt" className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-sm">
            <TabsTrigger value="gantt" className="rounded-sm data-[state=active]:bg-white">
              <Clock className="w-4 h-4 mr-2" /> Program
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="rounded-sm data-[state=active]:bg-white">
              <Users className="w-4 h-4 mr-2" /> Subcontractors ({subcontractors.length})
            </TabsTrigger>
            <TabsTrigger value="subcontracts" className="rounded-sm data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" /> Subcontracts ({subcontracts.length})
            </TabsTrigger>
          </TabsList>

          {/* Gantt Chart Tab */}
          <TabsContent value="gantt">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Construction Program</CardTitle>
                  <p className="text-xs text-slate-500">Click progress bar to update • Use actions menu for each task</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tasks.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No tasks in the program yet</p>
                    <div className="flex items-center justify-center gap-3">
                      {isLawyer && (
                        <>
                          <Button onClick={() => setTaskDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                            <Plus className="w-4 h-4 mr-2" /> Add Task
                          </Button>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-sm">
                            <Upload className="w-4 h-4 mr-2" /> Import CSV
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Timeline Header */}
                    <div className="min-w-[1000px]">
                      <div className="flex border-b border-slate-200">
                        <div className="w-72 shrink-0 p-3 border-r border-slate-200 bg-slate-50">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Task / Subcontractor</span>
                        </div>
                        <div className="flex-1 p-3 bg-slate-50">
                          <div className="flex justify-between text-xs font-mono text-slate-500">
                            <span>{format(dateRange.start, "dd MMM")}</span>
                            <span>{format(addDays(dateRange.start, Math.floor(totalDays / 2)), "dd MMM")}</span>
                            <span>{format(dateRange.end, "dd MMM")}</span>
                          </div>
                        </div>
                        <div className="w-24 shrink-0 p-3 border-l border-slate-200 bg-slate-50 text-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Actions</span>
                        </div>
                      </div>

                      {/* Tasks */}
                      {tasks.map((task) => {
                        const pos = getTaskPosition(task, dateRange);
                        const sub = getSubcontractorForTask(task);
                        const existingContract = sub ? getSubcontractForSubcontractor(sub.subcontractor_id) : null;
                        
                        return (
                          <div key={task.task_id} className="flex border-b border-slate-100 hover:bg-slate-50 group" data-testid={`task-row-${task.task_id}`}>
                            {/* Task Info */}
                            <div className="w-72 shrink-0 p-3 border-r border-slate-200">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-slate-900 text-sm">{task.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {sub ? (
                                      <Badge variant="outline" className="text-[10px] font-mono rounded-none">
                                        {sub.company_name}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-slate-400">Unassigned</span>
                                    )}
                                    {existingContract && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[10px] font-mono rounded-none
                                          ${existingContract.status === 'signed' ? 'status-active' : ''}
                                          ${existingContract.status === 'issued' ? 'status-issued' : ''}
                                          ${existingContract.status === 'draft' ? 'status-draft' : ''}
                                        `}
                                      >
                                        {existingContract.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Gantt Bar */}
                            <div className="flex-1 p-3 relative">
                              <div
                                className="absolute h-7 rounded-sm flex items-center px-2 text-xs text-white font-medium cursor-pointer transition-all hover:shadow-md"
                                style={{
                                  backgroundColor: task.color,
                                  left: pos.left,
                                  width: pos.width,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  minWidth: "60px",
                                }}
                                onClick={() => {
                                  if (isLawyer) {
                                    const newProgress = task.progress >= 100 ? 0 : task.progress + 25;
                                    handleUpdateTaskProgress(task.task_id, newProgress);
                                  }
                                }}
                                title={`${task.progress}% complete - Click to update progress`}
                              >
                                <div 
                                  className="absolute left-0 top-0 bottom-0 bg-black/20 rounded-l-sm transition-all"
                                  style={{ width: `${task.progress}%` }}
                                />
                                <span className="relative z-10 truncate">{task.progress}%</span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="w-24 shrink-0 p-3 border-l border-slate-200 flex items-center justify-center">
                              {isLawyer && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`task-actions-${task.task_id}`}>
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {sub && !existingContract && (
                                      <DropdownMenuItem onClick={() => openSubcontractForTask(task)}>
                                        <FileText className="w-4 h-4 mr-2" /> Issue Subcontract
                                      </DropdownMenuItem>
                                    )}
                                    {existingContract?.status === 'draft' && (
                                      <DropdownMenuItem onClick={() => handleIssueSubcontract(existingContract.subcontract_id)}>
                                        <Send className="w-4 h-4 mr-2" /> Send Subcontract
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => openNoticeForTask(task)}>
                                      <AlertCircle className="w-4 h-4 mr-2" /> Issue Notice
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteTask(task.task_id)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Subcontractors</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {subcontractors.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No subcontractors added yet</p>
                    {isLawyer && (
                      <Button onClick={() => setSubcontractorDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                        <UserPlus className="w-4 h-4 mr-2" /> Add Subcontractor
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs uppercase">Company</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Trade</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Contact</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subcontractors.map((sub) => {
                        const contract = getSubcontractForSubcontractor(sub.subcontractor_id);
                        return (
                          <TableRow key={sub.subcontractor_id} data-testid={`subcontractor-row-${sub.subcontractor_id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="font-medium">{sub.company_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-none text-[10px] uppercase font-mono">
                                {sub.trade}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{sub.contact_name}</p>
                                <p className="text-xs text-slate-500">{sub.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`rounded-none text-[10px] uppercase font-mono
                                  ${sub.status === "active" ? "status-active" : ""}
                                  ${sub.status === "invited" ? "status-issued" : ""}
                                  ${sub.status === "pending" ? "status-pending" : ""}
                                `}
                              >
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isLawyer && !contract && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubcontractor(sub);
                                      setSubcontractForm({
                                        title: `${sub.trade} Works Subcontract`,
                                        contract_value: "",
                                        scope_of_work: "",
                                        terms: "",
                                      });
                                      setSubcontractDialogOpen(true);
                                    }}
                                    className="rounded-sm text-xs"
                                  >
                                    <FileText className="w-3 h-3 mr-1" /> Subcontract
                                  </Button>
                                )}
                                {isLawyer && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubcontractor(sub);
                                      setNoticeForm({
                                        title: `Notice to ${sub.company_name}`,
                                        notice_type: "general",
                                        content: `Dear ${sub.company_name},\n\n`,
                                      });
                                      setNoticeDialogOpen(true);
                                    }}
                                    className="rounded-sm text-xs"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" /> Notice
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcontracts Tab */}
          <TabsContent value="subcontracts">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Subcontracts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {subcontracts.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No subcontracts created yet</p>
                    <p className="text-xs text-slate-400 mt-1">Use task actions or subcontractor actions to create subcontracts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs uppercase">Title</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Subcontractor</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Value</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                        <TableHead className="font-mono text-xs uppercase">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subcontracts.map((contract) => {
                        const sub = subcontractors.find(s => s.subcontractor_id === contract.subcontractor_id);
                        return (
                          <TableRow key={contract.subcontract_id} data-testid={`subcontract-row-${contract.subcontract_id}`}>
                            <TableCell className="font-medium">{contract.title}</TableCell>
                            <TableCell>{sub?.company_name || "Unknown"}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(contract.contract_value)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`rounded-none text-[10px] uppercase font-mono
                                  ${contract.status === "signed" ? "status-active" : ""}
                                  ${contract.status === "issued" ? "status-issued" : ""}
                                  ${contract.status === "draft" ? "status-draft" : ""}
                                `}
                              >
                                {contract.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isLawyer && contract.status === "draft" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleIssueSubcontract(contract.subcontract_id)}
                                    className="rounded-sm text-xs"
                                  >
                                    <Send className="w-3 h-3 mr-1" /> Issue
                                  </Button>
                                )}
                                {contract.status === "issued" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSignSubcontract(contract.subcontract_id)}
                                    className="rounded-sm text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Sign
                                  </Button>
                                )}
                                {contract.status === "signed" && (
                                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Signed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Subcontract Dialog */}
        <Dialog open={subcontractDialogOpen} onOpenChange={setSubcontractDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Create Subcontract for {selectedSubcontractor?.company_name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubcontract} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Contract Title *</Label>
                <Input
                  value={subcontractForm.title}
                  onChange={(e) => setSubcontractForm({ ...subcontractForm, title: e.target.value })}
                  placeholder="e.g., Electrical Works Subcontract"
                  required
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Value ($)</Label>
                <Input
                  type="number"
                  value={subcontractForm.contract_value}
                  onChange={(e) => setSubcontractForm({ ...subcontractForm, contract_value: e.target.value })}
                  placeholder="0"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Scope of Work *</Label>
                <Textarea
                  value={subcontractForm.scope_of_work}
                  onChange={(e) => setSubcontractForm({ ...subcontractForm, scope_of_work: e.target.value })}
                  placeholder="Describe the scope of work..."
                  rows={4}
                  required
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={subcontractForm.terms}
                  onChange={(e) => setSubcontractForm({ ...subcontractForm, terms: e.target.value })}
                  placeholder="Additional terms..."
                  rows={3}
                  className="rounded-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setSubcontractDialogOpen(false)} className="rounded-sm">Cancel</Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">Create Draft</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Notice Dialog */}
        <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Issue Notice {selectedSubcontractor ? `to ${selectedSubcontractor.company_name}` : ""}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateNotice} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Notice Title *</Label>
                <Input
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  required
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Notice Type</Label>
                <Select
                  value={noticeForm.notice_type}
                  onValueChange={(v) => setNoticeForm({ ...noticeForm, notice_type: v })}
                >
                  <SelectTrigger className="rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {noticeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  rows={6}
                  required
                  className="rounded-sm font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setNoticeDialogOpen(false)} className="rounded-sm">Cancel</Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">Create Notice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProgramPage;
