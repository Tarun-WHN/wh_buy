"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getVendor,
  updateVendor,
  approveVendor,
  rejectVendor,
  addVendorCategory,
  removeVendorCategory,
} from "@/actions/vendor.actions";
import { getCategories } from "@/actions/product.actions";

// ============================================================
// TYPES
// ============================================================

interface VendorData {
  id: string;
  name: string;
  code: string;
  legalName: string | null;
  contactPerson: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  cinNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  msmeStatus: string | null;
  certifications: string | null;
  registrationStatus: string;
  rating: number;
  vendorCategories: { id: string; categoryId: string; category: { id: string; name: string } }[];
  vendorProducts: { id: string; product: { id: string; name: string; sku: string } }[];
}

// ============================================================
// PAGE
// ============================================================

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [allCategories, setAllCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [newCategoryId, setNewCategoryId] = useState("");

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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    startTransition(async () => {
      try {
        const [vendorData, cats] = await Promise.all([
          getVendor(id),
          getCategories(),
        ]);
        const v = vendorData as unknown as VendorData;
        setVendor(v);
        setAllCategories(cats.map((c) => ({ id: c.id, name: c.name })));

        // Populate form
        setName(v.name);
        setCode(v.code);
        setLegalName(v.legalName || "");
        setContactPerson(v.contactPerson);
        setEmail(v.email);
        setPhone(v.phone);
        setAddress(v.address || "");
        setCity(v.city || "");
        setState(v.state || "");
        setPincode(v.pincode || "");
        setGstNumber(v.gstNumber || "");
        setPanNumber(v.panNumber || "");
        setCinNumber(v.cinNumber || "");
        setBankName(v.bankName || "");
        setBankAccountNumber(v.bankAccountNumber || "");
        setBankIfsc(v.bankIfsc || "");
        setPaymentTerms(v.paymentTerms || "");
        setLeadTimeDays(v.leadTimeDays?.toString() || "");
        setMsmeStatus(v.msmeStatus || "");
        setCertifications(v.certifications || "");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load vendor"
        );
      }
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateVendor(id, {
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
      });
      toast.success("Vendor updated successfully");
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update vendor"
      );
    }
  }

  async function handleApprove() {
    try {
      await approveVendor(id);
      toast.success("Vendor approved");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function handleReject() {
    try {
      await rejectVendor(id);
      toast.success("Vendor rejected");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  async function handleAddCategory() {
    if (!newCategoryId) return;
    try {
      await addVendorCategory(id, newCategoryId);
      toast.success("Category added");
      setNewCategoryId("");
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add category"
      );
    }
  }

  async function handleRemoveCategory(categoryId: string) {
    try {
      await removeVendorCategory(id, categoryId);
      toast.success("Category removed");
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove category"
      );
    }
  }

  if (!vendor && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading vendor...
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Vendor not found
      </div>
    );
  }

  const linkedCategoryIds = vendor.vendorCategories.map(
    (vc) => vc.categoryId
  );
  const availableCategories = allCategories.filter(
    (c) => !linkedCategoryIds.includes(c.id)
  );
  const isPendingApproval =
    vendor.registrationStatus === "PENDING" ||
    vendor.registrationStatus === "UNDER_REVIEW";

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.name}
        description={`Code: ${vendor.code}`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={vendor.registrationStatus} />
          {isPendingApproval && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={handleApprove}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleReject}
              >
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" render={<Link href="/masters/vendors" />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* DETAILS TAB */}
        {/* ============================================================ */}
        <TabsContent value="details">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Legal Name</Label>
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Code</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
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
                  <Label>Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>State</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pincode</Label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tax */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>GST Number</Label>
                  <Input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>CIN Number</Label>
                  <Input
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bank */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Account Number</Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Payment Terms</Label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Lead Time (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>MSME Status</Label>
                  <Input
                    value={msmeStatus}
                    onChange={(e) => setMsmeStatus(e.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-3">
                  <Label>Certifications</Label>
                  <Textarea
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" render={<Link href="/masters/vendors" />}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ============================================================ */}
        {/* CATEGORIES TAB */}
        {/* ============================================================ */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Category */}
              <div className="flex items-end gap-3">
                <div className="grid gap-2 flex-1 max-w-xs">
                  <Label>Add Category</Label>
                  <Select
                    value={newCategoryId}
                    onValueChange={(val) => setNewCategoryId(val ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {(value) => {
                          const cat = allCategories.find((c) => c.id === value);
                          return cat ? cat.name : "Select category";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={!newCategoryId}
                  size="sm"
                >
                  <Plus className="mr-1 size-3.5" />
                  Add
                </Button>
              </div>

              {/* Category List */}
              {vendor.vendorCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No categories linked yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {vendor.vendorCategories.map((vc) => (
                    <Badge
                      key={vc.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {vc.category.name}
                      <button
                        onClick={() => handleRemoveCategory(vc.categoryId)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* PRODUCTS TAB (PLACEHOLDER) */}
        {/* ============================================================ */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor Products</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.vendorProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No products linked to this vendor yet. Products will appear
                  here once purchase orders are created.
                </p>
              ) : (
                <div className="divide-y">
                  {vendor.vendorProducts.map((vp) => (
                    <div key={vp.id} className="flex items-center gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {vp.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {vp.product.sku}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* DOCUMENTS TAB (PLACEHOLDER) */}
        {/* ============================================================ */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">
                Document management will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* PERFORMANCE TAB (PLACEHOLDER) */}
        {/* ============================================================ */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Performance Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">
                Vendor performance scorecard will be available once delivery and
                quality data is collected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
