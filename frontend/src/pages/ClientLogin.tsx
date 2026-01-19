import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Dumbbell, Loader2 } from "lucide-react";  // ← ✅ NEW: Added Loader2 icon
import { Link, useNavigate } from "react-router-dom";  // ← ✅ NEW: Added useNavigate
import AuthLayout from "@/components/AuthLayout";
import AuthInput from "@/components/AuthInput";
import { useAuth } from "@/context/AuthContext";  // ← ✅ NEW: Import AuthContext
import { useToast } from "@/hooks/use-toast";  // ← ✅ NEW: Import toast for notifications

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);  // ← ✅ NEW: Loading state
  
  const { login } = useAuth();  // ← ✅ NEW: Get login function from AuthContext
  const navigate = useNavigate();  // ← ✅ NEW: For redirecting after login
  const { toast } = useToast();  // ← ✅ NEW: For showing success/error messages

  // ========== ✅ NEW: ENTIRE FUNCTION REPLACED ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ NEW: Validation
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);  // ✅ NEW: Show loading
      await login(email, password, 'client');  // ← ✅ NEW: ACTUAL API CALL!
      
      // ✅ NEW: Show success message
      toast({
        title: "Success!",
        description: "Welcome back!",
      });
      
      navigate('/dashboard');  // ← ✅ NEW: Redirect to dashboard
    } catch (error: any) {
      // ✅ NEW: Show error message
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);  // ✅ NEW: Hide loading
    }
  };
  // ========== END OF NEW FUNCTION ==========

  return (
    <AuthLayout
      title="Transform Your Body"
      subtitle="Connect with expert trainers, track your progress, and achieve your fitness goals. Your journey to a healthier you starts here."
      accentType="client"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... existing motion div ... */}
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
            <h2 className="font-heading text-2xl text-foreground">Client Login</h2>
            <p className="text-muted-foreground text-sm">Welcome back, champion</p>
          </div>
        </motion.div>

        <AuthInput
          type="email"
          placeholder="Email address"
          icon={Mail}
          value={email}
          onChange={setEmail}
          delay={0.2}
         // disabled={isLoading}  // ← ✅ NEW: Disable input while loading
        />

        <AuthInput
          type="password"
          placeholder="Password"
          icon={Lock}
          value={password}
          onChange={setPassword}
          delay={0.3}
         // disabled={isLoading}  // ← ✅ NEW: Disable input while loading
        />

        {/* ... existing remember me section ... */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center justify-between text-sm"
        >
          <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-border bg-input accent-primary" />
            Remember me
          </label>
          <Link to="#" className="text-primary hover:text-primary/80 transition-colors">
            Forgot password?
          </Link>
        </motion.div>

        {/* ========== ✅ NEW: BUTTON WITH LOADING STATE ========== */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          type="submit"
          disabled={isLoading}  // ← ✅ NEW: Disable while loading
          className="btn-primary w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"  // ← ✅ NEW: Added disabled styles
        >
          {isLoading ? (  // ← ✅ NEW: Conditional rendering based on loading state
            <>
              <Loader2 className="w-5 h-5 animate-spin" />  {/* ← ✅ NEW: Spinner */}
              Signing In...  {/* ← ✅ NEW: Loading text */}
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>
        {/* ========== END OF NEW BUTTON ========== */}

        {/* ... rest of your existing code remains the same ... */}
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
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>

          <Link
            to="/trainer/login"
            className="btn-accent w-full flex items-center justify-center gap-2 group"
          >
            Login as Trainer
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default ClientLogin;