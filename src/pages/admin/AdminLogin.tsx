import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Input validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

// Helper function to check admin role using server-side RPC only
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Use RPC call for server-side validation - fail closed if unavailable
    const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
    
    if (error) {
      console.error('Admin check failed:', error.message);
      return false; // Fail closed - deny access if check fails
    }
    
    return data === true;
  } catch {
    return false; // Fail closed on any error
  }
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = await checkIsAdmin(session.user.id);
        if (isAdmin) {
          navigate("/admin/dashboard");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      const validatedInput = loginSchema.parse({ email, password });

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedInput.email,
        password: validatedInput.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Authentication failed");
      }

      // Check if user has admin role
      const isAdmin = await checkIsAdmin(data.user.id);

      if (!isAdmin) {
        // Sign out if not admin
        await supabase.auth.signOut();
        throw new Error("You do not have admin access");
      }

      toast({
        title: "Welcome back! 👋",
        description: "Redirecting to dashboard...",
      });
      navigate("/admin/dashboard");

    } catch (error) {
      const message = error instanceof z.ZodError 
        ? error.errors[0]?.message || "Invalid input"
        : error instanceof Error 
          ? error.message 
          : "Login failed";
      
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      {/* Background Pattern */}
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
          {/* Header */}
          <div className="bg-primary/5 p-8 text-center border-b border-border">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-muted-foreground mt-1">
              Sign in to access the dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
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

            <div>
              <Label htmlFor="password">Password</Label>
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
                  minLength={6}
                  maxLength={128}
                  autoComplete="current-password"
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
              {isLoading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <a href="/" className="text-white/80 hover:text-white text-sm">
            ← Back to Borix Express
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
