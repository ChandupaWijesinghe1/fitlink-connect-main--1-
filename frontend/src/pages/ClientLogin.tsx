import { useState } from "react";
import { ArrowRight, Crown, KeyRound, Loader2, Mail, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const fieldClass =
  "rounded-2xl border border-primary/25 bg-card p-4 shadow-sm";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password, "client");
      toast({ title: "Welcome back", description: "You are signed in." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="trainer-gold flex min-h-screen justify-center bg-background text-foreground">
      <div className="relative flex w-full max-w-md flex-col justify-between bg-background px-6 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle className="h-10 w-10 rounded-full border border-border bg-card" />
        </div>
        <div className="pt-8 text-center">
          <div className="gold-shine mx-auto mb-4 h-16 w-16 rounded-full p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
              <Crown className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="luxury-gold-text text-3xl font-bold uppercase tracking-[0.18em]">
            FitConnect
          </h1>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] luxury-gold-text">
            Obsidian Gold
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Personal coaching, kept private.</p>
        </div>

        <form onSubmit={handleSubmit} className="my-8 space-y-4">
          <div className={fieldClass}>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] luxury-gold-text">
              Email
            </label>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary/80" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          <div className={fieldClass}>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] luxury-gold-text">
              Password
            </label>
            <div className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-primary/80" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="#" className="text-[11px] font-semibold luxury-gold-text">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="luxury-gold-btn flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.22em] disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Entering" : "Authenticate & enter"}
            {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>

        <div className="space-y-4 text-center">
          <p className="text-xs text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-semibold luxury-gold-text underline underline-offset-4">
              Request membership
            </Link>
          </p>
          <div className="border-t border-border pt-4">
            <Link
              to="/trainer/login"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
            >
              <Shield className="h-3.5 w-3.5 text-primary" />
              Trainer portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
