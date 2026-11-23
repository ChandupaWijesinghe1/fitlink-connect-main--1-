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
    <nav className="fixed inset-x-3 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center rounded-[1.7rem] border border-white/25 bg-background/40 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-1.5 text-[10px] font-medium transition active:scale-95 ${
                isActive
                  ? "border-white/30 bg-white/15 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                  : "border-transparent text-muted-foreground"
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
