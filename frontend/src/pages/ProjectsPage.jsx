import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { Plus, Search, FolderKanban, ArrowRight } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const ProjectsPage = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    client_email: "",
    contract_type: "",
    description: "",
  });

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`, { withCredentials: true });
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/projects`, formData, { withCredentials: true });
      toast.success("Project created successfully");
      setDialogOpen(false);
      setFormData({
        name: "",
        client_name: "",
        client_email: "",
        contract_type: "",
        description: "",
      });
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const contractTypes = [
    "AS4000",
    "AS4902",
    "AS2124",
    "NEC4",
    "FIDIC",
    "JCT",
    "Custom",
  ];

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
      <div className="space-y-6" data-testid="projects-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Projects
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isLawyer ? "Manage all contract administration matters" : "Your assigned projects"}
            </p>
          </div>

          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                  data-testid="create-project-btn"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      data-testid="project-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Melbourne Tower Development"
                      required
                      className="rounded-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Client Name</Label>
                      <Input
                        id="client_name"
                        data-testid="client-name-input"
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        placeholder="Client company name"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_email">Client Email</Label>
                      <Input
                        id="client_email"
                        type="email"
                        data-testid="client-email-input"
                        value={formData.client_email}
                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                        placeholder="client@company.com"
                        required
                        className="rounded-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_type">Contract Type</Label>
                    <Select
                      value={formData.contract_type}
                      onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                    >
                      <SelectTrigger data-testid="contract-type-select" className="rounded-sm">
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      data-testid="project-description-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief project description..."
                      rows={3}
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
                      disabled={creating}
                      data-testid="submit-project-btn"
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                    >
                      {creating ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-sm"
            data-testid="search-projects"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-12 text-center">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No projects found</h3>
              <p className="text-slate-500 text-sm">
                {isLawyer ? "Create your first project to get started" : "No projects assigned yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Link
                key={project.project_id}
                to={`/projects/${project.project_id}`}
                data-testid={`project-card-${project.project_id}`}
              >
                <Card className="border border-slate-200 shadow-none rounded-sm hover:border-slate-300 transition-colors h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
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
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="font-heading font-semibold text-slate-900 mb-1 line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">{project.client_name}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{project.contract_type}</span>
                      <span>{format(parseISO(project.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectsPage;
