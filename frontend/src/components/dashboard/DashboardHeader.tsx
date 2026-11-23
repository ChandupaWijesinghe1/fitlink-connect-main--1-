import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

const DashboardHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-4">
      <h1 className="font-heading text-lg font-bold leading-tight text-foreground">FitConnect</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle className="h-11 w-11 rounded-2xl border border-border bg-card" />
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
