import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Users, 
  Calendar, 
  Award,
  MessageCircle,
  UserPlus,
  Check,
  Clock,
  Dumbbell,
  Heart,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getTrainerById } from "@/api/trainers";  // ← NEW
import { useAuth } from "@/context/AuthContext";  // ← NEW
import ThemeToggle from "@/components/ThemeToggle";
import {
  acceptConnectionRequest,
  getConnectionOverview,
  getConnectionStatus,
  sendConnectionRequest,
} from "@/api/connections";

const TrainerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userType } = useAuth();

  const navigateToDashboard = () => {
    navigate(userType === "trainer" ? "/trainer/dashboard" : "/dashboard");
  };
  
  const [trainer, setTrainer] = useState<any>(null);  // ← NEW: Real trainer data
  const [isLoadingTrainer, setIsLoadingTrainer] = useState(true);  // ← NEW
  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "pending" | "pending_sent" | "pending_received" | "connected"
  >("none");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // ========== NEW: Fetch trainer data from backend ==========
  useEffect(() => {
    const fetchTrainer = async () => {
      if (!id) return;

      try {
        setIsLoadingTrainer(true);
        const data = await getTrainerById(id);
        setTrainer(data);
      } catch (error: any) {
        console.error('Error fetching trainer:', error);
        toast.error("Failed to load trainer profile", {
          description: error.message || "Please try again later"
        });
        navigateToDashboard();
      } finally {
        setIsLoadingTrainer(false);
      }
    };

    fetchTrainer();
  }, [id, navigate]);
  // ========== END Fetch ==========

  useEffect(() => {
    const loadStatus = async () => {
      if (!id || !user?._id || userType !== "client") return;
      try {
        const status = await getConnectionStatus(id, "Trainer");
        setConnectionStatus(status);
      } catch (error) {
        console.error("Error loading connection status:", error);
      }
    };

    loadStatus();
  }, [id, user?._id, userType]);

  // ========== NEW: Loading state ==========
  if (isLoadingTrainer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading trainer profile...</span>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Trainer not found</p>
          <Button onClick={navigateToDashboard}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }
  // ========== END Loading ==========

  const handleSendRequest = async () => {
    if (!id) return;
    setIsLoadingAction(true);
    try {
      await sendConnectionRequest({ toId: id, toType: "Trainer" });
      setConnectionStatus("pending_sent");
      toast.success("Connection request sent", {
        description: `${trainer.name} will be notified of your request.`,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not send connection request");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!id) return;
    setIsLoadingAction(true);
    try {
      const overview = await getConnectionOverview();
      const incoming = overview.incoming?.find(
        (request: any) => String(request.from?.id) === String(id)
      );
      if (!incoming?._id) {
        throw new Error("Incoming request not found");
      }
      await acceptConnectionRequest(incoming._id);
      setConnectionStatus("connected");
      toast.success("You are now connected");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Could not accept request");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleMessage = () => {
    // Navigate to messages page with trainer ID as query parameter
    navigate(`/messages?trainerId=${id}`);
  };

  const getStatusButton = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" disabled>
            <Check className="w-4 h-4 mr-2" />
            Connected ✨
          </Button>
        );
      case "pending":
      case "pending_sent":
        return (
            <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" disabled>
            <Clock className="w-4 h-4 mr-2" />
            Request Pending ⏳
          </Button>
        );
      case "pending_received":
        return (
          <Button
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            onClick={handleAcceptRequest}
            disabled={isLoadingAction}
          >
            <Check className="w-4 h-4 mr-2" />
            {isLoadingAction ? "Accepting..." : "Accept Request"}
          </Button>
        );
      default:
        return (
          <Button 
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={handleSendRequest}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {isLoadingAction ? "Sending..." : "Send Connection Request 🤝"}
          </Button>
        );
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateToDashboard}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Trainer Profile</h1>
          <ThemeToggle />
        </motion.div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl mb-6">
            {/* Cover gradient */}
            <div className="h-32 bg-gradient-to-r from-primary via-accent to-primary relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
              <motion.div
                className="absolute top-4 right-4 text-4xl"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                💪
              </motion.div>
            </div>
            
            <CardContent className="relative px-6 pb-6">
              {/* Avatar */}
              <motion.div 
                className="absolute -top-16 left-6"
                whileHover={{ scale: 1.05 }}
              >
                {trainer.profileImage ? (
                  <img 
                    src={trainer.profileImage} 
                    alt={trainer.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold text-white border-4 border-background shadow-xl">
                    {getInitials(trainer.name)}
                  </div>
                )}
                {connectionStatus === "connected" && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>

              <div className="pt-20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {trainer.name}
                      <span className="text-xl">🌟</span>
                    </h2>
                    <p className="text-primary font-medium flex items-center gap-2 mt-1">
                      <Dumbbell className="w-4 h-4" />
                      {trainer.specialization}
                    </p>
                    {trainer.phone && (
                      <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        📞 {trainer.phone}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/40">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">{trainer.clients?.length || 0}</span>
                    <span className="text-muted-foreground text-sm">clients</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <motion.div 
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{trainer.clients?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Clients 👥</p>
                  </motion.div>
                  <motion.div 
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Calendar className="w-6 h-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{trainer.experience || 0} yrs</p>
                    <p className="text-xs text-muted-foreground">Experience 📅</p>
                  </motion.div>
                  <motion.div 
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Zap className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">
                      {trainer.isActive ? '✅' : '❌'}
                    </p>
                    <p className="text-xs text-muted-foreground">Active Status 💰</p>
                  </motion.div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  {getStatusButton()}
                  <Button 
                    variant="outline" 
                    className="flex-1 border-primary/30 hover:bg-primary/10"
                    onClick={handleMessage}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message 💬
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {trainer.posts && trainer.posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h3 className="text-lg font-bold text-foreground mb-4">Posts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {trainer.posts.map((post: any) => (
                <Card key={post._id} className="overflow-hidden border-border">
                  <img src={post.image} alt={post.caption || "Post"} className="w-full h-40 object-cover" />
                  {post.caption && (
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* About Section */}
        {trainer.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-card to-primary/5 shadow-lg mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-pink-500" />
                  About Me 📝
                </h3>
                <p className="text-muted-foreground leading-relaxed">{trainer.bio}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Certifications */}
        {trainer.certifications && trainer.certifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-br from-card to-accent/5 shadow-lg mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-amber-500" />
                  Certifications 🏅
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications.map((cert: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 border-amber-500/30 px-3 py-1">
                        ✓ {cert.name}
                        {cert.issuedBy && <span className="text-xs ml-1">by {cert.issuedBy}</span>}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 bg-gradient-to-br from-card to-primary/5 shadow-lg mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                📧 Contact Information
              </h3>
              <p className="text-muted-foreground">
                <strong>Email:</strong> {trainer.email}
              </p>
              {trainer.phone && (
                <p className="text-muted-foreground mt-2">
                  <strong>Phone:</strong> {trainer.phone}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TrainerProfile;