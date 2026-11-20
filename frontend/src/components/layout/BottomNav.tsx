import { NavLink, useLocation } from "react-router-dom";
import { Award, Dumbbell, Home, LayoutDashboard, MessageSquare, TrendingUp, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const clientItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/messages", label: "Chat", icon: MessageSquare },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
];

const trainerItems = [
  { to: "/trainer/dashboard", label: "Hub", icon: LayoutDashboard },
  { to: "/trainer/gym", label: "Gym", icon: Users },
  { to: "/exercises/manage", label: "Library", icon: Dumbbell },
  { to: "/trainer/messages", label: "Chat", icon: MessageSquare },
  { to: "/trainer/me", label: "Bio", icon: Award },
];

const hideNav = (path: string) => /^\/schedule\/(?!create$|add-exercises$).+/.test(path);

const BottomNav = () => {
  const { userType } = useAuth();
  const { pathname } = useLocation();

  if (hideNav(pathname)) return null;

  const items = userType === "trainer" ? trainerItems : clientItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--app-bottom-nav)] items-start border-t border-border bg-background/95 px-5 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] font-medium transition active:scale-95 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
