import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/estate/site-chrome";
import { Notice } from "@/components/estate/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setStaff } from "@/lib/estate/staff-session";
import { api, ApiError } from "@/services/api";

export function SignInForm({ role }: { role: "staff" | "gm" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => api.signIn(email, password, role),
    onSuccess: (u) => { setStaff(u); navigate({ to: role === "gm" ? "/gm" : "/staff/inbox" }); },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 0) { setErr("Can't connect to the EstateFlow API. Check that the backend is running on port 4000 and that its CORS_ORIGIN allows this browser address."); return; }
        if (error.status === 401) { setErr("Incorrect email or password. If this is an older local demo database, run npm run demo:accounts -- --reset in the backend."); return; }
        if (error.status === 403) { setErr(error.message); return; }
        if (error.status === 429) { setErr("Too many login attempts. Please try again after the rate limit resets."); return; }
        setErr(`Sign-in failed: ${error.message}`); return;
      }
      setErr("Unable to sign in. Check the browser's Network tab for details.");
    },
  });
  const gm = role === "gm";

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form noValidate className="panel w-full max-w-sm space-y-5 p-8 shadow-soft" onSubmit={(e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email) || !password) { setErr("Enter your work email and password."); return; }
        setErr(null); m.mutate();
      }}>
        <Logo />
        <div><h1 className="text-2xl font-light">{gm ? "General Manager sign-in" : "Staff sign-in"}</h1><p className="text-sm text-muted-foreground">{gm ? "Approvals and escalations." : "Estate team access only."}</p></div>
        {err && <Notice tone="danger" title={err} />}
        <div className="space-y-1.5"><Label htmlFor="em">Work email</Label><Input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" /></div>
        <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Signing in…" : "Sign in"}</Button>
        <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Use the local demo accounts described in backend deployment.md. Do not publish demo credentials with a deployed application.</p>
        <Button asChild variant="link" className="h-auto w-full p-0 text-xs">
          <Link to={gm ? "/staff/login" : "/gm/login"}>{gm ? "Staff sign-in" : "General Manager sign-in"}</Link>
        </Button>
      </form>
    </div>
  );
}
