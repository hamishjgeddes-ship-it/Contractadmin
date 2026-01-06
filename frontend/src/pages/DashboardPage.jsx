import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { 
  FolderKanban, 
  CalendarClock, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  Clock
} from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

export const DashboardPage = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getDeadlineUrgency = (dueDate) => {
    const due = parseISO(dueDate);
    const now = new Date();
    if (isBefore(due, now)) return "overdue";
    if (isBefore(due, addDays(now, 3))) return "urgent";
    if (isBefore(due, addDays(now, 7))) return "soon";
    return "normal";
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
      <div className="space-y-8" data-testid="dashboard">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
            {isLawyer ? "Operations Dashboard" : "Your Projects"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLawyer 
              ? "Contract administration overview and pending actions" 
              : "View your project status and documents"
            }
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Active Projects
                  </p>
                  <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter mt-2">
                    {stats?.active_projects || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                of {stats?.total_projects || 0} total
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Pending Deadlines
                  </p>
                  <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter mt-2">
                    {stats?.pending_deadlines || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                requiring attention
              </p>
            </CardContent>
          </Card>

          {isLawyer && (
            <>
              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Draft Notices
                      </p>
                      <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter mt-2">
                        {stats?.draft_notices || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    ready to issue
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-none rounded-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Issued Notices
                      </p>
                      <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter mt-2">
                        {stats?.issued_notices || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    awaiting response
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {!isLawyer && (
            <Card className="border border-slate-200 shadow-none rounded-sm col-span-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      Notices Issued
                    </p>
                    <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter mt-2">
                      {stats?.issued_notices || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  on your projects
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          <CardHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg font-semibold">
                Upcoming Deadlines
              </CardTitle>
              <Link to="/deadlines">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="view-all-deadlines">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.upcoming_deadlines?.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats?.upcoming_deadlines?.map((deadline) => {
                  const urgency = getDeadlineUrgency(deadline.due_date);
                  return (
                    <div
                      key={deadline.deadline_id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                      data-testid={`deadline-${deadline.deadline_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-2 h-2 rounded-full
                          ${urgency === "overdue" ? "bg-red-500" : ""}
                          ${urgency === "urgent" ? "bg-orange-500" : ""}
                          ${urgency === "soon" ? "bg-amber-500" : ""}
                          ${urgency === "normal" ? "bg-slate-300" : ""}
                        `} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{deadline.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Project: {deadline.project_id}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions for Lawyers */}
        {isLawyer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/projects" data-testid="quick-new-project">
              <Card className="border border-slate-200 shadow-none rounded-sm hover:border-slate-300 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                    <FolderKanban className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">New Project</p>
                    <p className="text-xs text-slate-500">Set up a new matter</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/notices" data-testid="quick-new-notice">
              <Card className="border border-slate-200 shadow-none rounded-sm hover:border-slate-300 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                    <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Draft Notice</p>
                    <p className="text-xs text-slate-500">Create contract notice</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/deadlines" data-testid="quick-new-deadline">
              <Card className="border border-slate-200 shadow-none rounded-sm hover:border-slate-300 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                    <CalendarClock className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Add Deadline</p>
                    <p className="text-xs text-slate-500">Track key dates</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
