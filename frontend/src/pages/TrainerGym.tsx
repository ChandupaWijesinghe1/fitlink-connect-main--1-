import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getTrainerClients } from "@/api/trainers";
import { getConnectionOverview } from "@/api/connections";
import { getUserSchedules } from "@/api/schedules";

const TrainerGym = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState(0);
  const [plansThisWeek, setPlansThisWeek] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?._id) return;
      try {
        setIsLoading(true);
        const [connected, overview, schedules] = await Promise.all([
          getTrainerClients(user._id),
          getConnectionOverview(),
          getUserSchedules(user._id),
        ]);
        setClients(connected || []);
        setPendingIncoming((overview.incoming || []).length);
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setPlansThisWeek(
          (schedules || []).filter((schedule: any) => new Date(schedule.createdAt).getTime() >= weekAgo).length
        );
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load roster");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?._id]);

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate("/trainer/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/trainer/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl gradient-text">CLIENT ROSTER</h1>
              <p className="text-sm text-muted-foreground">Connected clients only</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full border border-border bg-card"
              onClick={() => navigate("/trainer/messages")}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full border border-border bg-card"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <Users className="mb-2 h-8 w-8 text-primary" />
              <p className="text-3xl font-bold text-foreground">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Connected clients</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <Clock className="mb-2 h-8 w-8 text-accent" />
              <p className="text-3xl font-bold text-foreground">{pendingIncoming}</p>
              <p className="text-sm text-muted-foreground">Pending requests</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 border-border lg:col-span-1">
            <CardContent className="p-4">
              <TrendingUp className="mb-2 h-8 w-8 text-primary" />
              <p className="text-3xl font-bold text-foreground">{plansThisWeek}</p>
              <p className="text-sm text-muted-foreground">Plans this week</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connected clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl pl-12"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-heading text-lg">No connected clients yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Accept a request or send one from the Clients tab.
            </p>
            <Button className="mt-6 rounded-full" onClick={() => navigate("/trainer/dashboard")}>
              Go to clients
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client, idx) => (
              <motion.div
                key={client._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="border-border">
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.profileImage || ""} alt={client.name} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {client.name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/trainer/messages?clientId=${client._id}`)}
                      >
                        Message
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/trainer/clients/${client._id}/progress`)}
                      >
                        Progress
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TrainerGym;
