import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Plug, Mail, MessageSquare, Video, Calendar, Webhook, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { API } from "../App";

export const IntegrationsPage = ({ user }) => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await axios.get(`${API}/integrations/available`, { withCredentials: true });
        setIntegrations(response.data.integrations);
      } catch (error) {
        console.error("Error fetching integrations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  const getIcon = (id) => {
    switch (id) {
      case "email": return <Mail className="w-5 h-5" />;
      case "teams": return <MessageSquare className="w-5 h-5" />;
      case "zoom": return <Video className="w-5 h-5" />;
      case "calendar": return <Calendar className="w-5 h-5" />;
      case "webhook": return <Webhook className="w-5 h-5" />;
      default: return <Plug className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "ready": return "bg-blue-100 text-blue-700 border-blue-200";
      case "planned": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (!isLawyer) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Plug className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-slate-900 mb-2">Access Restricted</h3>
            <p className="text-slate-500 text-sm">Integrations are managed by administrators</p>
          </div>
        </div>
      </Layout>
    );
  }

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
      <div className="space-y-6" data-testid="integrations-page">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
            API Integrations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Connect your portal with external services
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card 
              key={integration.id} 
              className="border border-slate-200 shadow-none rounded-sm"
              data-testid={`integration-${integration.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    w-10 h-10 flex items-center justify-center rounded-sm
                    ${integration.status === "available" || integration.status === "ready" 
                      ? "bg-slate-900 text-white" 
                      : "bg-slate-100 text-slate-400"
                    }
                  `}>
                    {getIcon(integration.id)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider font-mono rounded-none ${getStatusColor(integration.status)}`}
                  >
                    {integration.status}
                  </Badge>
                </div>

                <h3 className="font-heading font-semibold text-slate-900 mb-1">
                  {integration.name}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {integration.description}
                </p>

                {/* Config Requirements */}
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                    Required Config
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {integration.config_required.map((config) => (
                      <span
                        key={config}
                        className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm"
                      >
                        {config}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Toggle for available integrations */}
                {(integration.status === "available" || integration.status === "ready") && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <Label className="text-sm text-slate-600">Enable Integration</Label>
                    <Switch disabled />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Documentation Card */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="font-heading text-lg font-semibold">API Access</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-2">REST API</h4>
                <p className="text-sm text-slate-500 mb-3">
                  Full REST API available for custom integrations. 
                  Supports all portal operations including projects, deadlines, notices, and documents.
                </p>
                <div className="bg-slate-900 rounded-sm p-3 font-mono text-xs text-slate-300">
                  <span className="text-emerald-400">GET</span> /api/projects<br/>
                  <span className="text-blue-400">POST</span> /api/notices<br/>
                  <span className="text-amber-400">PATCH</span> /api/deadlines/:id
                </div>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Webhook Events</h4>
                <p className="text-sm text-slate-500 mb-3">
                  Receive real-time notifications for portal events.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Deadline reminders (7, 3, 1 day)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Notice issued/responded
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Escalation alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Assistance requests
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default IntegrationsPage;
