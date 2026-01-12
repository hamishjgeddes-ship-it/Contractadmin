import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Calendar } from "../components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  AlertTriangle,
  Plus,
  CalendarIcon,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  XCircle,
  FileText,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const ProjectEventsSection = ({ projectId, user, onStatusChange }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [generateDocDialogOpen, setGenerateDocDialogOpen] = useState(false);
  const [selectedEventForDoc, setSelectedEventForDoc] = useState(null);
  const [responseDueDate, setResponseDueDate] = useState(null);

  const [docForm, setDocForm] = useState({
    notice_type: "",
    title: "",
    content: "",
    claimed_amount: "",
    response_due_date: null,
  });

  const [form, setForm] = useState({
    trigger_id: "",
    title: "",
    description: "",
    value: "",
    notes: "",
  });

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const noticeTypes = [
    { value: "variation", label: "Variation" },
    { value: "delay", label: "Delay Notice" },
    { value: "latent_condition", label: "Latent Condition" },
    { value: "design_issue", label: "Design Issue" },
    { value: "contamination", label: "Contamination" },
    { value: "extension_of_time", label: "Extension of Time" },
    { value: "payment_claim", label: "Payment Claim" },
    { value: "defect", label: "Defect Notice" },
    { value: "dispute", label: "Dispute Notice" },
    { value: "general", label: "General Notice" },
  ];

  const fetchData = async () => {
    try {
      const [eventsRes, triggersRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}/events`, { withCredentials: true }),
        axios.get(`${API}/triggers`, { withCredentials: true }),
      ]);
      setEvents(eventsRes.data);
      setTriggers(triggersRes.data);
      
      // Notify parent of status change
      if (onStatusChange) {
        const hasRed = eventsRes.data.some(e => e.status_color === "red" && e.status !== "completed");
        const hasOrange = eventsRes.data.some(e => e.status_color === "orange" && e.status !== "completed");
        onStatusChange(hasRed ? "red" : hasOrange ? "orange" : "green");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const resetForm = () => {
    setForm({
      trigger_id: "",
      title: "",
      description: "",
      value: "",
      notes: "",
    });
    setDueDate(null);
    setEditingEvent(null);
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setForm({
        trigger_id: event.trigger_id,
        title: event.title,
        description: event.description || "",
        value: event.value?.toString() || "",
        notes: event.notes || "",
      });
      setDueDate(event.due_date ? parseISO(event.due_date) : null);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleTriggerSelect = (triggerId) => {
    const trigger = triggers.find(t => t.trigger_id === triggerId);
    if (trigger && !editingEvent) {
      setForm({
        ...form,
        trigger_id: triggerId,
        title: trigger.name,
      });
    } else {
      setForm({ ...form, trigger_id: triggerId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        project_id: projectId,
        trigger_id: form.trigger_id,
        title: form.title,
        description: form.description || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        value: form.value ? parseFloat(form.value) : null,
        notes: form.notes || null,
      };

      if (editingEvent) {
        await axios.patch(
          `${API}/projects/${projectId}/events/${editingEvent.event_id}`,
          payload,
          { withCredentials: true }
        );
        toast.success("Event updated");
      } else {
        await axios.post(
          `${API}/projects/${projectId}/events`,
          payload,
          { withCredentials: true }
        );
        toast.success("Event created");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save event");
    }
  };

  const handleStatusUpdate = async (eventId, status) => {
    try {
      await axios.patch(
        `${API}/projects/${projectId}/events/${eventId}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Event marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleOverrideStatus = async (eventId, color) => {
    try {
      await axios.patch(
        `${API}/projects/${projectId}/events/${eventId}`,
        { 
          manual_status_override: color,
          override_reason: `Manually set to ${color} by lawyer`
        },
        { withCredentials: true }
      );
      toast.success("Status overridden");
      fetchData();
    } catch (error) {
      toast.error("Failed to override status");
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(
        `${API}/projects/${projectId}/events/${eventId}`,
        { withCredentials: true }
      );
      toast.success("Event deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const openGenerateDocDialog = (event) => {
    setSelectedEventForDoc(event);
    const trigger = triggers.find(t => t.trigger_id === event.trigger_id);
    
    // Pre-fill the form with event data
    setDocForm({
      notice_type: trigger?.event_type || "general",
      title: `${event.title} - Notice`,
      content: `Project: ${projectId}\nEvent: ${event.title}\n${event.description || ""}\n\nValue: ${event.value ? `$${event.value.toLocaleString()}` : "N/A"}\nDue Date: ${event.due_date || "Not set"}\n\n[Additional details to be added]`,
      claimed_amount: event.value?.toString() || "",
    });
    setResponseDueDate(null);
    setGenerateDocDialogOpen(true);
  };

  const handleGenerateDocument = async () => {
    try {
      await axios.post(`${API}/notices`, {
        project_id: projectId,
        title: docForm.title,
        notice_type: docForm.notice_type,
        content: docForm.content,
        claimed_amount: docForm.claimed_amount ? parseFloat(docForm.claimed_amount) : null,
        response_due_date: responseDueDate ? format(responseDueDate, "yyyy-MM-dd") : null,
        linked_event_id: selectedEventForDoc?.event_id,
      }, { withCredentials: true });
      
      toast.success("Notice/Claim document created");
      setGenerateDocDialogOpen(false);
      setSelectedEventForDoc(null);
      
      // Navigate to notices page
      navigate(`/notices`);
    } catch (error) {
      toast.error("Failed to create document");
    }
  };

  const getStatusColorClasses = (color) => {
    switch (color) {
      case "red": return "bg-red-500";
      case "orange": return "bg-orange-500";
      default: return "bg-emerald-500";
    }
  };

  const getStatusBadgeClasses = (color) => {
    switch (color) {
      case "red": return "border-red-200 text-red-700 bg-red-50";
      case "orange": return "border-orange-200 text-orange-700 bg-orange-50";
      default: return "border-emerald-200 text-emerald-700 bg-emerald-50";
    }
  };

  const getStatusIcon = (color) => {
    switch (color) {
      case "red": return <AlertTriangle className="w-4 h-4" />;
      case "orange": return <AlertCircle className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const pendingEvents = events.filter(e => e.status !== "completed" && e.status !== "dismissed");
  const completedEvents = events.filter(e => e.status === "completed" || e.status === "dismissed");

  if (loading) {
    return (
      <Card className="border border-slate-200 shadow-none rounded-sm">
        <CardContent className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-none rounded-sm">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Events & Triggers
            {pendingEvents.length > 0 && (
              <Badge variant="outline" className="ml-2 rounded-none font-mono">
                {pendingEvents.length} pending
              </Badge>
            )}
          </CardTitle>
          
          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => handleOpenDialog()}
                  className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">
                    {editingEvent ? "Edit Event" : "Add Event"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Trigger Type *</Label>
                    <Select
                      value={form.trigger_id || undefined}
                      onValueChange={handleTriggerSelect}
                    >
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select trigger type" />
                      </SelectTrigger>
                      <SelectContent>
                        {triggers.map((trigger) => (
                          <SelectItem key={trigger.trigger_id} value={trigger.trigger_id}>
                            <div className="flex items-center gap-2">
                              <span>{trigger.name}</span>
                              <Badge variant="outline" className="text-[10px] rounded-none">
                                {trigger.event_type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {triggers.length === 0 && (
                      <p className="text-xs text-amber-600">
                        No triggers configured. Please set up triggers first.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Event Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g., Submit delay notice for weather event"
                      required
                      className="rounded-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Value ($)</Label>
                      <Input
                        type="number"
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                        placeholder="0"
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Additional details..."
                      rows={2}
                      className="rounded-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Internal notes..."
                      rows={2}
                      className="rounded-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                      disabled={!form.trigger_id}
                    >
                      {editingEvent ? "Update Event" : "Add Event"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">No events configured for this project</p>
            <p className="text-xs text-slate-400">
              Add events to track deadlines, notices, and claims
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Pending Events */}
            {pendingEvents.map((event) => (
              <div 
                key={event.event_id} 
                className="p-4 hover:bg-slate-50 flex items-start gap-4"
              >
                {/* Status Indicator */}
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${getStatusColorClasses(event.status_color)}`} />
                
                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none">
                          {event.trigger_event_type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] uppercase font-mono rounded-none ${getStatusBadgeClasses(event.status_color)}`}
                        >
                          {getStatusIcon(event.status_color)}
                          <span className="ml-1">
                            {event.status_color === "red" ? "Overdue" : 
                             event.status_color === "orange" ? "Due Soon" : "On Track"}
                          </span>
                        </Badge>
                        {event.manual_status_override && (
                          <Badge variant="outline" className="text-[10px] font-mono rounded-none bg-purple-50 text-purple-700 border-purple-200">
                            Override
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-500 mt-1">{event.description}</p>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      {event.due_date && (
                        <p className="font-mono text-sm text-slate-900">
                          {format(parseISO(event.due_date), "dd MMM yyyy")}
                        </p>
                      )}
                      {event.value && (
                        <p className="text-xs text-slate-500 font-mono">
                          ${event.value.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isLawyer && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusUpdate(event.event_id, "completed")}>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(event.event_id, "dismissed")}>
                        <XCircle className="w-4 h-4 mr-2 text-slate-500" /> Dismiss
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleOverrideStatus(event.event_id, "green")}>
                        <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2" /> Set Green
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOverrideStatus(event.event_id, "orange")}>
                        <span className="w-3 h-3 rounded-full bg-orange-500 mr-2" /> Set Orange
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOverrideStatus(event.event_id, "red")}>
                        <span className="w-3 h-3 rounded-full bg-red-500 mr-2" /> Set Red
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(event.event_id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {/* Completed Events (collapsed) */}
            {completedEvents.length > 0 && (
              <div className="bg-slate-50 p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
                  Completed ({completedEvents.length})
                </p>
                <div className="space-y-2">
                  {completedEvents.slice(0, 3).map((event) => (
                    <div key={event.event_id} className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="line-through">{event.title}</span>
                      {event.completed_at && (
                        <span className="text-xs">
                          - {format(parseISO(event.completed_at), "dd MMM")}
                        </span>
                      )}
                    </div>
                  ))}
                  {completedEvents.length > 3 && (
                    <p className="text-xs text-slate-400">
                      +{completedEvents.length - 3} more completed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectEventsSection;
