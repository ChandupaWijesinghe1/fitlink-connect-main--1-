import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Bell,
  User,
  Plus,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Search,
  UserPlus,
  MapPin,
  Target,
  Dumbbell,
  CheckCircle2,
  Clock,
  Building2,
  Loader2,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getUserSchedules } from "@/api/schedules";
import { getTrainerClients, getAllUsers, getTrainerFeedPosts } from "@/api/trainers";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import ContentFeed from "@/components/dashboard/ContentFeed";
import {
  acceptConnectionRequest,
  getConnectionOverview,
  sendConnectionRequest,
} from "@/api/connections";
import ThemeToggle from "@/components/ThemeToggle";

interface Schedule {
  _id: string;
  title: string;
  description: string;
  days: {
    dayNumber: number;
    exercises: {
      exerciseId: string;
      name: string;
      sets: number;
      reps: number;
    }[];
  }[];
  userId: string;
  trainer: string;
  createdAt: string;
  updatedAt: string;
}

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();  // ← ADDED logout
  
  const [activeTab, setActiveTab] = useState<"clients" | "schedules" | "contents">("clients");
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [messages, setMessages] = useState(5);
  
  // Client states
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientProfileOpen, setClientProfileOpen] = useState(false);
  const [myClients, setMyClients] = useState<any[]>([]);  // ← NEW: Trainer's connected clients
  const [allUsers, setAllUsers] = useState<any[]>([]);  // ← NEW: All users in system
  const [isLoadingClients, setIsLoadingClients] = useState(false);  // ← NEW
  const [pendingIncoming, setPendingIncoming] = useState(0);
  const [clientView, setClientView] = useState<"all" | "roster">("all");

  // Schedule states
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || "Alex Trainer",
    email: user?.email || "alex@fitpro.com",
    avatar: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=150&h=150&fit=crop",  // Default until profile pic feature is added
    followers: 1247,
    certifications: ["NASM Certified", "CrossFit Level 2", "Nutrition Specialist"],
    experienceYears: 8,
    experienceLevel: 80,
    specialty: "Strength & Conditioning",
    bio: "Passionate about helping people achieve their fitness goals.",
  });

  // ========== NEW: Fetch trainer's clients and all users ==========
  const fetchClients = async () => {
    if (!user?._id) return;

    try {
      setIsLoadingClients(true);
      
      // Fetch trainer's connected clients
      const connectedClients = await getTrainerClients(user._id);
      
      // Fetch all users in the system
      const users = await getAllUsers();
      
      // Mark which users are connected
      const connectedClientIds = new Set(connectedClients.map((c: any) => String(c._id)));
      
      const overview = await getConnectionOverview();
      const pendingOutgoing = new Set(
        (overview.outgoing || []).map((request: any) => String(request.to.id))
      );
      const incomingByClient = new Map(
        (overview.incoming || []).map((request: any) => [String(request.from.id), request._id])
      );
      const overviewConnected = new Set(
        (overview.connectedClientIds || []).map((id: any) => String(id))
      );

      const usersWithStatus = users.map((u: any) => ({
        ...u,
        isConnected: connectedClientIds.has(String(u._id)) || overviewConnected.has(String(u._id)),
        pendingRequest: pendingOutgoing.has(String(u._id)),
        incomingRequestId: incomingByClient.get(String(u._id)) || null,
      }));
      
      setMyClients(connectedClients);
      setAllUsers(usersWithStatus);
      setPendingIncoming((overview.incoming || []).length);
      
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchClients();
    }
  }, [user?._id]);
  // ========== END Fetch clients ==========

  // Fetch trainer's schedules
  const fetchSchedules = async () => {
    if (!user?._id) return;

    try {
      setIsLoadingSchedules(true);
      const data = await getUserSchedules(user._id);
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast.error("Failed to load schedules", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchSchedules();
    }
  }, [user?._id]);

  const fetchFeedPosts = async () => {
    try {
      setIsLoadingFeed(true);
      const data = await getTrainerFeedPosts();
      setFeedPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching trainer feed:", error);
      toast.error("Failed to load contents");
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (activeTab === "contents") {
      fetchFeedPosts();
    }
  }, [activeTab]);

  // Filter clients based on search
  const filteredClients = allUsers.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(clientSearchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (clientView === "roster") return Boolean(client.isConnected);
    return true;
  });

  const plansThisWeek = schedules.filter((schedule) => {
    const created = new Date(schedule.createdAt).getTime();
    return Date.now() - created <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const handleCreateSchedule = () => {
    navigate("/schedule/create");
  };

  const handleScheduleClick = (schedule: Schedule) => {
    navigate(`/schedule/${schedule._id}`, { state: { schedule } });
  };

  const handleClientClick = (client: any) => {
    setSelectedClient(client);
    setClientProfileOpen(true);
  };

  const handleSendConnectionRequest = async (clientId: string) => {
    try {
      await sendConnectionRequest({ toId: clientId, toType: "User" });
      setAllUsers((prev) =>
        prev.map((client) =>
          client._id === clientId ? { ...client, pendingRequest: true } : client
        )
      );
      setSelectedClient((prev: any) => (prev ? { ...prev, pendingRequest: true } : null));
      toast.success("Connection request sent", {
        description: "The client will be notified of your request.",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not send connection request");
    }
  };

  const handleAcceptIncomingRequest = async (requestId: string, clientId: string) => {
    try {
      await acceptConnectionRequest(requestId);
      setAllUsers((prev) =>
        prev.map((client) =>
          client._id === clientId
            ? { ...client, isConnected: true, pendingRequest: false, incomingRequestId: null }
            : client
        )
      );
      setSelectedClient((prev: any) =>
        prev?._id === clientId
          ? { ...prev, isConnected: true, pendingRequest: false, incomingRequestId: null }
          : prev
      );
      toast.success("Client connected");
      fetchClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not accept request");
    }
  };

  // Count total exercises in schedule
  const getTotalExercises = (schedule: Schedule) => {
    return schedule.days.reduce((total, day) => total + day.exercises.length, 0);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/trainer/login");
    toast.success("Logged out successfully!");
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${activeTab === "contents" ? "bg-[#F0F2F5] dark:bg-background" : "bg-background"}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-heading gradient-text">TRAINER HUB</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Messages Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trainer/messages")}
              className="relative h-11 w-11 rounded-full bg-card hover:bg-primary/20 border border-border"
            >
              <MessageSquare className="h-5 w-5 text-foreground" />
              {messages > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                  {messages}
                </span>
              )}
            </Button>

            {/* Notifications Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trainer/notifications")}
              className="relative h-11 w-11 rounded-full bg-card hover:bg-primary/20 border border-border"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                  {notifications}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trainer/me")}
              className="h-11 w-11 rounded-full overflow-hidden border-2 border-primary p-0"
              title="My profile"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full bg-card hover:bg-primary/20 border border-border"
                  title="Settings"
                >
                  <Settings className="h-5 w-5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
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

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card border-primary/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <CardContent className="p-4 relative">
                <Users className="h-8 w-8 text-primary mb-2" />
                <p className="text-3xl font-bold text-foreground">{myClients.length}</p>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card border-accent/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <CardContent className="p-4 relative">
                <Calendar className="h-8 w-8 text-accent mb-2" />
                <p className="text-3xl font-bold text-foreground">{schedules.length}</p>
                <p className="text-sm text-muted-foreground">Schedules</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card border-primary/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <CardContent className="p-4 relative">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <p className="text-3xl font-bold text-foreground">{pendingIncoming}</p>
                <p className="text-sm text-muted-foreground">Pending requests</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card border-accent/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <CardContent className="p-4 relative">
                <TrendingUp className="h-8 w-8 text-accent mb-2" />
                <p className="text-3xl font-bold text-foreground">{plansThisWeek}</p>
                <p className="text-sm text-muted-foreground">Plans this week</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Gym Action Buttons */}
                {/* Gym & Exercise Management Section */}
        <div className="mb-6 space-y-4">
          {/* Gym Management Card */}
          <Card className="glass-card border-primary/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Client roster</h3>
                    <p className="text-sm text-muted-foreground">
                      {myClients.length} connected {myClients.length === 1 ? "client" : "clients"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab("clients");
                      setClientView("roster");
                    }}
                    className="border-primary/50 text-foreground hover:bg-primary/20 flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Connected clients
                  </Button>
                  <Button
                    onClick={() => navigate("/trainer/gym")}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 flex items-center gap-2 shadow-glow"
                  >
                    <Building2 className="h-4 w-4" />
                    Open roster
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Management Card */}
          <Card className="glass-card border-accent/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Exercise Library</h3>
                    <p className="text-sm text-muted-foreground">Manage exercises and video tutorials</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/exercises/manage")}
                  className="bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 shadow-glow"
                >
                  <Dumbbell className="h-4 w-4" />
                  Manage Exercises
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant={activeTab === "clients" ? "default" : "outline"}
            onClick={() => setActiveTab("clients")}
            className={`flex items-center gap-2 ${
              activeTab === "clients"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border-primary/50 text-foreground hover:bg-primary/20"
            }`}
          >
            <Users className="h-4 w-4" />
            Clients
          </Button>
          <Button
            variant={activeTab === "schedules" ? "default" : "outline"}
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-2 ${
              activeTab === "schedules"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border-primary/50 text-foreground hover:bg-primary/20"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Schedules
          </Button>
          <Button
            variant={activeTab === "contents" ? "default" : "outline"}
            onClick={() => setActiveTab("contents")}
            className={`flex items-center gap-2 ${
              activeTab === "contents"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border-primary/50 text-foreground hover:bg-primary/20"
            }`}
          >
            <Images className="h-4 w-4" />
            Contents
          </Button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "clients" ? (
            <motion.div
              key="clients"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Client Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search clients by name..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-card border-border/50 focus:border-primary/50 rounded-xl text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  {clientView === "roster" ? "Connected roster" : clientSearchQuery ? "Search results" : "All clients"}
                </h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={clientView === "all" ? "default" : "outline"}
                    onClick={() => setClientView("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={clientView === "roster" ? "default" : "outline"}
                    onClick={() => setClientView("roster")}
                  >
                    Connected
                  </Button>
                </div>
              </div>

              {isLoadingClients ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading clients...</span>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {clientSearchQuery
                      ? "No clients found"
                      : clientView === "roster"
                        ? "No connected clients yet"
                        : "No clients yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((client, idx) => (
                    <motion.div
                      key={client._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleClientClick(client)}
                    >
                      <Card className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 border-2 border-primary/30">
                              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                                {getInitials(client.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                              {client.fitnessGoal && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Target className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{client.fitnessGoal}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              {client.isConnected ? (
                                <Badge className="bg-primary/20 text-primary border-primary/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                              ) : client.incomingRequestId ? (
                                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Incoming
                                </Badge>
                              ) : client.pendingRequest ? (
                                <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                                  Not Connected
                                </Badge>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === "schedules" ? (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="font-heading text-xl text-foreground">Created schedules</h2>
                <p className="mt-1 text-sm text-muted-foreground">Open a plan to review each day’s workout.</p>
              </div>
              
              {isLoadingSchedules ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground">No schedules yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Build a clean workout plan your clients can follow day by day.
                  </p>
                  <Button
                    onClick={handleCreateSchedule}
                    className="mt-6 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create schedule
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedules.map((schedule, idx) => (
                    <motion.div
                      key={schedule._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <ScheduleCard
                        id={schedule._id}
                        title={schedule.title}
                        description={schedule.description || "Workout plan"}
                        numberOfDays={schedule.days.length}
                        exerciseCount={getTotalExercises(schedule)}
                        owner="You"
                        isOwnSchedule
                        onClick={() => handleScheduleClick(schedule)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="contents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ContentFeed
                posts={feedPosts}
                isLoading={isLoadingFeed}
                emptyTitle="No contents yet"
                emptyDescription="Other trainers have not posted images yet."
                onOpenProfile={(id) => navigate(`/trainer/${id}`)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Profile Dialog */}
        <Dialog open={clientProfileOpen} onOpenChange={setClientProfileOpen}>
          <DialogContent className="sm:max-w-md bg-background border-border overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10" />
            <DialogHeader className="pt-8 relative z-10">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {selectedClient?.name && getInitials(selectedClient.name)}
                  </AvatarFallback>
                </Avatar>
                <DialogTitle className="text-2xl font-heading text-foreground mt-4">
                  {selectedClient?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedClient?.email}</p>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Client Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                {selectedClient?.phone && (
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-medium text-foreground">📞 {selectedClient.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </CardContent>
                  </Card>
                )}
                {selectedClient?.fitnessGoal && (
                  <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                    <CardContent className="p-3 text-center">
                      <Target className="h-5 w-5 text-accent mx-auto mb-1" />
                      <p className="text-sm font-medium text-foreground">{selectedClient.fitnessGoal}</p>
                      <p className="text-xs text-muted-foreground">Goal</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Connection Status & Action */}
              <div className="pt-2">
                {selectedClient?.isConnected ? (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        setClientProfileOpen(false);
                        navigate(`/trainer/messages?clientId=${selectedClient._id}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50"
                      onClick={() => {
                        setClientProfileOpen(false);
                        navigate(`/trainer/clients/${selectedClient._id}/progress`);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Progress
                    </Button>
                  </div>
                ) : selectedClient?.incomingRequestId ? (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      onClick={() =>
                        handleAcceptIncomingRequest(selectedClient.incomingRequestId, selectedClient._id)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accept Request
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50 hover:bg-primary/10"
                      onClick={() => {
                        setClientProfileOpen(false);
                        navigate(`/trainer/notifications`);
                      }}
                    >
                      Decline in Notifications
                    </Button>
                  </div>
                ) : selectedClient?.pendingRequest ? (
                  <div className="flex gap-3">
                    <Button disabled className="flex-1 bg-muted text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Request Pending
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50 hover:bg-primary/10"
                      onClick={() => {
                        setClientProfileOpen(false);
                        navigate(`/trainer/messages?clientId=${selectedClient._id}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
                      onClick={() => selectedClient && handleSendConnectionRequest(selectedClient._id)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/50 hover:bg-primary/10"
                      onClick={() => {
                        setClientProfileOpen(false);
                        navigate(`/trainer/messages?clientId=${selectedClient._id}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {activeTab !== "contents" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6"
        >
          <Button
            size="lg"
            onClick={handleCreateSchedule}
            className="h-14 px-6 rounded-full shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">New Schedule</span>
          </Button>
        </motion.div>
        )}
      </main>
    </div>
  );
};

export default TrainerDashboard;