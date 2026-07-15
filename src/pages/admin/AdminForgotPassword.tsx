import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
});

const AdminForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { email: validEmail } = schema.parse({ email });
      const { error } = await supabase.auth.resetPasswordForEmail(validEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
      toast({
        title: "Check your inbox",
        description: "If that email exists, a reset link has been sent.",
      });
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.errors[0]?.message || "Invalid input"
          : error instanceof Error
          ? error.message
          : "Something went wrong";
      toast({ title: "Reset failed", description: message, variant: "destructive" });
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
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground mt-1">
              We'll email you a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="p-8 space-y-4 text-center">
              <p className="text-foreground">
                If <span className="font-medium">{email}</span> matches an admin account,
                you'll receive a reset email shortly.
              </p>
              <Link to="/admin/login" className="text-accent hover:underline text-sm">
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@borixexpress.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                    required
                    maxLength={255}
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                variant="hero"
                size="lg"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <p className="text-center text-sm">
                <Link to="/admin/login" className="text-muted-foreground hover:text-foreground">
                  ← Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminForgotPassword;
