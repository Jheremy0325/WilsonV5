import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users as UsersIcon, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  user_roles: Array<{ role: string }>;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("full_name");

    if (data) setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    // Delete existing role
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Insert new role
    const { error } = await supabase
      .from("user_roles")
      .insert([{ user_id: userId, role: newRole }]);

    if (error) {
      toast.error("Error al cambiar el rol");
    } else {
      toast.success("Rol actualizado");
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">Gestiona los usuarios del sistema</p>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => {
          const userRole = user.user_roles[0]?.role || "user";
          const isCurrentUser = user.id === currentUserId;

          return (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{user.full_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                  <UsersIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={userRole === "admin" ? "default" : "secondary"}>
                    {userRole === "admin" ? "Administrador" : "Usuario"}
                  </Badge>
                  {isCurrentUser && (
                    <Badge variant="outline">Tú</Badge>
                  )}
                </div>
                {!isCurrentUser && (
                  <Select
                    value={userRole}
                    onValueChange={(value: "admin" | "user") => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay usuarios</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Users;
