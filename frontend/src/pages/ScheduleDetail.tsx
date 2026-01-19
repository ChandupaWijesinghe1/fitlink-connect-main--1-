import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Play, Trash2, Loader2, Maximize2, Minimize2, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getScheduleById, deleteSchedule } from "@/api/schedules";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

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

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, userType } = useAuth();
  
  const [schedule, setSchedule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [showFirstDeleteDialog, setShowFirstDeleteDialog] = useState(false);
  const [showSecondDeleteDialog, setShowSecondDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; exercise: Exercise | null }>({
    open: false,
    exercise: null,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to convert YouTube URLs to embed format
  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    try {
      url = url.trim();
      
      let videoId = '';
      
      // Already an embed URL
      if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split('?')[0];
      }
      // Handle youtube.com/watch?v=VIDEO_ID
      else if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v') || '';
      }
      // Handle youtu.be/VIDEO_ID
      else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
      }
      // Handle youtube.com/v/VIDEO_ID
      else if (url.includes('youtube.com/v/')) {
        videoId = url.split('youtube.com/v/')[1].split('?')[0].split('&')[0];
      }
      
      if (videoId) {
        // Add enablejsapi=1 for API control
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
      }
      
      console.warn('Could not parse YouTube URL:', url);
      return '';
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return '';
    }
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

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToDashboard}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFirstDeleteDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {schedule.title}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {schedule.description || "No description provided"}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
              {schedule.days?.length || 0} Days
            </span>
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {schedule.days?.reduce((acc: number, day: DaySchedule) => acc + day.exercises.length, 0) || 0} Exercises
            </span>
          </div>
        </motion.div>

        {/* Days Accordion */}
        <div className="space-y-4">
          {schedule.days?.map((dayData: DaySchedule, index: number) => (
            <motion.div
              key={dayData.dayNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                {/* Day Header - Clickable */}
                <button
                  onClick={() => toggleDay(dayData.dayNumber)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">
                        {dayData.dayNumber}
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-foreground">
                        Day {dayData.dayNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {dayData.exercises.length} exercises
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedDays.includes(dayData.dayNumber) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Exercises List - Expandable */}
                <AnimatePresence>
                  {expandedDays.includes(dayData.dayNumber) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="pt-0 pb-4 px-6">
                        <div className="border-t border-border/50 pt-4 space-y-3">
                          {dayData.exercises.map((exercise: Exercise) => (
                            <motion.div
                              key={exercise.exerciseId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">
                                  {exercise.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {exercise.sets} sets × {exercise.reps} reps
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVideoDialog(exercise)}
                                className={`h-10 w-10 rounded-full ${
                                  exercise.videoUrl 
                                    ? 'bg-primary/20 hover:bg-primary/30 text-primary' 
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                title={exercise.videoUrl ? "Watch video" : "No video available"}
                              >
                                <Play className="h-4 w-4 fill-current" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

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
        <DialogContent className="bg-card border-border max-w-3xl">
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