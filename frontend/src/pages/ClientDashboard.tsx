import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, Users, Calendar, Star, Award, UserPlus, Dumbbell, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import ContentFeed from "@/components/dashboard/ContentFeed";
import ScreenHeader from "@/components/layout/ScreenHeader";
import ThemeToggle from "@/components/ThemeToggle";
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
  const [plansOpen, setPlansOpen] = useState(false);

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
    if (!searchQuery.trim()) return;

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
  }, [searchQuery, toast]);
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
    createdAt: schedule.createdAt,
  }));

  const connectedTrainer = trainers.find((trainer: any) => connectionStatuses[trainer._id] === "connected");

  const filteredFeedPosts = feedPosts.filter((post: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.trainer?.name?.toLowerCase().includes(q) ||
      post.trainer?.specialization?.toLowerCase().includes(q) ||
      post.caption?.toLowerCase().includes(q)
    );
  });

  if (plansOpen) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background">
        <div className="mx-auto w-full max-w-md">
          <ScreenHeader
            title="Plans"
            onBack={() => setPlansOpen(false)}
            action={<ThemeToggle className="h-10 w-10 rounded-xl border border-border bg-card" />}
          />
          <main className="space-y-3 px-5 pb-4">
            <button
              type="button"
              onClick={handleCreateSchedule}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Create schedule
            </button>
            {isLoadingSchedules ? (
              <div className="flex items-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Loading schedules
              </div>
            ) : transformedSchedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                No schedules yet. Create one to start a routine.
              </div>
            ) : (
              transformedSchedules.map((schedule: any) => (
                <ScheduleCard
                  key={schedule.id}
                  {...schedule}
                  onClick={handleScheduleClick}
                  onDelete={(id) => setScheduleToDelete(id)}
                />
              ))
            )}
          </main>
        </div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <DashboardHeader clientName={user?.name || "User"} />

      <main className="mx-auto w-full max-w-md space-y-5 px-5 pb-4">
        <section className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => navigate("/progress")} className="tap-card p-4 text-left">
            <div className="icon-chip mb-3">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-base font-bold text-foreground">Progress</div>
            <div className="text-xs text-muted-foreground">Weight and logs</div>
          </button>
          <button type="button" onClick={() => setPlansOpen(true)} className="tap-card p-4 text-left">
            <div className="icon-chip mb-3">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="text-base font-bold text-foreground">Plans</div>
            <div className="text-xs text-muted-foreground">
              {transformedSchedules.length} {transformedSchedules.length === 1 ? "schedule" : "schedules"}
            </div>
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Your coach</h3>
            {connectedTrainer ? (
              <button type="button" className="text-xs font-semibold text-primary" onClick={() => navigate(`/trainer/${connectedTrainer._id}`)}>
                View bio
              </button>
            ) : null}
          </div>
          {connectedTrainer ? (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{connectedTrainer.name}</p>
                <p className="truncate text-xs text-muted-foreground">{connectedTrainer.specialization || "Trainer"}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/messages?trainerId=${connectedTrainer._id}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
                aria-label="Message coach"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => navigate("/messages")} className="w-full rounded-2xl border border-dashed border-border bg-card p-4 text-left text-sm text-muted-foreground">
              No coach connected yet. Open a trainer from the feed to connect.
            </button>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Contents</h3>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search posts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border bg-card pl-10"
            />
          </div>
          <ContentFeed
            posts={filteredFeedPosts}
            isLoading={isLoadingFeed}
            emptyTitle={searchQuery ? "No matching posts" : "No contents yet"}
            emptyDescription={searchQuery ? "No posts match that search." : "Trainers have not posted images yet."}
            onOpenProfile={(id) => navigate(`/trainer/${id}`)}
          />
        </section>

        {transformedSchedules.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Your plans</h3>
            <div className="space-y-3">
              {transformedSchedules.map((schedule: any) => (
                <ScheduleCard
                  key={schedule.id}
                  {...schedule}
                  onClick={handleScheduleClick}
                  onDelete={(id) => setScheduleToDelete(id)}
                />
              ))}
            </div>
          </section>
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
                <DialogTitle className="font-heading text-xl font-bold text-foreground">Trainer profile</DialogTitle>
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