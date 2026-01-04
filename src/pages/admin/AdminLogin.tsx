import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login - In production, this would use Supabase auth
    setTimeout(() => {
      if (email && password) {
        toast({
          title: "Welcome back! 👋",
          description: "Redirecting to dashboard...",
        });
        navigate("/admin/dashboard");
      } else {
        toast({
          title: "Login failed",
          description: "Please enter valid credentials",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
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

            <p className="text-center text-sm text-muted-foreground">
              Forgot your password?{" "}
              <a href="#" className="text-accent hover:underline">
                Reset it here
              </a>
            </p>
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