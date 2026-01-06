import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
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
import { Plus, CalendarIcon, CalendarClock, Check, Trash2 } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO, isBefore, addDays } from "date-fns";

export const DeadlinesPage = ({ user }) => {
  const [deadlines, setDeadlines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    priority: "medium",
  });

  const fetchData = async () => {
    try {
      const [deadlinesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/deadlines`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true }),
      ]);
      setDeadlines(deadlinesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("Please select a due date");
      return;
    }
    setCreating(true);
    try {
      await axios.post(
        `${API}/deadlines`,
        { ...formData, due_date: selectedDate.toISOString() },
        { withCredentials: true }
      );
      toast.success("Deadline created successfully");
      setDialogOpen(false);
      setFormData({ project_id: "", title: "", description: "", priority: "medium" });
      setSelectedDate(null);
      fetchData();
    } catch (error) {
      console.error("Error creating deadline:", error);
      toast.error("Failed to create deadline");
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (deadlineId) => {
    try {
      await axios.patch(
        `${API}/deadlines/${deadlineId}`,
        { status: "completed" },
        { withCredentials: true }
      );
      toast.success("Deadline marked as completed");
      fetchData();
    } catch (error) {
      toast.error("Failed to update deadline");
    }
  };

  const handleDelete = async (deadlineId) => {
    try {
      await axios.delete(`${API}/deadlines/${deadlineId}`, { withCredentials: true });
      toast.success("Deadline deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete deadline");
    }
  };

  const getDeadlineUrgency = (dueDate, status) => {
    if (status === "completed") return "completed";
    const due = parseISO(dueDate);
    const now = new Date();
    if (isBefore(due, now)) return "overdue";
    if (isBefore(due, addDays(now, 3))) return "urgent";
    if (isBefore(due, addDays(now, 7))) return "soon";
    return "normal";
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.project_id === projectId);
    return project?.name || projectId;
  };

  // Sort deadlines: overdue first, then by due date
  const sortedDeadlines = [...deadlines].sort((a, b) => {
    const urgencyA = getDeadlineUrgency(a.due_date, a.status);
    const urgencyB = getDeadlineUrgency(b.due_date, b.status);
    const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, normal: 3, completed: 4 };
    if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
      return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    }
    return new Date(a.due_date) - new Date(b.due_date);
  });

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
      <div className="space-y-6" data-testid="deadlines-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Deadlines
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Track and manage contractual deadlines
            </p>
          </div>

          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                  data-testid="create-deadline-btn"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Deadline
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Add New Deadline</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger data-testid="deadline-project-select" className="rounded-sm">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.project_id} value={project.project_id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      data-testid="deadline-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., EOT Claim Response"
                      required
                      className="rounded-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          data-testid="deadline-date-picker"
                          className="w-full justify-start text-left font-normal rounded-sm"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger data-testid="deadline-priority-select" className="rounded-sm">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      data-testid="deadline-description-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Additional details..."
                      rows={2}
                      className="rounded-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="rounded-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating || !formData.project_id}
                      data-testid="submit-deadline-btn"
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                    >
                      {creating ? "Creating..." : "Add Deadline"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Deadlines List */}
        {sortedDeadlines.length === 0 ? (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-12 text-center">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No deadlines</h3>
              <p className="text-slate-500 text-sm">
                {isLawyer ? "Add your first deadline to start tracking" : "No deadlines to display"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {sortedDeadlines.map((deadline) => {
                  const urgency = getDeadlineUrgency(deadline.due_date, deadline.status);
                  return (
                    <div
                      key={deadline.deadline_id}
                      className={`
                        px-6 py-4 flex items-center justify-between
                        ${urgency === "completed" ? "opacity-60" : ""}
                      `}
                      data-testid={`deadline-item-${deadline.deadline_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`
                          w-3 h-3 rounded-full
                          ${urgency === "overdue" ? "bg-red-500" : ""}
                          ${urgency === "urgent" ? "bg-orange-500" : ""}
                          ${urgency === "soon" ? "bg-amber-500" : ""}
                          ${urgency === "normal" ? "bg-slate-300" : ""}
                          ${urgency === "completed" ? "bg-emerald-500" : ""}
                        `}
                        />
                        <div>
                          <p className={`font-medium ${urgency === "completed" ? "line-through text-slate-500" : "text-slate-900"}`}>
                            {deadline.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {getProjectName(deadline.project_id)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`
                            text-[10px] uppercase tracking-wider font-mono rounded-none
                            ${urgency === "overdue" ? "border-red-200 text-red-700 bg-red-50" : ""}
                            ${urgency === "urgent" ? "border-orange-200 text-orange-700 bg-orange-50" : ""}
                            ${urgency === "soon" ? "border-amber-200 text-amber-700 bg-amber-50" : ""}
                            ${urgency === "normal" ? "border-slate-200 text-slate-600" : ""}
                            ${urgency === "completed" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}
                          `}
                        >
                          {format(parseISO(deadline.due_date), "dd MMM yyyy")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`priority-${deadline.priority} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                        >
                          {deadline.priority}
                        </Badge>

                        {isLawyer && deadline.status !== "completed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleComplete(deadline.deadline_id)}
                              data-testid={`complete-deadline-${deadline.deadline_id}`}
                              className="h-8 w-8"
                            >
                              <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(deadline.deadline_id)}
                              data-testid={`delete-deadline-${deadline.deadline_id}`}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DeadlinesPage;
