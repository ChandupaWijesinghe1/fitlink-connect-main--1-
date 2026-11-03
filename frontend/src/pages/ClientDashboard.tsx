import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, Users, Calendar, Star, Award, UserPlus, Dumbbell, ChevronRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import ContentFeed from "@/components/dashboard/ContentFeed";
import { useAuth } from "@/context/AuthContext";
import { getUserSchedules, deleteSchedule } from "@/api/schedules";
import { getAllTrainers, searchTrainers, getTrainerById, getTrainerFeedPosts } from "@/api/trainers";
import { acceptConnectionRequest, getConnectionOverview, sendConnectionRequest } from "@/api/connections";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"schedules" | "instructors">("instructors");
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);  // ← NEW: Real trainers
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);  // ← NEW: For trainer details dialog
  const [isLoadingTrainerDetails, setIsLoadingTrainerDetails] = useState(false);  // ← NEW
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const [incomingRequestIds, setIncomingRequestIds] = useState<Record<string, string>>({});
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Fetch schedules on component mount
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!user?._id) return;

      try {
        setIsLoadingSchedules(true);
        const data = await getUserSchedules(user._id);
        setSchedules(data);
      } catch (error: any) {
        console.error('Error fetching schedules:', error);
        toast({
          title: "Error",
          description: "Failed to load schedules",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, [user?._id, toast]);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        setIsLoadingTrainers(true);
        const data = await getAllTrainers();
        setTrainers(data);
      } catch (error: any) {
        console.error('Error fetching trainers:', error);
        toast({
          title: "Error",
          description: "Failed to load trainers",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTrainers(false);
      }
    };

    fetchTrainers();
  }, [toast]);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setIsLoadingFeed(true);
        const posts = await getTrainerFeedPosts();
        setFeedPosts(posts || []);
      } catch (error: any) {
        console.error("Error fetching trainer contents:", error);
        toast({
          title: "Error",
          description: "Failed to load trainer contents",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFeed(false);
      }
    };

    fetchFeed();
  }, [toast]);

  useEffect(() => {
    const loadConnections = async () => {
      if (!user?._id) return;
      try {
        const overview = await getConnectionOverview();
        const statuses: Record<string, string> = {};
        const incomingIds: Record<string, string> = {};
        if (overview.connectedTrainerId) {
          statuses[String(overview.connectedTrainerId)] = "connected";
        }
        (overview.outgoing || []).forEach((request: any) => {
          statuses[String(request.to.id)] = "pending_sent";
        });
        (overview.incoming || []).forEach((request: any) => {
          statuses[String(request.from.id)] = "pending_received";
          incomingIds[String(request.from.id)] = request._id;
        });
        setConnectionStatuses(statuses);
        setIncomingRequestIds(incomingIds);
      } catch (error) {
        console.error("Error loading connections:", error);
      }
    };

    loadConnections();
  }, [user?._id]);

  // ========== NEW: Search trainers with debounce ==========
  useEffect(() => {
    if (activeTab !== 'instructors' || !searchQuery.trim()) return;

    const searchTimeout = setTimeout(async () => {
      try {
        setIsLoadingTrainers(true);
        const data = await searchTrainers(searchQuery);
        setTrainers(data);
      } catch (error: any) {
        console.error('Error searching trainers:', error);
        toast({
          title: "Error",
          description: "Failed to search trainers",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTrainers(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeTab, toast]);
  // ========== END Search ==========

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      console.log('🗑️ Deleting schedule:', scheduleId);
      
      await deleteSchedule(scheduleId);
      
      console.log('✅ Delete API successful');
      
      // Remove from local state
      const updatedSchedules = schedules.filter((s: any) => s._id !== scheduleId);
      console.log('📊 Schedules before:', schedules.length);
      console.log('📊 Schedules after:', updatedSchedules.length);
      
      setSchedules(updatedSchedules);
      
      toast({
        title: "Schedule Deleted",
        description: "Your schedule has been removed",
      });
      
      setScheduleToDelete(null);
    } catch (error: any) {
      console.error('❌ Error deleting schedule:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  const handleScheduleClick = (id: string) => {
    navigate(`/schedule/${id}`);
  };

  const handleTrainerClick = async (id: string) => {
    try {
      setIsLoadingTrainerDetails(true);
      const trainerData = await getTrainerById(id);
      setSelectedTrainer(trainerData);
    } catch (error: any) {
      console.error('Error fetching trainer details:', error);
      toast({
        title: "Error",
        description: "Failed to load trainer details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTrainerDetails(false);
    }
  };

  const handleCreateSchedule = () => {
    navigate("/schedule/create");
  };

  // Transform DB schedules to match ScheduleCard props
  const transformedSchedules = schedules.map((schedule: any) => ({
    id: schedule._id,
    title: schedule.title,
    description: schedule.description || "Workout plan",
    numberOfDays: schedule.days?.length || 0,
    exerciseCount: schedule.days?.reduce((total: number, day: any) => total + (day.exercises?.length || 0), 0) || 0,
    owner: schedule.trainer === 'self' ? '' : schedule.trainer,
    isOwnSchedule: schedule.trainer === 'self',
  }));

  const filteredFeedPosts = feedPosts.filter((post: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.trainer?.name?.toLowerCase().includes(q) ||
      post.trainer?.specialization?.toLowerCase().includes(q) ||
      post.caption?.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`min-h-screen overflow-x-hidden ${activeTab === "instructors" ? "bg-[#F0F2F5] dark:bg-background" : "bg-background"}`}>
      <DashboardHeader clientName={user?.name || "User"} />

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
        <section className="grid grid-cols-2 gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("instructors")}
            className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border p-3 md:p-8 text-left transition-all duration-300 min-h-[92px] md:min-h-[220px] ${
              activeTab === "instructors"
                ? "border-primary shadow-md md:shadow-glow bg-gradient-to-br from-primary/20 via-card to-accent/10"
                : "border-border bg-card hover:border-primary/40 hover:shadow-lg"
            }`}
          >
            <div className="absolute -right-8 -top-8 h-20 w-20 md:h-36 md:w-36 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/30" />
            <div className="relative flex h-full flex-col justify-between gap-2 md:gap-6">
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
                  <Images className="h-4 w-4 md:h-7 md:w-7" />
                </div>
                {activeTab === "instructors" && (
                  <span className="rounded-full bg-primary px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold text-primary-foreground">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-heading text-base md:text-4xl text-foreground leading-tight">Contents</h2>
                <p className="mt-2 hidden md:block text-muted-foreground">
                  Trainer posts, then open a profile from any post.
                </p>
                <div className="mt-1 md:mt-4 flex items-center gap-1 md:gap-2 text-[11px] md:text-sm font-medium text-primary">
                  {feedPosts.length} posts
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border p-3 md:p-8 text-left transition-all duration-300 min-h-[92px] md:min-h-[220px] ${
              activeTab === "schedules"
                ? "border-primary shadow-md md:shadow-glow bg-gradient-to-br from-primary/20 via-card to-accent/10"
                : "border-border bg-card hover:border-primary/40 hover:shadow-lg"
            }`}
          >
            <div className="absolute -right-8 -bottom-8 h-20 w-20 md:h-36 md:w-36 rounded-full bg-accent/20 blur-2xl group-hover:bg-accent/30" />
            <div className="relative flex h-full flex-col justify-between gap-2 md:gap-6">
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-accent to-primary text-primary-foreground shadow-lg">
                  <Calendar className="h-4 w-4 md:h-7 md:w-7" />
                </div>
                {activeTab === "schedules" && (
                  <span className="rounded-full bg-primary px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold text-primary-foreground">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-heading text-base md:text-4xl text-foreground leading-tight">Schedules</h2>
                <p className="mt-2 hidden md:block text-muted-foreground">
                  Your workout plans, days, and routines in one place.
                </p>
                <div className="mt-1 md:mt-4 flex items-center gap-1 md:gap-2 text-[11px] md:text-sm font-medium text-primary">
                  {schedules.length} schedules
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </div>
              </div>
            </div>
          </button>
        </section>

        <AnimatePresence mode="wait">
          {activeTab === "schedules" ? (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-heading text-foreground">Your plans</h2>
                <p className="mt-1 text-sm text-muted-foreground">Open a schedule to follow each day’s session.</p>
              </div>

              {isLoadingSchedules ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading schedules...</span>
                </div>
              ) : transformedSchedules.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground">No schedules yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Create a plan or wait for your trainer to share one.
                  </p>
                  <Button onClick={handleCreateSchedule} className="mt-6 rounded-full">
                    <Plus className="w-5 h-5 mr-2" />
                    Create schedule
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {transformedSchedules.map((schedule: any) => (
                    <ScheduleCard
                      key={schedule.id}
                      {...schedule}
                      onClick={handleScheduleClick}
                      onDelete={(id) => setScheduleToDelete(id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="instructors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative mx-auto mb-3 max-w-[680px] md:mb-4">
                <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search posts or trainers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-full border-border bg-card pl-11 shadow-sm"
                />
              </div>

              <ContentFeed
                posts={filteredFeedPosts}
                stories={
                  searchQuery
                    ? []
                    : trainers.slice(0, 12).map((trainer: any) => ({
                        _id: trainer._id,
                        name: trainer.name,
                        profileImage: trainer.profileImage,
                      }))
                }
                isLoading={isLoadingFeed}
                emptyTitle={searchQuery ? "No matching posts" : "No contents yet"}
                emptyDescription={
                  searchQuery ? "No posts match that search." : "Trainers have not posted images yet."
                }
                onOpenProfile={(id) => navigate(`/trainer/${id}`)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Schedule FAB */}
        {activeTab === "schedules" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed bottom-6 right-6"
          >
            <Button
              size="lg"
              onClick={handleCreateSchedule}
              className="h-14 w-14 rounded-full shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your schedule and all its exercises.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scheduleToDelete && handleDeleteSchedule(scheduleToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trainer Details Dialog */}
      <Dialog open={!!selectedTrainer} onOpenChange={() => setSelectedTrainer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoadingTrainerDetails ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedTrainer ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-heading gradient-text">Trainer Profile</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Trainer Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="w-20 h-20 border-2 border-primary">
                    <AvatarImage src={selectedTrainer.profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                      {selectedTrainer.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{selectedTrainer.name}</h3>
                    <p className="text-primary font-medium">{selectedTrainer.specialization}</p>
                    {selectedTrainer.email && (
                      <p className="text-sm text-muted-foreground mt-1">📧 {selectedTrainer.email}</p>
                    )}
                    {selectedTrainer.phone && (
                      <p className="text-sm text-muted-foreground">📞 {selectedTrainer.phone}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-4 text-center">
                      <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{selectedTrainer.clients?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Clients</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-6 h-6 text-accent mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{selectedTrainer.experience || 0}</p>
                      <p className="text-xs text-muted-foreground">Years Exp</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <Dumbbell className="w-6 h-6 text-accent mx-auto mb-2" />
                      <p className="text-sm font-bold text-foreground line-clamp-2">{selectedTrainer.specialization || "Coach"}</p>
                      <p className="text-xs text-muted-foreground">Focus</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Bio */}
                {selectedTrainer.bio && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        About
                      </h4>
                      <p className="text-sm text-muted-foreground">{selectedTrainer.bio}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Certifications */}
                {selectedTrainer.certifications && selectedTrainer.certifications.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Certifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.certifications.map((cert: any, index: number) => (
                          <Badge key={index} className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                            ✓ {cert.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={
                      isSendingRequest ||
                      ["connected", "pending_sent"].includes(connectionStatuses[selectedTrainer._id])
                    }
                    onClick={async () => {
                      try {
                        setIsSendingRequest(true);
                        if (connectionStatuses[selectedTrainer._id] === "pending_received") {
                          const requestId = incomingRequestIds[selectedTrainer._id];
                          await acceptConnectionRequest(requestId);
                          setConnectionStatuses((current) => ({
                            ...current,
                            [selectedTrainer._id]: "connected",
                          }));
                          toast({
                            title: "You are now connected",
                            description: `${selectedTrainer.name} is on your trainer list`,
                          });
                          return;
                        }
                        await sendConnectionRequest({ toId: selectedTrainer._id, toType: "Trainer" });
                        setConnectionStatuses((current) => ({
                          ...current,
                          [selectedTrainer._id]: "pending_sent",
                        }));
                        toast({
                          title: "Connection request sent",
                          description: `${selectedTrainer.name} will be notified`,
                        });
                      } catch (error: any) {
                        toast({
                          title: "Could not update connection",
                          description: error.response?.data?.message || "Please try again",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSendingRequest(false);
                      }
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {connectionStatuses[selectedTrainer._id] === "connected"
                      ? "Connected"
                      : connectionStatuses[selectedTrainer._id] === "pending_sent"
                        ? "Request pending"
                        : connectionStatuses[selectedTrainer._id] === "pending_received"
                          ? isSendingRequest ? "Accepting..." : "Accept Request"
                          : isSendingRequest
                            ? "Sending..."
                            : "Send Request"}
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-primary/30"
                    onClick={() => {
                      setSelectedTrainer(null);
                      navigate(`/trainer/${selectedTrainer._id}`);
                    }}
                  >
                    View Full Profile
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;