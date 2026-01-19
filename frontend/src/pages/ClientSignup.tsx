import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Dumbbell, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import AuthInput from "@/components/AuthInput";
import { useAuth } from "@/context/AuthContext";  // ← NEW
import { useToast } from "@/hooks/use-toast";  // ← NEW

const ClientSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);  // ← NEW
  const [agreedToTerms, setAgreedToTerms] = useState(false);  // ← NEW

  const { signup } = useAuth();  // ← NEW
  const navigate = useNavigate();  // ← NEW
  const { toast } = useToast();  // ← NEW

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ========== NEW: VALIDATION ==========
    if (!name || !email || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Error",
        description: "Please agree to the Terms of Service",
        variant: "destructive",
      });
      return;
    }
    // ========== END VALIDATION ==========

    try {
      setIsLoading(true);
      
      // ← NEW: API CALL
      await signup({ name, email, password }, 'client');
      
      // ← NEW: Success message
      toast({
        title: "Account Created!",
        description: "Please login with your credentials",
      });
      
      // ← NEW: Redirect to login
      navigate('/');
    } catch (error: any) {
      // ← NEW: Error handling
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Start Your Journey"
      subtitle="Join thousands of fitness enthusiasts who have transformed their lives. Create your account and connect with world-class trainers."
      accentType="client"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-foreground">Create Account</h2>
            <p className="text-muted-foreground text-sm">Begin your transformation</p>
          </div>
        </motion.div>

        <AuthInput
          type="text"
          placeholder="Full name"
          icon={User}
          value={name}
          onChange={setName}
          delay={0.2}
          //disabled={isLoading}  // ← NEW (if you added disabled support)
        />

        <AuthInput
          type="email"
          placeholder="Email address"
          icon={Mail}
          value={email}
          onChange={setEmail}
          delay={0.3}
         // disabled={isLoading}  // ← NEW (if you added disabled support)
        />

        <AuthInput
          type="password"
          placeholder="Password"
          icon={Lock}
          value={password}
          onChange={setPassword}
          delay={0.4}
         // disabled={isLoading}  // ← NEW (if you added disabled support)
        />

        <AuthInput
          type="password"
          placeholder="Confirm password"
          icon={Lock}
          value={confirmPassword}
          onChange={setConfirmPassword}
          delay={0.5}
          //disabled={isLoading}  // ← NEW (if you added disabled support)
        />

        {/* ========== NEW: Updated Checkbox with State ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-start gap-2 text-sm"
        >
          <input 
            type="checkbox" 
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border bg-input accent-primary" 
          />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link to="#" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="#" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
          </span>
        </motion.div>
        {/* ========== END Checkbox ========== */}

        {/* ========== NEW: Button with Loading State ========== */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>
        {/* ========== END Button ========== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="space-y-4 pt-4"
        >
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link to="/" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign In
            </Link>
          </p>

          <Link
            to="/trainer/signup"
            className="btn-accent w-full flex items-center justify-center gap-2 group"
          >
            Sign Up as Trainer
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default ClientSignup;