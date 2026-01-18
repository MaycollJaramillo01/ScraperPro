"use client";

import * as React from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Check, X, Loader2, AlertCircle } from "lucide-react";

interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  approved: boolean;
  created_at: string;
}

interface LoginRequest {
  id: string;
  email: string;
  requestedAt: string;
  ipAddress?: string;
  status: "pending" | "approved" | "rejected";
}

export default function AdminPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loginRequests, setLoginRequests] = React.useState<LoginRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creatingUser, setCreatingUser] = React.useState(false);
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<"admin" | "user">("user");

  const fetchUsers = React.useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch("/api/auth/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchLoginRequests = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/login-requests");
      if (response.ok) {
        const data = await response.json();
        setLoginRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching login requests:", error);
    }
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchLoginRequests()]);
      setLoading(false);
    };

    loadData();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchLoginRequests]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("No hay sesión activa");
        return;
      }

      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Usuario creado exitosamente");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("user");
        fetchUsers();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al crear usuario");
      console.error(error);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleApproveUser = async (userId: string, requestId?: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch("/api/auth/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, requestId }),
      });

      if (response.ok) {
        await Promise.all([fetchUsers(), fetchLoginRequests()]);
      } else {
        alert("Error al aprobar usuario");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      alert("Error al aprobar usuario");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Administración
        </p>
        <h1 className="text-2xl font-semibold text-white">Panel de Control</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona usuarios y aprueba solicitudes de acceso
        </p>
      </div>

      {/* Create User Form */}
      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nuevo Usuario
          </CardTitle>
          <CardDescription>
            Crea un nuevo usuario en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={newUserRole}
                  onValueChange={(value) => setNewUserRole(value as "admin" | "user")}
                >
                  <SelectTrigger className="bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={creatingUser}>
              {creatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Usuario
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Login Requests */}
      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            Solicitudes de Acceso Pendientes
          </CardTitle>
          <CardDescription>
            Aprueba o rechaza solicitudes de acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : loginRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay solicitudes pendientes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginRequests.map((request) => {
                  const user = users.find((u) => u.email === request.email);
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.email}</TableCell>
                      <TableCell>
                        {new Date(request.requestedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.ipAddress || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {request.status === "pending"
                            ? "Pendiente"
                            : request.status === "approved"
                            ? "Aprobado"
                            : "Rechazado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === "pending" && user && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(user.id, request.id)}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Aprobar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white">Usuarios del Sistema</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay usuarios registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                      >
                        {user.role === "admin" ? "Administrador" : "Usuario"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.approved ? "default" : "secondary"}
                      >
                        {user.approved ? "Aprobado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!user.approved && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user.id)}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Aprobar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

