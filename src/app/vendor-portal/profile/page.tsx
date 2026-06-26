"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVendorProfile, updateVendorContact } from "./actions";

// ============================================================
// TYPES
// ============================================================

interface VendorProfile {
  id: string;
  name: string;
  code: string;
  legalName: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  contactPerson: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  bankName: string | null;
  msmeStatus: string | null;
  certifications: string | null;
  registrationStatus: string;
  rating: number;
}

// ============================================================
// PAGE
// ============================================================

export default function VendorProfilePage() {
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  // Editable fields
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getVendorProfile();
        setProfile(data as unknown as VendorProfile);
        setContactPerson(data.contactPerson);
        setEmail(data.email);
        setPhone(data.phone);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load profile"
        );
      }
    });
  }, []);

  async function handleSave() {
    try {
      await updateVendorContact({
        contactPerson,
        email,
        phone,
      });
      toast.success("Contact information updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update"
      );
    }
  }

  if (!profile && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Profile not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Profile"
        description="Your company information"
      />

      {/* Company Information (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Company Name</Label>
              <p className="mt-1 text-sm font-medium">{profile.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Vendor Code</Label>
              <p className="mt-1 text-sm font-medium">{profile.code}</p>
            </div>
            {profile.legalName && (
              <div>
                <Label className="text-muted-foreground">Legal Name</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.legalName}
                </p>
              </div>
            )}
            {profile.gstNumber && (
              <div>
                <Label className="text-muted-foreground">GST Number</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.gstNumber}
                </p>
              </div>
            )}
            {profile.panNumber && (
              <div>
                <Label className="text-muted-foreground">PAN Number</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.panNumber}
                </p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">
                Registration Status
              </Label>
              <p className="mt-1 text-sm font-medium">
                {profile.registrationStatus}
              </p>
            </div>
            {profile.rating > 0 && (
              <div>
                <Label className="text-muted-foreground">Rating</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.rating.toFixed(1)} / 5
                </p>
              </div>
            )}
            {profile.address && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">Address</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.address}
                  {profile.city && `, ${profile.city}`}
                  {profile.state && `, ${profile.state}`}
                  {profile.pincode && ` - ${profile.pincode}`}
                </p>
              </div>
            )}
            {profile.msmeStatus && (
              <div>
                <Label className="text-muted-foreground">MSME Status</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.msmeStatus}
                </p>
              </div>
            )}
            {profile.bankName && (
              <div>
                <Label className="text-muted-foreground">Bank Name</Label>
                <p className="mt-1 text-sm font-medium">
                  {profile.bankName}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
