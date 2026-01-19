import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  accentType?: "client" | "trainer";
}

const AuthLayout = ({ children, title, subtitle, accentType = "client" }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 ${
            accentType === "client" ? "bg-primary" : "bg-accent"
          }`}
        />
        <div 
          className={`absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full blur-3xl opacity-10 ${
            accentType === "client" ? "bg-primary" : "bg-accent"
          }`}
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Branding */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center"
        >
          <div className="max-w-md mx-auto lg:mx-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className={`text-sm font-semibold tracking-widest uppercase ${
                accentType === "client" ? "text-primary" : "text-accent"
              }`}>
                {accentType === "client" ? "Client Portal" : "Trainer Portal"}
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-heading text-5xl lg:text-7xl mt-4 leading-tight"
            >
              <span className="gradient-text">{title}</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-muted-foreground text-lg mt-6 leading-relaxed"
            >
              {subtitle}
            </motion.p>

            {/* Decorative Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex gap-8 mt-12"
            >
              <div>
                <div className="font-heading text-4xl text-foreground">10K+</div>
                <div className="text-muted-foreground text-sm">Active Users</div>
              </div>
              <div>
                <div className="font-heading text-4xl text-foreground">500+</div>
                <div className="text-muted-foreground text-sm">Trainers</div>
              </div>
              <div>
                <div className="font-heading text-4xl text-foreground">98%</div>
                <div className="text-muted-foreground text-sm">Success Rate</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 p-8 lg:p-16 flex items-center justify-center"
        >
          <div className="w-full max-w-md">
            <div className="glass-card p-8 lg:p-10">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
