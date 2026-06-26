"use client";

import * as React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { changeOwnPassword } from "@/actions/user.actions";

// ============================================================
// PAGE
// ============================================================

export default function ProfilePage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!session?.user) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your profile and change password"
      />

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{session.user.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{session.user.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <div className="mt-1">
                <Badge variant="outline">{session.user.role}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Warehouse</Label>
              <p className="text-sm font-medium">
                {session.user.warehouseId || "Not assigned"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            <div>
              <Label>Current Password *</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label>Confirm New Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="mt-1.5"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
