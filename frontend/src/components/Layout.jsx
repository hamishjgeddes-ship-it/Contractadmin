import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FolderKanban, 
  CalendarClock, 
  FileText, 
  ClipboardList,
  Users,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  FolderOpen,
  Plug
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import axios from "axios";
import { API } from "../App";

export const Layout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { path: "/projects", label: "Projects", icon: FolderKanban, show: true },
    { path: "/deadlines", label: "Deadlines", icon: CalendarClock, show: true },
    { path: "/notices", label: "Notices", icon: FileText, show: true },
    { path: "/documents", label: "Documents", icon: FolderOpen, show: true },
    { path: "/questionnaires", label: "Questionnaires", icon: ClipboardList, show: true },
    { path: "/integrations", label: "Integrations", icon: Plug, show: isLawyer },
    { path: "/users", label: "Users", icon: Users, show: isLawyer },
  ].filter(item => item.show);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    navigate("/login", { replace: true });
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, { withCredentials: true });
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 flex items-center justify-center">
                <span className="font-heading font-bold text-white text-sm">B</span>
              </div>
              <div>
                <span className="font-heading font-bold text-white text-sm tracking-tight block">Build Compliance</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Contract Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium
                        transition-colors duration-150
                        ${isActive 
                          ? "bg-orange-500 text-white" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                <p className="text-slate-400 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-[10px] uppercase tracking-wider border-slate-700 text-slate-400"
              >
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Portal</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="font-medium text-slate-900 capitalize">
                  {location.pathname.split("/")[1] || "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    data-testid="notifications-btn"
                  >
                    <Bell className="w-4 h-4" strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-3 border-b">
                    <h4 className="font-heading font-semibold text-sm">Notifications</h4>
                  </div>
                  <ScrollArea className="h-64">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <DropdownMenuItem
                          key={notif.notification_id}
                          className={`p-3 cursor-pointer ${!notif.is_read ? "bg-slate-50" : ""}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
