import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  CalendarClock,
  ClipboardList,
  Building2,
  Mail,
  Calendar,
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { format, parseISO } from "date-fns";

export const ProjectDetailPage = ({ user }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [notices, setNotices] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, deadlinesRes, noticesRes, questionnairesRes] = await Promise.all([
          axios.get(`${API}/projects/${projectId}`, { withCredentials: true }),
          axios.get(`${API}/deadlines?project_id=${projectId}`, { withCredentials: true }),
          axios.get(`${API}/notices?project_id=${projectId}`, { withCredentials: true }),
          axios.get(`${API}/questionnaires?project_id=${projectId}`, { withCredentials: true }),
        ]);
        setProject(projectRes.data);
        setDeadlines(deadlinesRes.data);
        setNotices(noticesRes.data);
        setQuestionnaires(questionnairesRes.data);
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout user={user}>
        <div className="text-center py-12">
          <h2 className="font-heading text-xl font-semibold text-slate-900">Project not found</h2>
          <Link to="/projects" className="text-orange-500 hover:underline mt-2 inline-block">
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6" data-testid="project-detail">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
            </Link>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
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
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono rounded-none">
                {project.contract_type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Client</p>
                  <p className="font-medium text-slate-900">{project.client_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Email</p>
                  <p className="font-medium text-slate-900 text-sm">{project.client_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Created</p>
                  <p className="font-medium text-slate-900">
                    {format(parseISO(project.created_at), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {project.description && (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="deadlines" className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-sm">
            <TabsTrigger value="deadlines" className="rounded-sm data-[state=active]:bg-white">
              <CalendarClock className="w-4 h-4 mr-2" /> Deadlines ({deadlines.length})
            </TabsTrigger>
            <TabsTrigger value="notices" className="rounded-sm data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" /> Notices ({notices.length})
            </TabsTrigger>
            <TabsTrigger value="questionnaires" className="rounded-sm data-[state=active]:bg-white">
              <ClipboardList className="w-4 h-4 mr-2" /> Questionnaires ({questionnaires.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deadlines">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Project Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {deadlines.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No deadlines set for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deadlines.map((deadline) => (
                      <div
                        key={deadline.deadline_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-deadline-${deadline.deadline_id}`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{deadline.title}</p>
                          {deadline.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{deadline.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`priority-${deadline.priority} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                          >
                            {deadline.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider font-mono rounded-none"
                          >
                            {format(parseISO(deadline.due_date), "dd MMM yyyy")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notices">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">Project Notices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notices.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No notices for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notices.map((notice) => (
                      <div
                        key={notice.notice_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-notice-${notice.notice_id}`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{notice.title}</p>
                          <p className="text-sm text-slate-500 mt-0.5 capitalize">
                            {notice.notice_type.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-${notice.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                        >
                          {notice.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questionnaires">
            <Card className="border border-slate-200 shadow-none rounded-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-heading text-lg font-semibold">
                  Project Questionnaires
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {questionnaires.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No questionnaires for this project
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {questionnaires.map((qst) => (
                      <div
                        key={qst.questionnaire_id}
                        className="px-6 py-4 flex items-center justify-between"
                        data-testid={`project-questionnaire-${qst.questionnaire_id}`}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{qst.title}</p>
                          <p className="text-sm text-slate-500 mt-0.5 capitalize">
                            {qst.category.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-${qst.status} text-[10px] uppercase tracking-wider font-mono rounded-none`}
                        >
                          {qst.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetailPage;
