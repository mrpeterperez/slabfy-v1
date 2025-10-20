/*
 * This file contains the second step of the onboarding process - choose a username.
 * Exports: OnboardingStep2 component
 * Feature: onboarding
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingStep2() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      setLocation("/signin");
      return;
    }
    // If onboarding is already complete, go to dashboard
    if (user.onboardingComplete === "true") {
      setLocation("/dashboard");
      return;
    }
    // If username already exists, skip to step3
    if (user.username) {
      setLocation("/onboarding/step3");
      return;
    }
    setUsername(user.username || "");
  }, [user, setLocation]);

  const checkAvailability = async (name: string) => {
    if (!name.trim()) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/username/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name.trim() }),
      });
      if (!res.ok) throw new Error("check failed");
      const data = await res.json();
      setAvailable(!!data.available);
    } catch {
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const onChange = (val: string) => {
    setUsername(val);
    setAvailable(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => checkAvailability(val), 400);
  };

  const saveAndContinue = async () => {
    if (!user) return;
    const name = username.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/user/${user.id}/username`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to update username");
      }
      await refreshUser(user.id);
      toast({ title: "Username set", description: `@${name} reserved` });
      setLocation("/onboarding/step3");
    } catch (e: any) {
      toast({ title: "Couldn't save username", description: e.message || "Try again", variant: "destructive" });
    }
  };

  const canContinue = !!username.trim() && available === true && !checking;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-8">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold">Pick a username</h1>
          <p className="text-muted-foreground mt-2">This will be your public handle.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="username">Username</label>
            <Input
              id="username"
              placeholder="e.g. slabking"
              value={username}
              onChange={(e) => onChange(e.target.value)}
            />
            <p className="text-xs mt-2">
              {checking && <span className="text-muted-foreground">Checking availability…</span>}
              {!checking && available === true && <span className="text-green-600">✓ Available</span>}
              {!checking && available === false && <span className="text-red-600">✗ Taken</span>}
            </p>
          </div>

          <Button className="w-full" disabled={!canContinue} onClick={saveAndContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}