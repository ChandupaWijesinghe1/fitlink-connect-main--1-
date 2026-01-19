import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AuthInputProps {
  type: string;
  placeholder: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

const AuthInput = ({ type, placeholder, icon: Icon, value, onChange, delay = 0 }: AuthInputProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative"
    >
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-12"
      />
    </motion.div>
  );
};

export default AuthInput;
