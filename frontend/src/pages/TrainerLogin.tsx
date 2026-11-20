import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const TrainerLogin = () => {
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
      await login(email, password, "trainer");
      toast({ title: "Welcome back", description: "Trainer studio is open." });
      navigate("/trainer/dashboard");
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
          <span className="mb-3 inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] luxury-gold-text">
            Master trainer portal
          </span>
          <h1 className="luxury-gold-text text-3xl font-bold uppercase tracking-[0.16em]">
            FitConnect Pro
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">Coach and studio access</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="my-8 space-y-4 rounded-2xl border border-primary/25 bg-card p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] luxury-gold-text">
              Trainer email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@studio.com"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] luxury-gold-text">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Security passcode"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="luxury-gold-btn w-full rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.22em] disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Access studio"}
          </button>
        </form>

        <div className="space-y-3 text-center text-xs">
          <Link to="/trainer/signup" className="font-semibold luxury-gold-text">
            Apply as a trainer
          </Link>
          <div>
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Back to client login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerLogin;
