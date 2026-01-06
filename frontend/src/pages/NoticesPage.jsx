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
import { Plus, FileText, Send } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const NoticesPage = ({ user }) => {
  const [notices, setNotices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    notice_type: "",
    content: "",
    recipient_email: "",
  });

  const noticeTypes = [
    { value: "variation", label: "Variation" },
    { value: "delay", label: "Delay" },
    { value: "latent_condition", label: "Latent Condition" },
    { value: "design_issue", label: "Design Issue" },
    { value: "contamination", label: "Contamination" },
    { value: "general", label: "General" },
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/notices`, formData, { withCredentials: true });
      toast.success("Notice created successfully");
      setDialogOpen(false);
      setFormData({
        project_id: "",
        title: "",
        notice_type: "",
        content: "",
        recipient_email: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error creating notice:", error);
      toast.error("Failed to create notice");
    } finally {
      setCreating(false);
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

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.project_id === projectId);
    return project?.name || projectId;
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
              Notices
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isLawyer ? "Draft and issue contract notices" : "View issued notices"}
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
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={formData.project_id}
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
                      <Label htmlFor="title">Title</Label>
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
                      <Label htmlFor="notice_type">Type</Label>
                      <Select
                        value={formData.notice_type}
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

                  <div className="space-y-2">
                    <Label htmlFor="recipient_email">Recipient Email (Optional)</Label>
                    <Input
                      id="recipient_email"
                      type="email"
                      data-testid="notice-recipient-input"
                      value={formData.recipient_email}
                      onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                      placeholder="recipient@company.com"
                      className="rounded-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      data-testid="notice-content-input"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Notice content..."
                      rows={5}
                      required
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
                      disabled={creating || !formData.project_id || !formData.notice_type}
                      data-testid="submit-notice-btn"
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                    >
                      {creating ? "Creating..." : "Save as Draft"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Notices List */}
        {notices.length === 0 ? (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No notices</h3>
              <p className="text-slate-500 text-sm">
                {isLawyer ? "Draft your first notice to get started" : "No notices to display"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {notices.map((notice) => (
                  <div
                    key={notice.notice_id}
                    className="px-6 py-4"
                    data-testid={`notice-item-${notice.notice_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-slate-900">{notice.title}</h3>
                          <Badge
                            variant="outline"
                            className={`status-${notice.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                          >
                            {notice.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider font-mono rounded-none capitalize"
                          >
                            {notice.notice_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {getProjectName(notice.project_id)}
                        </p>
                        <p className="text-sm text-slate-600 line-clamp-2">{notice.content}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                          <span>Created: {format(parseISO(notice.created_at), "dd MMM yyyy")}</span>
                          {notice.issued_at && (
                            <span>Issued: {format(parseISO(notice.issued_at), "dd MMM yyyy")}</span>
                          )}
                        </div>
                      </div>

                      {isLawyer && notice.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIssue(notice.notice_id)}
                          data-testid={`issue-notice-${notice.notice_id}`}
                          className="rounded-sm ml-4"
                        >
                          <Send className="w-3 h-3 mr-2" /> Issue
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default NoticesPage;
