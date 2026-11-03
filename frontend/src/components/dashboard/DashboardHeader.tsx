import { Bell, MessageSquare, User, LogOut, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

interface DashboardHeaderProps {
  clientName: string;
}

const DashboardHeader = ({ clientName }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="flex items-center justify-between p-4 md:p-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex flex-col">
        <span className="text-muted-foreground text-sm">Welcome back,</span>
        <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
          {clientName}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle className="h-10 w-10" />
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50"
          onClick={() => navigate("/messages")}
        >
          <MessageSquare className="h-5 w-5 text-foreground" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50"
          onClick={() => navigate("/notifications")}
        >
          <Bell className="h-5 w-5 text-foreground" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent/50"
            >
              <User className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/progress")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
