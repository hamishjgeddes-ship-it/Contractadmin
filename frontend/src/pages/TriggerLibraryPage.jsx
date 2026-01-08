import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";

export const TriggerLibraryPage = ({ user }) => {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const [form, setForm] = useState({
    name: "",
    event_type: "general",
    description: "",
    importance: "medium",
    next_steps: "",
    outcome: "",
    days_to_orange: 7,
    days_to_red: 1,
    causes_red_flag: true,
    requires_due_date: true,
    requires_value: false,
    min_value_for_red: 0,
  });

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const eventTypes = [
    { value: "delay", label: "Delay" },
    { value: "cost", label: "Cost" },
    { value: "variation", label: "Variation" },
    { value: "dispute", label: "Dispute" },
    { value: "extension_of_time", label: "Extension of Time" },
    { value: "payment_claim", label: "Payment Claim" },
    { value: "defect", label: "Defect" },
    { value: "general", label: "General" },
  ];

  const importanceLevels = [
    { value: "low", label: "Low", color: "bg-slate-100 text-slate-700" },
    { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
    { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
  ];

  const fetchTriggers = async () => {
    try {
      const response = await axios.get(`${API}/triggers`, { withCredentials: true });
      setTriggers(response.data);
    } catch (error) {
      console.error("Error fetching triggers:", error);
      toast.error("Failed to load triggers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const response = await axios.post(`${API}/triggers/seed-defaults`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchTriggers();
    } catch (error) {
      toast.error("Failed to seed default triggers");
    } finally {
      setSeeding(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      event_type: "general",
      description: "",
      importance: "medium",
      next_steps: "",
      outcome: "",
      days_to_orange: 7,
      days_to_red: 1,
      causes_red_flag: true,
      requires_due_date: true,
      requires_value: false,
      min_value_for_red: 0,
    });
    setEditingTrigger(null);
  };

  const handleOpenDialog = (trigger = null) => {
    if (trigger) {
      setEditingTrigger(trigger);
      setForm({
        name: trigger.name,
        event_type: trigger.event_type,
        description: trigger.description || "",
        importance: trigger.importance,
        next_steps: trigger.next_steps || "",
        outcome: trigger.outcome || "",
        days_to_orange: trigger.days_to_orange,
        days_to_red: trigger.days_to_red,
        causes_red_flag: trigger.causes_red_flag,
        requires_due_date: trigger.requires_due_date,
        requires_value: trigger.requires_value,
        min_value_for_red: trigger.min_value_for_red || 0,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTrigger) {
        await axios.patch(`${API}/triggers/${editingTrigger.trigger_id}`, form, { withCredentials: true });
        toast.success("Trigger updated");
      } else {
        await axios.post(`${API}/triggers`, form, { withCredentials: true });
        toast.success("Trigger created");
      }
      setDialogOpen(false);
      resetForm();
      fetchTriggers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save trigger");
    }
  };

  const handleDelete = async (triggerId) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;
    try {
      await axios.delete(`${API}/triggers/${triggerId}`, { withCredentials: true });
      toast.success("Trigger deleted");
      fetchTriggers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete trigger");
    }
  };

  const getImportanceBadge = (importance) => {
    const level = importanceLevels.find(l => l.value === importance);
    return level ? level.color : "bg-slate-100 text-slate-700";
  };

  const getEventTypeLabel = (type) => {
    const eventType = eventTypes.find(e => e.value === type);
    return eventType ? eventType.label : type;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Trigger Library
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure event triggers and their status thresholds
            </p>
          </div>

          <div className="flex items-center gap-3">
            {triggers.length === 0 && (
              <Button
                variant="outline"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="rounded-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? "Loading..." : "Load Default Triggers"}
              </Button>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => handleOpenDialog()}
                  className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Trigger
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading">
                    {editingTrigger ? "Edit Trigger" : "Create Trigger"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trigger Name *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g., Delay Notice Required"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Event Type *</Label>
                      <Select
                        value={form.event_type}
                        onValueChange={(v) => setForm({ ...form, event_type: v })}
                      >
                        <SelectTrigger className="rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of when this trigger applies..."
                      rows={2}
                      className="rounded-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Importance Level</Label>
                    <Select
                      value={form.importance}
                      onValueChange={(v) => setForm({ ...form, importance: v })}
                    >
                      <SelectTrigger className="rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {importanceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Instructions */}
                  <div className="border-t pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">
                      Instructions & Outcomes
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Next Steps</Label>
                        <Textarea
                          value={form.next_steps}
                          onChange={(e) => setForm({ ...form, next_steps: e.target.value })}
                          placeholder="What should be done when this event triggers..."
                          rows={2}
                          className="rounded-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Outcome (if not actioned)</Label>
                        <Textarea
                          value={form.outcome}
                          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                          placeholder="What happens if this is not addressed..."
                          rows={2}
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thresholds */}
                  <div className="border-t pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">
                      Status Thresholds
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          Days to Orange
                        </Label>
                        <Input
                          type="number"
                          value={form.days_to_orange}
                          onChange={(e) => setForm({ ...form, days_to_orange: parseInt(e.target.value) || 0 })}
                          min={0}
                          className="rounded-sm"
                        />
                        <p className="text-xs text-slate-500">Show orange when this many days until due</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          Days to Red
                        </Label>
                        <Input
                          type="number"
                          value={form.days_to_red}
                          onChange={(e) => setForm({ ...form, days_to_red: parseInt(e.target.value) || 0 })}
                          min={0}
                          className="rounded-sm"
                        />
                        <p className="text-xs text-slate-500">Show red when this many days until due</p>
                      </div>
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="border-t pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">
                      Red Flag Rules
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Causes Red Flag</Label>
                          <p className="text-xs text-slate-500">When overdue, should this trigger red status?</p>
                        </div>
                        <Switch
                          checked={form.causes_red_flag}
                          onCheckedChange={(v) => setForm({ ...form, causes_red_flag: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Requires Due Date</Label>
                          <p className="text-xs text-slate-500">Events without due date won't trigger status</p>
                        </div>
                        <Switch
                          checked={form.requires_due_date}
                          onCheckedChange={(v) => setForm({ ...form, requires_due_date: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Requires Value</Label>
                          <p className="text-xs text-slate-500">Events without value won't trigger red status</p>
                        </div>
                        <Switch
                          checked={form.requires_value}
                          onCheckedChange={(v) => setForm({ ...form, requires_value: v })}
                        />
                      </div>
                      {form.requires_value && (
                        <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                          <Label>Minimum Value for Red ($)</Label>
                          <Input
                            type="number"
                            value={form.min_value_for_red}
                            onChange={(e) => setForm({ ...form, min_value_for_red: parseFloat(e.target.value) || 0 })}
                            min={0}
                            className="rounded-sm"
                          />
                          <p className="text-xs text-slate-500">Events below this value won't trigger red</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                      {editingTrigger ? "Update Trigger" : "Create Trigger"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Triggers Table */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          {triggers.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No triggers configured yet</p>
              <p className="text-sm text-slate-400 mb-6">
                Load default construction triggers or create your own
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="rounded-sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
                  Load Defaults
                </Button>
                <Button onClick={() => handleOpenDialog()} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Custom
                </Button>
              </div>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase">Trigger</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Type</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Importance</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Thresholds</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Red Flag</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Requirements</TableHead>
                  <TableHead className="font-mono text-xs uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((trigger) => (
                  <TableRow key={trigger.trigger_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{trigger.name}</p>
                        {trigger.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{trigger.description}</p>
                        )}
                        {trigger.is_system && (
                          <Badge variant="outline" className="mt-1 text-[10px] rounded-none">
                            System
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none">
                        {getEventTypeLabel(trigger.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] uppercase font-mono rounded-none ${getImportanceBadge(trigger.importance)}`}>
                        {trigger.importance}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          {trigger.days_to_orange}d
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          {trigger.days_to_red}d
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {trigger.causes_red_flag ? (
                        <CheckCircle2 className="w-4 h-4 text-red-500" />
                      ) : (
                        <span className="text-xs text-slate-400">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {trigger.requires_due_date && (
                          <Calendar className="w-4 h-4 text-slate-400" title="Requires due date" />
                        )}
                        {trigger.requires_value && (
                          <DollarSign className="w-4 h-4 text-slate-400" title="Requires value" />
                        )}
                        {!trigger.requires_due_date && !trigger.requires_value && (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(trigger)}
                          disabled={trigger.is_system}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(trigger.trigger_id)}
                          disabled={trigger.is_system}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Legend */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-500">
              Status Color Logic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0 mt-0.5"></div>
                <div>
                  <p className="font-medium text-slate-900">Green - On Track</p>
                  <p className="text-xs text-slate-500">No pending actions or due date is far away</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500 shrink-0 mt-0.5"></div>
                <div>
                  <p className="font-medium text-slate-900">Orange - Action Needed</p>
                  <p className="text-xs text-slate-500">Due date approaching within threshold</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 shrink-0 mt-0.5"></div>
                <div>
                  <p className="font-medium text-slate-900">Red - Action Overdue</p>
                  <p className="text-xs text-slate-500">Past due or within critical threshold</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TriggerLibraryPage;
