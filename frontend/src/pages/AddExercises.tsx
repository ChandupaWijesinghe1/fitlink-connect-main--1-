import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Check, Edit2, X, Dumbbell, Minus, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { getAllExercises } from "@/api/exercises";
import { createSchedule } from "@/api/schedules";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  _id: string;
  name: string;
  sets: number;
  reps: number;
  uniqueId?: string;
    videoUrl?: string;      // ← Add this
  description?: string;   // ← Add this
}

const AddExercises = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userType } = useAuth();  // ← Get userType as well
  const { toast } = useToast();
  
  const scheduleData = location.state || { title: "My Schedule", days: 3, description: "" };
  const numberOfDays = scheduleData.days || 3;

  const [currentDay, setCurrentDay] = useState(1);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [dayExercises, setDayExercises] = useState<{ [key: number]: Exercise[] }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDay, setEditingDay] = useState<number | null>(null);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Helper function to navigate to correct dashboard
  const navigateToDashboard = () => {
    if (userType === 'trainer') {
      navigate('/trainer/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  // Fetch exercises from backend
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setIsLoadingExercises(true);
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
        setIsLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [toast]);

  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addExercise = (exercise: Exercise) => {
    const newExercise = { 
      ...exercise, 
      uniqueId: `${exercise._id}-${Date.now()}` 
    };
    setDayExercises((prev) => ({
      ...prev,
      [currentDay]: [...(prev[currentDay] || []), newExercise],
    }));
    setSearchQuery("");
  };

  const removeExercise = (day: number, uniqueId: string) => {
    setDayExercises((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((e) => e.uniqueId !== uniqueId),
    }));
  };

  const updateExerciseSets = (day: number, uniqueId: string, delta: number) => {
    setDayExercises((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((e) =>
        e.uniqueId === uniqueId ? { ...e, sets: Math.max(1, e.sets + delta) } : e
      ),
    }));
  };

  const updateExerciseReps = (day: number, uniqueId: string, delta: number) => {
    setDayExercises((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((e) =>
        e.uniqueId === uniqueId ? { ...e, reps: Math.max(1, e.reps + delta) } : e
      ),
    }));
  };

  const completeDay = () => {
    if (!completedDays.includes(currentDay)) {
      setCompletedDays((prev) => [...prev, currentDay]);
    }
    if (currentDay < numberOfDays) {
      setCurrentDay(currentDay + 1);
    }
    setEditingDay(null);
  };

  const editDay = (day: number) => {
    setEditingDay(day);
    setCurrentDay(day);
    setCompletedDays((prev) => prev.filter((d) => d !== day));
  };

  // Save schedule to database
  const saveSchedule = async () => {
    if (!user?._id) {
      toast({
        title: "Error",
        description: "You must be logged in to save a schedule",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingSchedule(true);

      // Transform dayExercises to match backend format
      // Transform dayExercises to match backend format
    const days = Object.keys(dayExercises).map((dayNumber) => ({
      dayNumber: parseInt(dayNumber),
      exercises: dayExercises[parseInt(dayNumber)].map((exercise) => ({
        exerciseId: exercise._id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        videoUrl: exercise.videoUrl || null,      // ← Add this
        description: exercise.description || null, // ← Add this
      })),
    }));

      const schedulePayload = {
        title: scheduleData.title,
        description: scheduleData.description,
        days: days,
        userId: user._id,
        trainer: 'self',
      };

      console.log('Saving schedule:', schedulePayload);

      await createSchedule(schedulePayload);

      toast({
        title: "Success!",
        description: "Your schedule has been saved",
      });

      // Navigate to correct dashboard based on user type
      navigateToDashboard();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Save Failed",
        description: error.response?.data?.message || "Failed to save schedule",
        variant: "destructive",
      });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const allDaysCompleted = completedDays.length === numberOfDays;
  const isLastDay = currentDay === numberOfDays;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/schedule/create")}
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{scheduleData.title}</h1>
              <p className="text-sm text-muted-foreground">Add exercises for each day</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {completedDays.length}/{numberOfDays} Days
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: numberOfDays }, (_, i) => i + 1).map((day) => (
            <motion.button
              key={day}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (completedDays.includes(day) || day === currentDay) {
                  setCurrentDay(day);
                }
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                currentDay === day
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30"
                  : completedDays.includes(day)
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground border border-border/30"
              }`}
            >
              {completedDays.includes(day) && <Check className="h-4 w-4" />}
              Day {day}
            </motion.button>
          ))}
        </div>

        {/* Day Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-border/30 mb-6 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border/20 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                      <Dumbbell className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <span>Day {currentDay}</span>
                      <p className="text-sm font-normal text-muted-foreground mt-0.5">
                        {(dayExercises[currentDay] || []).length} exercises added
                      </p>
                    </div>
                  </CardTitle>
                  {completedDays.includes(currentDay) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editDay(currentDay)}
                      className="border-border/50 rounded-xl"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {/* Added Exercises */}
                <div className="space-y-3">
                  {(dayExercises[currentDay] || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Dumbbell className="h-10 w-10 opacity-40" />
                      </div>
                      <p className="font-medium">No exercises added yet</p>
                      <p className="text-sm mt-1">Search and add exercises below</p>
                    </div>
                  ) : (
                    (dayExercises[currentDay] || []).map((exercise, index) => (
                      <motion.div
                        key={exercise.uniqueId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{exercise.name}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(currentDay, exercise.uniqueId!)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Sets and Reps Controls */}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 bg-background/50 rounded-xl p-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateExerciseSets(currentDay, exercise.uniqueId!, -1)}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className="text-center min-w-[60px]">
                              <span className="text-lg font-bold text-foreground">{exercise.sets}</span>
                              <span className="text-xs text-muted-foreground ml-1">sets</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateExerciseSets(currentDay, exercise.uniqueId!, 1)}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-background/50 rounded-xl p-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateExerciseReps(currentDay, exercise.uniqueId!, -1)}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className="text-center min-w-[60px]">
                              <span className="text-lg font-bold text-foreground">{exercise.reps}</span>
                              <span className="text-xs text-muted-foreground ml-1">reps</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateExerciseReps(currentDay, exercise.uniqueId!, 1)}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Search Section - Always Visible */}
                <div className="space-y-4 pt-4 border-t border-border/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Browse Exercises
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  {isLoadingExercises ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading exercises...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-xl border border-border/20 p-3 bg-muted/20">
                      {filteredExercises.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-muted-foreground">
                          No exercises found
                        </div>
                      ) : (
                        filteredExercises.map((exercise) => (
                          <motion.button
                            key={exercise._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addExercise(exercise)}
                            className="flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Plus className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{exercise.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {exercise.sets}×{exercise.reps}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Complete Day / Complete Schedule Button - Always Visible */}
                <div className="pt-4">
                  {allDaysCompleted ? (
                    <Button
                      onClick={saveSchedule}
                      disabled={isSavingSchedule}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 rounded-xl disabled:opacity-50"
                    >
                      {isSavingSchedule ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Saving Schedule...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Complete Your Schedule
                        </>
                      )}
                    </Button>
                  ) : isLastDay && !completedDays.includes(currentDay) ? (
                    <Button
                      onClick={completeDay}
                      disabled={(dayExercises[currentDay] || []).length === 0}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 shadow-lg shadow-primary/25 rounded-xl"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Complete Day {currentDay}
                    </Button>
                  ) : (
                    <Button
                      onClick={completeDay}
                      disabled={(dayExercises[currentDay] || []).length === 0}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 shadow-lg shadow-primary/25 rounded-xl"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Complete Day {currentDay} & Continue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AddExercises;