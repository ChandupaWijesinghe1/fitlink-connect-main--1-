import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, Users, Calendar, Star, Award, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import TrainerCard from "@/components/dashboard/TrainerCard";
import { useAuth } from "@/context/AuthContext";
import { getUserSchedules, deleteSchedule } from "@/api/schedules";
import { getAllTrainers, searchTrainers, getTrainerById } from "@/api/trainers";  // ← UPDATED
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
  
  const [activeTab, setActiveTab] = useState<"schedules" | "instructors">("schedules");
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);  // ← NEW: Real trainers
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(false);  // ← NEW
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);  // ← NEW: For trainer details dialog
  const [isLoadingTrainerDetails, setIsLoadingTrainerDetails] = useState(false);  // ← NEW

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

  // ========== NEW: Fetch trainers when instructors tab is active ==========
  useEffect(() => {
    const fetchTrainers = async () => {
      if (activeTab !== 'instructors') return;

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
  }, [activeTab, toast]);
  // ========== END Fetch trainers ==========

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
    description: schedule.description || "No description provided",
    numberOfDays: schedule.days?.length || 0,
    owner: schedule.trainer === 'self' ? '' : schedule.trainer,
    isOwnSchedule: schedule.trainer === 'self',
  }));

  // ========== NEW: Transform trainers to match TrainerCard props ==========
  const transformedTrainers = trainers.map((trainer: any) => ({
    id: trainer._id,
    name: trainer.name,
    specialty: trainer.specialization,
    rating: 4.8, // You can add rating to your Trainer model later
    location: trainer.bio || "Fitness Professional",
    image: trainer.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(trainer.name)}&background=random`,
  }));
  // ========== END Transform ==========

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader clientName={user?.name || "User"} />

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "schedules" ? "default" : "outline"}
            onClick={() => setActiveTab("schedules")}
            className={
              activeTab === "schedules"
                ? "bg-primary text-primary-foreground"
                : "border-primary/50 text-foreground hover:bg-primary/20"
            }
          >
            Schedules
          </Button>
          <Button
            variant={activeTab === "instructors" ? "default" : "outline"}
            onClick={() => setActiveTab("instructors")}
            className={
              activeTab === "instructors"
                ? "bg-primary text-primary-foreground"
                : "border-primary/50 text-foreground hover:bg-primary/20"
            }
          >
            Instructors
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "schedules" ? (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Your Upcoming Schedules
              </h2>

              {isLoadingSchedules ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading schedules...</span>
                </div>
              ) : transformedSchedules.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground mb-4">No schedules yet</p>
                  <Button onClick={handleCreateSchedule} className="bg-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Schedule
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search trainers by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card/50 border-primary/30 focus:border-primary h-12"
                />
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-4">
                {searchQuery ? "Search Results" : "Available Trainers"}
              </h2>

              {/* ========== NEW: Loading state for trainers ========== */}
              {isLoadingTrainers ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading trainers...</span>
                </div>
              ) : transformedTrainers.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No trainers found matching your search" : "No trainers available"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {transformedTrainers.map((trainer: any) => (
                    <TrainerCard
                      key={trainer.id}
                      {...trainer}
                      onClick={handleTrainerClick}
                    />
                  ))}
                </div>
              )}
              {/* ========== END Loading state ========== */}
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
                      <Star className="w-6 h-6 text-amber-500 mx-auto mb-2 fill-amber-500" />
                      <p className="text-2xl font-bold text-foreground">4.8</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
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
                    onClick={() => {
                      // TODO: Implement connection request
                      toast({
                        title: "Connection request sent!",
                        description: `${selectedTrainer.name} will be notified`
                      });
                      setSelectedTrainer(null);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Request
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