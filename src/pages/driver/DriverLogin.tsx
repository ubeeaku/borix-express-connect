import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Lock, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DriverLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Authentication failed");

      // Check if user has driver role
      const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
        _user_id: data.user.id,
        _role: 'driver',
      });

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("You do not have driver access. Please contact admin if you've been approved.");
      }

      // Check if driver record exists and is active
      const { data: driver } = await supabase
        .from('drivers')
        .select('status')
        .eq('user_id', data.user.id)
        .single();

      if (!driver || driver.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error("Your driver account is not active. Please contact admin.");
      }

      toast({ title: "Welcome back, Driver! 🚗", description: "Redirecting to dashboard..." });
      navigate("/driver/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      });
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-primary/5 p-8 text-center border-b border-border">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Driver Login</h1>
            <p className="text-muted-foreground mt-1">Sign in to your driver dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@example.com"
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

            <Button variant="hero" size="lg" type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <a href="/driver/drive-with-us" className="text-white/80 hover:text-white text-sm block">
            Not a driver? Apply to drive →
          </a>
          <a href="/" className="text-white/60 hover:text-white text-sm block">
            ← Back to Borix Express
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default DriverLogin;
