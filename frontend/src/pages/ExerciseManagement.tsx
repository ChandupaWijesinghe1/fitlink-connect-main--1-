import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Youtube, 
  Loader2,
  Dumbbell,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { 
  getAllExercises, 
  createExercise, 
  updateExercise, 
  deleteExercise,
  Exercise 
} from "@/api/exercises";
import { useAuth } from "@/context/AuthContext";

const ExerciseManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userType } = useAuth();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [exerciseDialog, setExerciseDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    exercise: Exercise | null;
  }>({
    open: false,
    mode: 'create',
    exercise: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    exerciseId: string | null;
    exerciseName: string;
  }>({
    open: false,
    exerciseId: null,
    exerciseName: '',
  });

  // Form state
  const [formData, setFormData] = useState<Exercise>({
    name: '',
    sets: 3,
    reps: 10,
    videoUrl: '',
    description: '',
  });

  // Navigate to correct dashboard
  const navigateToDashboard = () => {
    if (userType === 'trainer') {
      navigate('/trainer/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  // Fetch exercises
  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      const data = await getAllExercises();
      setExercises(data);
    } catch (error: any) {
      console.error('Error fetching exercises:', error);
      toast({
        title: "Error",
        description: "Failed to load exercises",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter exercises
  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Validate YouTube URL
  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setFormData({
      name: '',
      sets: 3,
      reps: 10,
      videoUrl: '',
      description: '',
    });
    setExerciseDialog({
      open: true,
      mode: 'create',
      exercise: null,
    });
  };

  // Open edit dialog
  const openEditDialog = (exercise: Exercise) => {
    setFormData({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      videoUrl: exercise.videoUrl || '',
      description: exercise.description || '',
    });
    setExerciseDialog({
      open: true,
      mode: 'edit',
      exercise,
    });
  };

  // Handle form submit
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Exercise name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.videoUrl && !isValidYouTubeUrl(formData.videoUrl)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const exerciseData: Exercise = {
        name: formData.name.trim(),
        sets: formData.sets,
        reps: formData.reps,
        videoUrl: formData.videoUrl.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      if (exerciseDialog.mode === 'create') {
        await createExercise(exerciseData);
        toast({
          title: "Success!",
          description: "Exercise created successfully",
        });
      } else if (exerciseDialog.exercise?._id) {
        await updateExercise(exerciseDialog.exercise._id, exerciseData);
        toast({
          title: "Success!",
          description: "Exercise updated successfully",
        });
      }

      setExerciseDialog({ open: false, mode: 'create', exercise: null });
      fetchExercises();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save exercise",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.exerciseId) return;

    try {
      await deleteExercise(deleteDialog.exerciseId);
      toast({
        title: "Deleted!",
        description: "Exercise deleted successfully",
      });
      setDeleteDialog({ open: false, exerciseId: null, exerciseName: '' });
      fetchExercises();
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete exercise",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateToDashboard}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Exercise Library</h1>
                <p className="text-sm text-muted-foreground">Manage your exercise database</p>
              </div>
            </div>
            <Button
              onClick={openCreateDialog}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-card border-border"
            />
          </div>
        </div>

        {/* Exercise List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading exercises...</p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No exercises found" : "No exercises yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Try a different search term" 
                : "Get started by adding your first exercise"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Exercise
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredExercises.map((exercise, index) => (
                <motion.div
                  key={exercise._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="bg-card hover:border-primary/30 transition-all">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-foreground flex items-start justify-between">
                        <span className="flex-1">{exercise.name}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(exercise)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog({
                              open: true,
                              exerciseId: exercise._id || null,
                              exerciseName: exercise.name,
                            })}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Sets:</span>
                          <span className="font-semibold text-foreground">{exercise.sets}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Reps:</span>
                          <span className="font-semibold text-foreground">{exercise.reps}</span>
                        </div>
                      </div>

                      {exercise.videoUrl && (
                        <div className="flex items-center gap-2 text-sm">
                          <Youtube className="h-4 w-4 text-red-500" />
                          <span className="text-muted-foreground">Video tutorial available</span>
                        </div>
                      )}

                      {exercise.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {exercise.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create/Edit Exercise Dialog */}
      <Dialog 
        open={exerciseDialog.open} 
        onOpenChange={(open) => !open && setExerciseDialog({ open: false, mode: 'create', exercise: null })}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {exerciseDialog.mode === 'create' ? 'Add New Exercise' : 'Edit Exercise'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {exerciseDialog.mode === 'create' 
                ? 'Create a new exercise for your library' 
                : 'Update exercise details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Exercise Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Exercise Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Push-ups"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-muted/30 border-border/50"
              />
            </div>

            {/* Sets and Reps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets" className="text-foreground">
                  Default Sets *
                </Label>
                <Input
                  id="sets"
                  type="number"
                  min="1"
                  value={formData.sets}
                  onChange={(e) => setFormData(prev => ({ ...prev, sets: parseInt(e.target.value) || 1 }))}
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reps" className="text-foreground">
                  Default Reps *
                </Label>
                <Input
                  id="reps"
                  type="number"
                  min="1"
                  value={formData.reps}
                  onChange={(e) => setFormData(prev => ({ ...prev, reps: parseInt(e.target.value) || 1 }))}
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl" className="text-foreground flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube Video URL (Optional)
              </Label>
              <Input
                id="videoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="bg-muted/30 border-border/50"
              />
              {formData.videoUrl && !isValidYouTubeUrl(formData.videoUrl) && (
                <p className="text-xs text-destructive">Please enter a valid YouTube URL</p>
              )}
              <p className="text-xs text-muted-foreground">
                Add a tutorial video for this exercise
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description (Optional)
              </Label>
              <Input
                id="description"
                placeholder="e.g., Keep your core tight and back straight..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-muted/30 border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Add tips or notes about proper form
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExerciseDialog({ open: false, mode: 'create', exercise: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {exerciseDialog.mode === 'create' ? 'Create Exercise' : 'Update Exercise'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, exerciseId: null, exerciseName: '' })}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Exercise?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{deleteDialog.exerciseName}"? This action cannot be undone.
              This will not affect existing schedules that use this exercise.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Exercise
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExerciseManagement;