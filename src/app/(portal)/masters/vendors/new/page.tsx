"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createVendor } from "@/actions/vendor.actions";
import { getCategories } from "@/actions/product.actions";

// ============================================================
// PAGE
// ============================================================

export default function NewVendorPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [msmeStatus, setMsmeStatus] = useState("");
  const [certifications, setCertifications] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const cats = await getCategories();
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      } catch {
        // silent
      }
    });
  }, []);

  function toggleCategory(categoryId: string) {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !code || !contactPerson || !email || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createVendor({
        name,
        code,
        legalName: legalName || undefined,
        contactPerson,
        email,
        phone,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        gstNumber: gstNumber || undefined,
        panNumber: panNumber || undefined,
        cinNumber: cinNumber || undefined,
        bankName: bankName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankIfsc: bankIfsc || undefined,
        paymentTerms: paymentTerms || undefined,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
        msmeStatus: msmeStatus || undefined,
        certifications: certifications || undefined,
        categoryIds:
          selectedCategories.length > 0 ? selectedCategories : undefined,
      });
      toast.success("Vendor created successfully");
      router.push("/masters/vendors");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create vendor"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Vendor"
        description="Register a new vendor"
      >
        <Button variant="outline" render={<Link href="/masters/vendors" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Vendors
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vendor name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Legal entity name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Vendor code"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="contactPerson">
                Contact Person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cinNumber">CIN Number</Label>
              <Input
                id="cinNumber"
                value={cinNumber}
                onChange={(e) => setCinNumber(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankIfsc">IFSC Code</Label>
              <Input
                id="bankIfsc"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msmeStatus">MSME Status</Label>
              <Input
                id="msmeStatus"
                value={msmeStatus}
                onChange={(e) => setMsmeStatus(e.target.value)}
                placeholder="e.g. Micro, Small, Medium"
              />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <Label htmlFor="certifications">Certifications</Label>
              <Textarea
                id="certifications"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="ISO, BIS, etc."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categories Supported</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories available. Create categories in Product Master
                first.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" render={<Link href="/masters/vendors" />}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
