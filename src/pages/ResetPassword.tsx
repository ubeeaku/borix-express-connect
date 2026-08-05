import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setReady(true);
    });

    const consumeLink = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // 1) Error returned by Supabase in the link itself
      const errDesc = url.searchParams.get("error_description") || hash.get("error_description");
      if (errDesc) {
        setLinkError(errDesc);
        return;
      }

      // 2) Existing / auto-detected session (implicit flow: #access_token=...)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }

      // 3) PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setLinkError(error.message);
        else setReady(true);
        return;
      }

      // 4) Token hash flow: ?token_hash=...&type=recovery (or ?token=...)
      const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) setLinkError(error.message);
        else setReady(true);
        return;
      }

      setLinkError("This reset link is invalid or has expired. Request a new one.");
    };

    consumeLink();
    return () => subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const parsed = schema.parse({ password, confirm });
      const { error } = await supabase.auth.updateUser({ password: parsed.password });
      if (error) throw new Error(error.message);
      toast({ title: "Password updated", description: "You can now sign in." });
      await supabase.auth.signOut();
      navigate("/admin/login");
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.errors[0]?.message || "Invalid input"
          : error instanceof Error
          ? error.message
          : "Something went wrong";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-primary/5 p-8 text-center border-b border-border">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Set a New Password</h1>
            <p className={linkError ? "text-destructive mt-1" : "text-muted-foreground mt-1"}>
              {linkError
                ? linkError
                : ready
                ? "Enter your new password below."
                : "Verifying your reset link…"}
            </p>
            {linkError && (
              <a href="/admin/forgot-password" className="text-accent hover:underline text-sm">
                Request a new reset link
              </a>
            )}

          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 pl-10"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              variant="hero"
              size="lg"
              type="submit"
              className="w-full"
              disabled={isLoading || !ready}
            >
              {isLoading ? "Updating..." : "Update password"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
