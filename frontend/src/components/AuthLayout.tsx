import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  accentType?: "client" | "trainer";
}

const AuthLayout = ({ children, title, subtitle, accentType = "client" }: AuthLayoutProps) => {
  const clientActive = accentType === "client";

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mb-6 flex rounded-2xl border border-border bg-card p-1">
          <Link
            to="/"
            className={`flex-1 rounded-xl py-2.5 text-center text-xs font-semibold ${
              clientActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Client
          </Link>
          <Link
            to="/trainer/login"
            className={`flex-1 rounded-xl py-2.5 text-center text-xs font-semibold ${
              clientActive ? "text-muted-foreground" : "bg-primary text-primary-foreground shadow-sm"
            }`}
          >
            Trainer
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
