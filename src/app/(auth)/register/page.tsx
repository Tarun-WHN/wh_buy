"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { registerVendor } from "@/actions/auth.actions";

// ============================================================
// REGISTRATION FORM
// ============================================================

function RegistrationForm() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await registerVendor({
        companyName,
        legalName,
        contactPerson,
        email,
        phone,
        password,
        gstNumber,
        panNumber,
        address,
        city,
        state,
        pincode,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Registration Successful!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your vendor registration has been submitted. You will be redirected
            to the login page shortly. Your account will be reviewed by our team.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-[#F47B20] hover:underline"
          >
            Go to Login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Vendor Registration</CardTitle>
        <CardDescription>
          Register your company to start receiving procurement opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Legal entity name"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactPerson">Contact Person *</Label>
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          {/* Tax Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="GST number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="panNumber">PAN</Label>
              <Input
                id="panNumber"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="PAN number"
              />
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Pincode"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F47B20] text-white hover:bg-[#E06A10]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Register"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#F47B20] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RegistrationForm />
    </Suspense>
  );
}
