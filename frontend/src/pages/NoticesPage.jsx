import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
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
  Plus, 
  FileText, 
  Send, 
  CalendarIcon, 
  MoreVertical, 
  Edit, 
  CheckCircle2,
  DollarSign,
  Pencil,
  Clock,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const NoticesPage = ({ user }) => {
  const [notices, setNotices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [approvingNotice, setApprovingNotice] = useState(null);
  const [responseDueDate, setResponseDueDate] = useState(null);
  const [approvedAmount, setApprovedAmount] = useState("");

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    notice_type: "",
    content: "",
    recipient_email: "",
    claimed_amount: "",
    response_due_date: null,
  });

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
      const [noticesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/notices`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true }),
      ]);
      setNotices(noticesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      project_id: "",
      title: "",
      notice_type: "",
      content: "",
      recipient_email: "",
      claimed_amount: "",
    });
    setResponseDueDate(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/notices`, {
        ...formData,
        claimed_amount: formData.claimed_amount ? parseFloat(formData.claimed_amount) : null,
        response_due_date: responseDueDate ? format(responseDueDate, "yyyy-MM-dd") : null,
      }, { withCredentials: true });
      toast.success("Notice created successfully");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating notice:", error);
      toast.error("Failed to create notice");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      project_id: notice.project_id,
      title: notice.title,
      notice_type: notice.notice_type,
      content: notice.content,
      recipient_email: notice.recipient_email || "",
      claimed_amount: notice.claimed_amount?.toString() || "",
    });
    setResponseDueDate(notice.response_due_date ? parseISO(notice.response_due_date) : null);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/notices/${editingNotice.notice_id}`, {
        title: formData.title,
        notice_type: formData.notice_type,
        content: formData.content,
        recipient_email: formData.recipient_email,
        claimed_amount: formData.claimed_amount ? parseFloat(formData.claimed_amount) : null,
        response_due_date: responseDueDate ? format(responseDueDate, "yyyy-MM-dd") : null,
      }, { withCredentials: true });
      toast.success("Notice updated");
      setEditDialogOpen(false);
      setEditingNotice(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to update notice");
    }
  };

  const handleSubmit = async (noticeId) => {
    try {
      await axios.post(`${API}/notices/${noticeId}/submit`, {}, { withCredentials: true });
      toast.success("Notice submitted");
      fetchData();
    } catch (error) {
      toast.error("Failed to submit notice");
    }
  };

  const handleIssue = async (noticeId) => {
    try {
      await axios.post(`${API}/notices/${noticeId}/issue`, {}, { withCredentials: true });
      toast.success("Notice issued successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to issue notice");
    }
  };

  const handleOpenApprove = (notice) => {
    setApprovingNotice(notice);
    setApprovedAmount(notice.claimed_amount?.toString() || "");
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    try {
      await axios.post(
        `${API}/notices/${approvingNotice.notice_id}/approve?approved_amount=${parseFloat(approvedAmount) || 0}`,
        {},
        { withCredentials: true }
      );
      toast.success("Notice approved");
      setApproveDialogOpen(false);
      setApprovingNotice(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to approve notice");
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.project_id === projectId);
    return project?.name || projectId;
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft": return "bg-slate-100 text-slate-700";
      case "submitted": return "bg-blue-100 text-blue-700 border-blue-200";
      case "issued": return "bg-amber-100 text-amber-700 border-amber-200";
      case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "closed": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-700";
    }
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
      <div className="space-y-6" data-testid="notices-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Notices & Claims
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isLawyer ? "Draft, submit, and track notices and claims" : "View issued notices"}
            </p>
          </div>

          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                  data-testid="create-notice-btn"
                >
                  <Plus className="w-4 h-4 mr-2" /> Draft Notice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Draft New Notice</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project *</Label>
                    <Select
                      value={formData.project_id || undefined}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger data-testid="notice-project-select" className="rounded-sm">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        data-testid="notice-title-input"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Notice title"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notice_type">Type *</Label>
                      <Select
                        value={formData.notice_type || undefined}
                        onValueChange={(value) => setFormData({ ...formData, notice_type: value })}
                      >
                        <SelectTrigger data-testid="notice-type-select" className="rounded-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {noticeTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Claimed Amount ($)</Label>
                      <Input
                        type="number"
                        value={formData.claimed_amount}
                        onChange={(e) => setFormData({ ...formData, claimed_amount: e.target.value })}
                        placeholder="0"
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Response Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {responseDueDate ? format(responseDueDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={responseDueDate} onSelect={setResponseDueDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      data-testid="notice-content-input"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Notice content..."
                      rows={4}
                      required
                      className="rounded-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Email</Label>
                    <Input
                      id="recipient"
                      type="email"
                      value={formData.recipient_email}
                      onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                      placeholder="recipient@example.com"
                      className="rounded-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                      {creating ? "Creating..." : "Create Draft"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Total</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{notices.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Drafts</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {notices.filter(n => n.status === 'draft').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-blue-200 bg-blue-50 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">Submitted</p>
              <p className="text-2xl font-mono font-bold text-blue-700 mt-1">
                {notices.filter(n => n.status === 'submitted').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-emerald-200 bg-emerald-50 shadow-none rounded-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono">Approved</p>
              <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">
                {notices.filter(n => n.status === 'approved').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notices List */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          {notices.length === 0 ? (
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">No notices yet</p>
              {isLawyer && (
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="rounded-sm mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Create First Notice
                </Button>
              )}
            </CardContent>
          ) : (
            <div className="divide-y divide-slate-100">
              {notices.map((notice) => (
                <div key={notice.notice_id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{notice.title}</p>
                        {notice.edited_at && (
                          <Badge variant="outline" className="text-[10px] rounded-none bg-amber-50 text-amber-700 border-amber-200">
                            <Pencil className="w-3 h-3 mr-1" /> Edited {format(parseISO(notice.edited_at), "dd MMM")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-slate-500">{getProjectName(notice.project_id)}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-none">
                          {notice.notice_type}
                        </Badge>
                        <Badge className={`text-[10px] uppercase font-mono rounded-none ${getStatusBadgeClass(notice.status)}`}>
                          {notice.status}
                        </Badge>
                      </div>
                      
                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        {notice.submitted_date && (
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" /> Submitted: {format(parseISO(notice.submitted_date), "dd MMM yyyy")}
                          </span>
                        )}
                        {notice.response_due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Response due: {format(parseISO(notice.response_due_date), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Amounts */}
                    <div className="text-right shrink-0">
                      {notice.claimed_amount > 0 && (
                        <div className="flex items-center gap-1 justify-end">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          <span className="text-sm font-mono">Claimed: {formatCurrency(notice.claimed_amount)}</span>
                        </div>
                      )}
                      {notice.approved_amount > 0 && (
                        <div className="flex items-center gap-1 justify-end text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-sm font-mono">Approved: {formatCurrency(notice.approved_amount)}</span>
                        </div>
                      )}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(notice)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {notice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleSubmit(notice.notice_id)}>
                              <Send className="w-4 h-4 mr-2" /> Submit
                            </DropdownMenuItem>
                          )}
                          {notice.status === 'submitted' && (
                            <>
                              <DropdownMenuItem onClick={() => handleIssue(notice.notice_id)}>
                                <Send className="w-4 h-4 mr-2" /> Issue
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenApprove(notice)}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Approve
                              </DropdownMenuItem>
                            </>
                          )}
                          {notice.status === 'issued' && (
                            <DropdownMenuItem onClick={() => handleOpenApprove(notice)}>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Approve
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Edit Notice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.notice_type || undefined}
                    onValueChange={(value) => setFormData({ ...formData, notice_type: value })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noticeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Claimed Amount ($)</Label>
                  <Input
                    type="number"
                    value={formData.claimed_amount}
                    onChange={(e) => setFormData({ ...formData, claimed_amount: e.target.value })}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Response Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal rounded-sm">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {responseDueDate ? format(responseDueDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={responseDueDate} onSelect={setResponseDueDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="rounded-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-sm">
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Approve Notice/Claim</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {approvingNotice && (
                <div className="bg-slate-50 p-3 rounded-sm">
                  <p className="font-medium">{approvingNotice.title}</p>
                  <p className="text-sm text-slate-500">
                    Claimed: {formatCurrency(approvingNotice.claimed_amount || 0)}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Approved Amount ($) *</Label>
                <Input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder="Enter approved amount"
                  className="rounded-sm"
                />
                <p className="text-xs text-slate-500">
                  Enter the amount that has been approved for this claim
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)} className="rounded-sm">
                  Cancel
                </Button>
                <Button 
                  onClick={handleApprove} 
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                  disabled={!approvedAmount}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default NoticesPage;
