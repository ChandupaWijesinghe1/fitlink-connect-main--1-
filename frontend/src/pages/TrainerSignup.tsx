import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Award, Briefcase, Phone, Loader2 } from "lucide-react";  // ← NEW: Added Phone, Loader2
import { Link, useNavigate } from "react-router-dom";  // ← NEW: Added useNavigate
import AuthLayout from "@/components/AuthLayout";
import AuthInput from "@/components/AuthInput";
import { useAuth } from "@/context/AuthContext";  // ← NEW
import { useToast } from "@/hooks/use-toast";  // ← NEW

const TrainerSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");  // ← NEW: Backend expects phone
  const [specialization, setSpecialization] = useState("");  // ← RENAMED: from specialty to specialization
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);  // ← NEW
  const [agreedToTerms, setAgreedToTerms] = useState(false);  // ← NEW

  const { signup } = useAuth();  // ← NEW
  const navigate = useNavigate();  // ← NEW
  const { toast } = useToast();  // ← NEW

  const handleSubmit = async (e: React.FormEvent) => {  // ← NEW: async
    e.preventDefault();

    // ========== NEW: VALIDATION ==========
    if (!name || !email || !phone || !specialization || !password || !confirmPassword) {
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
        description: "Please agree to the Trainer Agreement",
        variant: "destructive",
      });
      return;
    }
    // ========== END VALIDATION ==========

    try {
      setIsLoading(true);
      
      // ← NEW: API CALL - Backend expects: name, email, password, phone, specialization
      await signup(
        { name, email, password, phone, specialization },
        'trainer'
      );
      
      toast({
        title: "Account Created!",
        description: "Please login with your credentials",
      });
      
      navigate('/trainer/login');  // ← NEW: Redirect to trainer login
    } catch (error: any) {
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
      title="Lead the Change"
      subtitle="Join our network of elite fitness trainers. Build your client base, share your expertise, and inspire transformation."
      accentType="trainer"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-foreground">Trainer Account</h2>
            <p className="text-muted-foreground text-sm">Start coaching today</p>
          </div>
        </motion.div>

        <AuthInput
          type="text"
          placeholder="Full name"
          icon={User}
          value={name}
          onChange={setName}
          delay={0.2}
        />

        <AuthInput
          type="email"
          placeholder="Email address"
          icon={Mail}
          value={email}
          onChange={setEmail}
          delay={0.3}
        />

        {/* ========== NEW: Phone Input ========== */}
        <AuthInput
          type="tel"
          placeholder="Phone number"
          icon={Phone}
          value={phone}
          onChange={setPhone}
          delay={0.4}
        />
        {/* ========== END Phone Input ========== */}

        <AuthInput
          type="text"
          placeholder="Specialization (e.g., Strength, HIIT, Yoga)"
          icon={Briefcase}
          value={specialization}  // ← CHANGED: from specialty to specialization
          onChange={setSpecialization}  // ← CHANGED
          delay={0.5}  // ← UPDATED delay
        />

        <AuthInput
          type="password"
          placeholder="Password"
          icon={Lock}
          value={password}
          onChange={setPassword}
          delay={0.6}  // ← UPDATED delay
        />

        <AuthInput
          type="password"
          placeholder="Confirm password"
          icon={Lock}
          value={confirmPassword}
          onChange={setConfirmPassword}
          delay={0.7}  // ← UPDATED delay
        />

        {/* ========== NEW: Updated Checkbox with State ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}  // ← UPDATED delay
          className="flex items-start gap-2 text-sm"
        >
          <input 
            type="checkbox" 
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border bg-input accent-accent" 
          />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link to="#" className="text-accent hover:text-accent/80 transition-colors">
              Trainer Agreement
            </Link>{" "}
            and{" "}
            <Link to="#" className="text-accent hover:text-accent/80 transition-colors">
              Privacy Policy
            </Link>
          </span>
        </motion.div>
        {/* ========== END Checkbox ========== */}

        {/* ========== NEW: Button with Loading State ========== */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}  // ← UPDATED delay
          type="submit"
          disabled={isLoading}
          className="btn-accent w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Create Trainer Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>
        {/* ========== END Button ========== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}  // ← UPDATED delay
          className="space-y-4 pt-2"
        >
          <p className="text-center text-muted-foreground text-sm">
            Already have a trainer account?{" "}
            <Link to="/trainer/login" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Sign In
            </Link>
          </p>

          <Link
            to="/signup"
            className="btn-primary w-full flex items-center justify-center gap-2 group"
          >
            Sign Up as Client
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </form>
    </AuthLayout>
  );
};

export default TrainerSignup;