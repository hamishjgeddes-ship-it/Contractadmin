import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const QuestionnairesPage = ({ user }) => {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    category: "",
    questions: [],
  });

  const [newQuestion, setNewQuestion] = useState("");

  const categories = [
    { value: "latent_conditions", label: "Latent Conditions" },
    { value: "variations", label: "Variations" },
    { value: "delays", label: "Delays" },
    { value: "design_issues", label: "Design Issues" },
    { value: "contamination", label: "Contamination" },
  ];

  const fetchData = async () => {
    try {
      const [questionnairesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/questionnaires`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true }),
      ]);
      setQuestionnaires(questionnairesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load questionnaires");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({
        ...formData,
        questions: [...formData.questions, { id: Date.now(), text: newQuestion.trim(), type: "text" }],
      });
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (id) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== id),
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/questionnaires`, formData, { withCredentials: true });
      toast.success("Questionnaire created successfully");
      setDialogOpen(false);
      setFormData({
        project_id: "",
        title: "",
        category: "",
        questions: [],
      });
      fetchData();
    } catch (error) {
      console.error("Error creating questionnaire:", error);
      toast.error("Failed to create questionnaire");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (questionnaireId) => {
    try {
      await axios.patch(
        `${API}/questionnaires/${questionnaireId}`,
        { status: "active" },
        { withCredentials: true }
      );
      toast.success("Questionnaire activated");
      fetchData();
    } catch (error) {
      toast.error("Failed to activate questionnaire");
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
      <div className="space-y-6" data-testid="questionnaires-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Questionnaires
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isLawyer ? "Create and manage digital questionnaires" : "Complete assigned questionnaires"}
            </p>
          </div>

          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                  data-testid="create-questionnaire-btn"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Questionnaire
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Create Questionnaire</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger data-testid="questionnaire-project-select" className="rounded-sm">
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
                        data-testid="questionnaire-title-input"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Questionnaire title"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger data-testid="questionnaire-category-select" className="rounded-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Questions Builder */}
                  <div className="space-y-2">
                    <Label>Questions</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter a question..."
                        className="rounded-sm"
                        data-testid="questionnaire-new-question-input"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddQuestion())}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddQuestion}
                        className="rounded-sm"
                        data-testid="add-question-btn"
                      >
                        Add
                      </Button>
                    </div>
                    {formData.questions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.questions.map((q, index) => (
                          <div
                            key={q.id}
                            className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-sm text-sm"
                          >
                            <span>
                              <span className="font-mono text-slate-400 mr-2">{index + 1}.</span>
                              {q.text}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      disabled={creating || !formData.project_id || !formData.category}
                      data-testid="submit-questionnaire-btn"
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                    >
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Questionnaires List */}
        {questionnaires.length === 0 ? (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No questionnaires</h3>
              <p className="text-slate-500 text-sm">
                {isLawyer ? "Create your first questionnaire" : "No questionnaires assigned"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionnaires.map((qst) => (
              <Card
                key={qst.questionnaire_id}
                className="border border-slate-200 shadow-none rounded-sm"
                data-testid={`questionnaire-card-${qst.questionnaire_id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge
                      variant="outline"
                      className={`status-${qst.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                    >
                      {qst.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider font-mono rounded-none capitalize"
                    >
                      {qst.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="font-heading font-semibold text-slate-900 mb-1">{qst.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{getProjectName(qst.project_id)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {qst.questions?.length || 0} questions
                    </span>
                    {isLawyer && qst.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(qst.questionnaire_id)}
                        data-testid={`activate-questionnaire-${qst.questionnaire_id}`}
                        className="rounded-sm text-xs"
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Created: {format(parseISO(qst.created_at), "dd MMM yyyy")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default QuestionnairesPage;
