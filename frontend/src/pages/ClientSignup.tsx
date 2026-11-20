import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const fieldClass = "rounded-2xl border border-primary/25 bg-card p-4";
const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] luxury-gold-text";
const inputClass = "w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground";

const ClientSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Error", description: "Please agree to the Terms of Service", variant: "destructive" });
      return;
    }

    try {
      setIsLoading(true);
      await signup({ name, email, password }, "client");
      toast({ title: "Account created", description: "Please login with your credentials" });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="trainer-gold flex min-h-screen justify-center bg-background text-foreground">
      <div className="relative flex w-full max-w-md flex-col bg-background px-6 py-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle className="h-10 w-10 rounded-full border border-border bg-card" />
        </div>
        <Link to="/" className="mb-6 inline-flex items-center gap-2 pr-12 text-xs luxury-gold-text">
          <ChevronLeft className="h-4 w-4" />
          Back to login
        </Link>
        <h1 className="luxury-gold-text text-3xl font-bold uppercase tracking-[0.08em]">
          Membership
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">Create your client account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className={fieldClass}>
            <label className={labelClass}>Full name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" required />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Password</label>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Confirm password</label>
            <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
          </div>

          <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 accent-black dark:accent-white"
            />
            <span>
              I agree to the <Link to="#" className="luxury-gold-text">Terms of Service</Link> and{" "}
              <Link to="#" className="luxury-gold-text">Privacy Policy</Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="luxury-gold-btn flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.18em] disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Creating" : "Create account"}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center text-xs">
          <p className="text-muted-foreground">
            Already registered?{" "}
            <Link to="/" className="font-semibold luxury-gold-text">Sign in</Link>
          </p>
          <Link to="/trainer/signup" className="inline-block text-muted-foreground hover:text-primary">
            Register as a trainer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientSignup;
