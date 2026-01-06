import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { Users, Shield } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const UsersPage = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLawyer) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isLawyer]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.patch(
        `${API}/users/${userId}/role?role=${newRole}`,
        {},
        { withCredentials: true }
      );
      toast.success("Role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error.response?.data?.detail || "Failed to update role");
    }
  };

  if (!isLawyer) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-slate-900 mb-2">Access Restricted</h3>
            <p className="text-slate-500 text-sm">You don't have permission to view this page</p>
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
      <div className="space-y-6" data-testid="users-page">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage user roles and permissions
          </p>
        </div>

        {/* Users Table */}
        <Card className="border border-slate-200 shadow-none rounded-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> All Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No users found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">User</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Email</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Role</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Joined</TableHead>
                    {isAdmin && (
                      <TableHead className="font-mono text-xs uppercase tracking-wider">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                              <span className="text-slate-600 text-xs font-medium">
                                {u.name?.charAt(0) || "U"}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-slate-900">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            text-[10px] uppercase tracking-wider font-mono rounded-none
                            ${u.role === "admin" ? "border-orange-200 text-orange-700 bg-orange-50" : ""}
                            ${u.role === "lawyer" ? "border-blue-200 text-blue-700 bg-blue-50" : ""}
                            ${u.role === "client" ? "border-slate-200 text-slate-600" : ""}
                          `}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {u.created_at ? format(parseISO(u.created_at), "dd MMM yyyy") : "N/A"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {u.user_id !== user.user_id ? (
                            <Select
                              value={u.role}
                              onValueChange={(value) => handleRoleChange(u.user_id, value)}
                            >
                              <SelectTrigger
                                className="w-28 h-8 rounded-sm text-xs"
                                data-testid={`role-select-${u.user_id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="lawyer">Lawyer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-slate-400">Current user</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <Badge variant="outline" className="border-slate-200 text-slate-600 mb-2 rounded-none text-[10px] uppercase tracking-wider font-mono">
                Client
              </Badge>
              <p className="text-sm text-slate-600">
                Read-only access. Can view their assigned projects, notices, and deadlines.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 mb-2 rounded-none text-[10px] uppercase tracking-wider font-mono">
                Lawyer
              </Badge>
              <p className="text-sm text-slate-600">
                Full operational access. Can create projects, notices, deadlines, and questionnaires.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-4">
              <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 mb-2 rounded-none text-[10px] uppercase tracking-wider font-mono">
                Admin
              </Badge>
              <p className="text-sm text-slate-600">
                Full access including user management and role assignments.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;
