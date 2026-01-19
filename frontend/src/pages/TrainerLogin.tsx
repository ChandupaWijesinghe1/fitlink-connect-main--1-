import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Award, Loader2 } from "lucide-react";  // ← NEW: Added Loader2
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import AuthInput from "@/components/AuthInput";
import { useAuth } from "@/context/AuthContext";  // ← NEW
import { useToast } from "@/hooks/use-toast";  // ← NEW

const TrainerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);  // ← NEW

  const { login } = useAuth();  // ← NEW
  const navigate = useNavigate();
  const { toast } = useToast();  // ← NEW

  const handleSubmit = async (e: React.FormEvent) => {  // ← NEW: async
    e.preventDefault();

    // ← NEW: Validation
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
      await login(email, password, 'trainer');  // ← NEW: API CALL with 'trainer' type
      
      toast({
        title: "Success!",
        description: "Welcome back, coach!",
      });
      
      navigate('/trainer/dashboard');  // ← NEW: Redirect to trainer dashboard
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Empower Others"
      subtitle="Access your trainer dashboard, manage clients, and create personalized workout plans. Lead the transformation."
      accentType="trainer"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-foreground">Trainer Login</h2>
            <p className="text-muted-foreground text-sm">Welcome back, coach</p>
          </div>
        </motion.div>

        <AuthInput
          type="email"
          placeholder="Email address"
          icon={Mail}
          value={email}
          onChange={setEmail}
          delay={0.2}
        />

        <AuthInput
          type="password"
          placeholder="Password"
          icon={Lock}
          value={password}
          onChange={setPassword}
          delay={0.3}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center justify-between text-sm"
        >
          <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-border bg-input accent-accent" />
            Remember me
          </label>
          <Link to="#" className="text-accent hover:text-accent/80 transition-colors">
            Forgot password?
          </Link>
        </motion.div>

        {/* ========== NEW: Button with Loading State ========== */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          type="submit"
          disabled={isLoading}
          className="btn-accent w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>
        {/* ========== END Button ========== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="relative my-8"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">or</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="space-y-4"
        >
          <p className="text-center text-muted-foreground text-sm">
            Don't have a trainer account?{" "}
            <Link to="/trainer/signup" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>

          <Link
            to="/"
            className="btn-primary w-full flex items-center justify-center gap-2 group"
          >
            Login as Client
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default TrainerLogin;