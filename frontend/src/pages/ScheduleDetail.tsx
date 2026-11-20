import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Dumbbell, Play, Trash2, Loader2, Maximize2, Minimize2, Pause, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getScheduleById, deleteSchedule } from "@/api/schedules";
import { shareSchedule } from "@/api/messages";
import { getTrainerClients } from "@/api/trainers";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

interface Exercise {
  _id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  videoUrl?: string | null;
  description?: string | null;
}

interface DaySchedule {
  dayNumber: number;
  exercises: Exercise[];
}

const exerciseKey = (exercise: Exercise, index: number) =>
  exercise._id || exercise.exerciseId || `${exercise.name}-${index}`;

const getYouTubeId = (url?: string | null): string => {
  if (!url) return "";
  try {
    const trimmed = url.trim();
    if (trimmed.includes("youtube.com/embed/")) {
      return trimmed.split("youtube.com/embed/")[1].split("?")[0];
    }
    if (trimmed.includes("youtube.com/watch")) {
      return new URL(trimmed).searchParams.get("v") || "";
    }
    if (trimmed.includes("youtu.be/")) {
      return trimmed.split("youtu.be/")[1].split("?")[0].split("&")[0];
    }
    if (trimmed.includes("youtube.com/v/")) {
      return trimmed.split("youtube.com/v/")[1].split("?")[0].split("&")[0];
    }
    return "";
  } catch {
    return "";
  }
};

const sessionMinutes = (exercises: Exercise[]) =>
  exercises.reduce((total, exercise) => total + (Number(exercise.sets) || 0), 0);

const ExerciseThumb = ({ name, videoUrl }: { name: string; videoUrl?: string | null }) => {
  const [failed, setFailed] = useState(false);
  const thumbId = getYouTubeId(videoUrl);

  if (!thumbId || failed) {
    return (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-semibold text-white">
        {(name || "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://i.ytimg.com/vi/${thumbId}/hqdefault.jpg`}
      alt=""
      className="h-16 w-16 shrink-0 rounded-xl object-cover"
      onError={() => setFailed(true)}
    />
  );
};

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, userType } = useAuth();
  
  const [schedule, setSchedule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showFirstDeleteDialog, setShowFirstDeleteDialog] = useState(false);
  const [showSecondDeleteDialog, setShowSecondDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [clients, setClients] = useState<{ _id: string; name: string; email?: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [sharingClientId, setSharingClientId] = useState<string | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; exercise: Exercise | null }>({
    open: false,
    exercise: null,
  });
  const [selectedExerciseKey, setSelectedExerciseKey] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0` : "";
  };

  // Helper function to navigate to correct dashboard
  const navigateToDashboard = () => {
    if (userType === 'trainer') {
      navigate('/trainer/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  // Fetch schedule from database
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await getScheduleById(id);
        console.log('Fetched schedule:', data);
        console.log('First day exercises:', data.days?.[0]?.exercises);
        setSchedule(data);
        setSelectedDay(data.days?.[0]?.dayNumber ?? null);
      } catch (error: any) {
        console.error('Error fetching schedule:', error);
        toast({
          title: "Error",
          description: "Failed to load schedule",
          variant: "destructive",
        });
        navigateToDashboard();
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [id]);

  const canShare = userType === "trainer" && String(schedule?.userId || "") === String(user?._id || "");

  const openShareDialog = async () => {
    if (!user?._id) return;
    setShowShareDialog(true);
    setIsLoadingClients(true);
    try {
      const data = await getTrainerClients(user._id);
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast({
        title: "Couldn't load clients",
        description: "Connect with a client before sharing this schedule",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleShareWithClient = async (client: { _id: string; name: string }) => {
    if (!schedule?._id) return;
    try {
      setSharingClientId(client._id);
      await shareSchedule({
        receiverId: client._id,
        scheduleId: schedule._id,
        scheduleTitle: schedule.title,
        scheduleDays: schedule.days?.length || 0,
      });
      toast({
        title: "Schedule shared",
        description: `"${schedule.title}" was sent to ${client.name} in chat`,
      });
      setShowShareDialog(false);
    } catch (error: any) {
      console.error("Error sharing schedule:", error);
      toast({
        title: "Share failed",
        description: error.response?.data?.message || "Couldn't send this schedule",
        variant: "destructive",
      });
    } finally {
      setSharingClientId(null);
    }
  };

  const handleFirstDelete = () => {
    setShowFirstDeleteDialog(false);
    setShowSecondDeleteDialog(true);
  };

  const handleFinalDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteSchedule(id);
      
      toast({
        title: "Schedule Deleted",
        description: "Your schedule has been permanently removed",
      });
      
      setShowSecondDeleteDialog(false);
      navigateToDashboard();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || "Failed to delete schedule",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const openVideoDialog = (exercise: Exercise) => {
    console.log('Opening video for exercise:', exercise);
    setVideoDialog({ open: true, exercise });
    setShowControls(true);
    setIsPlaying(false);
  };

  const closeVideoDialog = () => {
    setVideoDialog({ open: false, exercise: null });
    setIsFullscreen(false);
    setShowControls(true);
    setIsPlaying(false);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
        (videoContainerRef.current as any).webkitRequestFullscreen();
      } else if ((videoContainerRef.current as any).msRequestFullscreen) {
        (videoContainerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const togglePlayPause = () => {
    if (!iframeRef.current) return;
    
    try {
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      const message = JSON.stringify({
        event: 'command',
        func: command,
        args: []
      });
      
      iframeRef.current.contentWindow?.postMessage(message, '*');
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  // Auto-hide controls after 3 seconds in fullscreen
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    setShowControls(true);
    
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Handle mouse movement in fullscreen
  const handleMouseMove = () => {
    if (isFullscreen) {
      resetControlsTimeout();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        resetControlsTimeout();
      } else {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Schedule not found</p>
          <Button onClick={navigateToDashboard}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const activeDay =
    schedule.days?.find((day: DaySchedule) => day.dayNumber === selectedDay) || schedule.days?.[0];
  const activeExercises: Exercise[] = activeDay?.exercises ?? [];
  const matchedIndex = activeExercises.findIndex(
    (exercise, index) => exerciseKey(exercise, index) === selectedExerciseKey
  );
  const selectedIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const selectedExercise = activeExercises[selectedIndex] || null;
  const selectedKey = selectedExercise ? exerciseKey(selectedExercise, selectedIndex) : null;
  const heroVideoId = getYouTubeId(selectedExercise?.videoUrl);
  const heroImage = heroVideoId && !heroImageFailed
    ? `https://i.ytimg.com/vi/${heroVideoId}/hqdefault.jpg`
    : "";
  const minutes = sessionMinutes(activeExercises);
  const isOwner = String(schedule.userId || "") === String(user?._id || "");
  const dayCount = schedule.days?.length || 0;

  const startWorkout = () => {
    if (selectedExercise) openVideoDialog(selectedExercise);
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="relative mx-auto min-h-screen max-w-lg bg-background md:my-4 md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[var(--shadow-card)]">
        <section className="relative h-72 overflow-hidden sm:h-80">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setHeroImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[image:var(--gradient-hero)]">
              <Dumbbell className="absolute -right-6 bottom-10 h-40 w-40 -rotate-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={navigateToDashboard}
              aria-label="Back to dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/55"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-10 w-10 border-white/30 bg-white/90 text-neutral-900 hover:bg-white" />
              {canShare && (
                <button
                  type="button"
                  onClick={openShareDialog}
                  aria-label="Share schedule"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/55"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowFirstDeleteDialog(true)}
                  aria-label="Delete schedule"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/55"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {selectedExercise?.videoUrl ? (
            <button
              type="button"
              onClick={() => openVideoDialog(selectedExercise)}
              className="absolute inset-x-4 bottom-16 flex items-center gap-3 rounded-full bg-black/45 px-3 py-2 text-left text-white backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block h-1 rounded-full bg-white/40" />
                <span className="mt-1 block truncate text-xs">Play {selectedExercise.name}</span>
              </span>
              <Maximize2 className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <p className="absolute inset-x-5 bottom-16 truncate text-sm font-medium text-white">
              {selectedExercise?.name || schedule.title}
            </p>
          )}
        </section>

        <section className="relative -mt-5 rounded-t-[28px] bg-background px-5 pb-36 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 font-heading text-2xl text-foreground">{schedule.title}</h1>
            {minutes > 0 && (
              <span
                className="mt-1 flex shrink-0 items-center gap-1 text-sm text-muted-foreground"
                title="Estimated from one minute per set"
              >
                <Clock className="h-4 w-4 text-accent" />
                ~{minutes} min
              </span>
            )}
          </div>

          <p className="mt-2 text-sm">
            <span className="font-semibold text-primary">Day {activeDay?.dayNumber || 1}</span>
            <span className="text-muted-foreground">
              {" "}
              · {activeExercises.length} {activeExercises.length === 1 ? "exercise" : "exercises"}
              {dayCount > 1 ? ` · ${dayCount} days` : ""}
            </span>
          </p>

          <h2 className="mt-5 text-base font-semibold text-foreground">Description</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {schedule.description ||
              selectedExercise?.description ||
              "Follow the exercises in this session, then move on to the next day."}
          </p>

          {dayCount > 1 && (
            <div className="mt-5">
              <h2 className="text-base font-semibold text-foreground">Sessions</h2>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {schedule.days?.map((dayData: DaySchedule) => {
                  const isActive = dayData.dayNumber === activeDay?.dayNumber;
                  return (
                    <button
                      key={dayData.dayNumber}
                      type="button"
                      onClick={() => {
                        setSelectedDay(dayData.dayNumber);
                        setSelectedExerciseKey(null);
                        setHeroImageFailed(false);
                      }}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/70"
                      }`}
                    >
                      Day {dayData.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h2 className="mt-5 text-base font-semibold text-foreground">Select an exercise</h2>
          <div key={activeDay?.dayNumber} className="mt-3 space-y-3">
              {activeExercises.length ? (
                activeExercises.map((exercise, index) => {
                  const key = exerciseKey(exercise, index);
                  const isSelected = key === selectedKey;
                  const minutesForExercise = Number(exercise.sets) || 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedExerciseKey(key);
                        setHeroImageFailed(false);
                      }}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <ExerciseThumb name={exercise.name} videoUrl={exercise.videoUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-foreground">{exercise.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {exercise.sets} sets · {exercise.reps} reps
                        </span>
                      </span>
                      {minutesForExercise > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                          ~{minutesForExercise} min
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                  No exercises in this session yet.
                </div>
              )}
          </div>
        </section>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <div className="pointer-events-none mx-auto max-w-lg bg-gradient-to-t from-background via-background to-transparent px-5 pb-5 pt-8">
            <Button
              type="button"
              onClick={startWorkout}
              disabled={!selectedExercise}
              className="pointer-events-auto h-14 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90"
            >
              Start workout
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Share in chat</DialogTitle>
            <DialogDescription>
              Send "{schedule.title}" to a connected client. They can open it from Messages.
            </DialogDescription>
          </DialogHeader>
          {isLoadingClients ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No connected clients yet. Connect with a client, then share this schedule.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  disabled={sharingClientId !== null}
                  onClick={() => handleShareWithClient(client)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{client.name}</span>
                    {client.email ? (
                      <span className="block truncate text-xs text-muted-foreground">{client.email}</span>
                    ) : null}
                  </span>
                  {sharingClientId === client._id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* First Delete Confirmation Dialog */}
      <AlertDialog open={showFirstDeleteDialog} onOpenChange={setShowFirstDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{schedule.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Delete Confirmation Dialog */}
      <AlertDialog open={showSecondDeleteDialog} onOpenChange={setShowSecondDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This is your last chance! Once deleted, all exercises and progress for this schedule will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80" disabled={isDeleting}>
              Keep Schedule
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Dialog */}
      <Dialog open={videoDialog.open} onOpenChange={(open) => !open && closeVideoDialog()}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl flex items-center justify-between">
              <span>{videoDialog.exercise?.name}</span>
              {!isFullscreen && videoDialog.exercise?.videoUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title={isPlaying ? "Pause video" : "Play video"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Enter fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {videoDialog.exercise && (
            <div className="space-y-4">
              {/* Video Player */}
              {videoDialog.exercise.videoUrl ? (
                <div 
                  ref={videoContainerRef}
                  className="aspect-video bg-black rounded-lg overflow-hidden relative group"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => isFullscreen && setShowControls(true)}
                >
                  <iframe
                    ref={iframeRef}
                    src={getYouTubeEmbedUrl(videoDialog.exercise.videoUrl)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={videoDialog.exercise.name}
                  />
                  
                  {/* Center Play/Pause Button - Only show when NOT playing */}
                  {!isPlaying && (
                    <div 
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                        showControls ? 'opacity-100' : 'opacity-0'
                      } group-hover:opacity-100`}
                      style={{ pointerEvents: 'none' }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayPause();
                        }}
                        className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white rounded-full p-6 transition-all transform hover:scale-110 shadow-2xl"
                        style={{ pointerEvents: 'auto' }}
                        title="Play"
                      >
                        <Play className="h-12 w-12 fill-current" />
                      </button>
                    </div>
                  )}
                  
                  {/* Fullscreen Controls Overlay */}
                  {isFullscreen && (
                    <div 
                      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 transition-opacity duration-300 ${
                        showControls ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ pointerEvents: showControls ? 'auto' : 'none' }}
                    >
                      {/* Top Controls */}
                      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                        <h3 className="text-white text-lg font-semibold drop-shadow-lg">
                          {videoDialog.exercise.name}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={closeVideoDialog}
                          className="h-10 w-10 text-white hover:bg-white/20 rounded-full"
                          title="Close"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      {/* Bottom Controls */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={togglePlayPause}
                          className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6 fill-current" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
                          title="Exit fullscreen"
                        >
                          <Minimize2 className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No video available</p>
                    <p className="text-sm mt-2">This exercise doesn't have a video tutorial yet</p>
                  </div>
                </div>
              )}

              {/* Exercise Details */}
              {!isFullscreen && (
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sets</span>
                    <span className="font-semibold text-foreground">{videoDialog.exercise.sets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reps</span>
                    <span className="font-semibold text-foreground">{videoDialog.exercise.reps}</span>
                  </div>
                  {videoDialog.exercise.description && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {videoDialog.exercise.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleDetail;