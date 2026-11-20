import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Loader2,
  Percent,
  Ruler,
  Scale,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as WorkoutCalendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "@/components/ThemeToggle";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import {
  getProgress,
  getClientProgressForTrainer,
  saveDailyLog,
  saveMeasurement,
  saveProgressPhotos,
  updateProgressSettings,
} from "@/api/progress";
import {
  addDays,
  compressAndPrivacyBlur,
  deltaLabel,
  filterByRange,
  movingAverage,
  todayISO,
} from "@/lib/progressUtils";
import { toast } from "sonner";

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "3 months", value: 90 },
  { label: "6 months", value: 180 },
];

const MEASUREMENT_KEYS = [
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "hip", label: "Hip (cm)" },
  { key: "arm", label: "Arm (cm)" },
  { key: "thigh", label: "Thigh (cm)" },
  { key: "neck", label: "Neck (cm)" },
] as const;

const DAILY_ADD_STEPS = [
  { key: "date", title: "Date", kind: "date" },
  { key: "weight", title: "Weight", unit: "kg", kind: "daily" },
  { key: "calories", title: "Calories", unit: "kcal", kind: "daily" },
  { key: "protein", title: "Protein", unit: "g", kind: "daily" },
  { key: "steps", title: "Steps", unit: "steps", kind: "daily" },
] as const;

const WEEKLY_ADD_STEPS = [
  { key: "date", title: "Date", kind: "date" },
  { key: "workout", title: "Workout", kind: "workout" },
  ...MEASUREMENT_KEYS.map((item) => ({
    key: item.key,
    title: item.label.replace(" (cm)", ""),
    unit: "cm",
    kind: "measure",
  })),
] as const;

const ClientProgress = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { user, userType, isLoading: authLoading } = useAuth();
  const viewOnly = Boolean(clientId);
  const [clientName, setClientName] = useState("");
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);
  const [openWindow, setOpenWindow] = useState<string | null>(null);
  const [listAdding, setListAdding] = useState(false);
  const [addGroup, setAddGroup] = useState<"daily" | "weekly" | null>(null);
  const [addStep, setAddStep] = useState(0);
  const [measurementKey, setMeasurementKey] = useState<(typeof MEASUREMENT_KEYS)[number]["key"]>("waist");
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");

  const [dailyForm, setDailyForm] = useState({
    date: todayISO(),
    weight: "",
    calories: "",
    protein: "",
    steps: "",
    workoutCompleted: false,
  });
  const [measureForm, setMeasureForm] = useState({
    date: todayISO(),
    chest: "",
    waist: "",
    hip: "",
    arm: "",
    thigh: "",
    neck: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    gender: "male",
    heightCm: "",
  });
  const [photoForm, setPhotoForm] = useState({
    date: todayISO(),
    front: "",
    side: "",
    back: "",
  });

  useEffect(() => {
    if (!viewOnly && userType && userType !== "client") navigate("/trainer/dashboard");
  }, [userType, navigate, viewOnly]);

  const loadProgress = async () => {
    try {
      setIsLoading(true);
      const payload = viewOnly
        ? await getClientProgressForTrainer(clientId)
        : { progress: await getProgress() };
      const data = payload?.progress;
      if (!data) throw new Error("Progress data was missing");
      setClientName(payload.client?.name || "");
      setProgress(data);
      setSettingsForm({
        gender: data.gender || "male",
        heightCm: data.heightCm ?? "",
      });
      const photos = data.photos || [];
      if (photos.length) {
        setBeforeDate(photos[0].date);
        setAfterDate(photos[photos.length - 1].date);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load progress");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?._id) {
      setIsLoading(false);
      navigate(viewOnly ? "/trainer/login" : "/");
      return;
    }
    loadProgress();
  }, [authLoading, user?._id, clientId, viewOnly, navigate]);

  const logs = Array.isArray(progress?.dailyLogs) ? progress.dailyLogs : [];
  const measurements = Array.isArray(progress?.measurements) ? progress.measurements : [];
  const photos = Array.isArray(progress?.photos) ? progress.photos : [];
  const goals = progress?.goals || {};

  const rangedLogs = useMemo(() => filterByRange(logs, rangeDays), [logs, rangeDays]);
  const previousLogs = useMemo(() => {
    const start = addDays(todayISO(), -rangeDays * 2 + 1);
    const end = addDays(todayISO(), -rangeDays);
    return logs.filter((log: any) => log.date >= start && log.date <= end);
  }, [logs, rangeDays]);

  const avg = (rows: any[], key: string) => {
    const values = rows.map((row) => row[key]).filter((value: any) => value != null);
    if (!values.length) return null;
    return Number((values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1));
  };

  const latestLog = [...logs].reverse().find(Boolean);
  const latestWeight = [...logs].reverse().find((log: any) => log.weight != null)?.weight ?? null;
  const latestFat = [...measurements].reverse().find((row: any) => row.estimatedBodyFat != null)?.estimatedBodyFat ?? null;
  const previousFat = [...measurements].slice(0, -1).reverse().find((row: any) => row.estimatedBodyFat != null)?.estimatedBodyFat ?? null;
  const workoutRate = rangedLogs.length
    ? Number(((rangedLogs.filter((log: any) => log.workoutCompleted).length / rangedLogs.length) * 100).toFixed(0))
    : 0;
  const previousWorkoutRate = previousLogs.length
    ? Number(((previousLogs.filter((log: any) => log.workoutCompleted).length / previousLogs.length) * 100).toFixed(0))
    : null;

  const weightChart = useMemo(() => {
    const weights = rangedLogs.map((log: any) => log.weight);
    const averages = movingAverage(weights);
    return rangedLogs.map((log: any, index: number) => ({
      date: String(log.date).slice(5, 10),
      weight: log.weight,
      average: averages[index],
    }));
  }, [rangedLogs]);

  const calorieChart = rangedLogs.map((log: any) => ({ date: String(log.date).slice(5, 10), calories: log.calories }));
  const proteinChart = rangedLogs.map((log: any) => ({ date: String(log.date).slice(5, 10), protein: log.protein }));
  const stepsChart = rangedLogs.map((log: any) => ({ date: String(log.date).slice(5, 10), steps: log.steps }));

  const heatmapDays = useMemo(() => {
    const start = addDays(todayISO(), -83);
    return Array.from({ length: 84 }, (_, index) => {
      const date = addDays(start, index);
      const log = logs.find((row: any) => row.date === date);
      return { date, completed: Boolean(log?.workoutCompleted) };
    });
  }, [logs]);

  const completedWorkouts = heatmapDays.filter((day) => day.completed).length;
  const weeklyCompletion = Number(((heatmapDays.slice(-7).filter((day) => day.completed).length / 7) * 100).toFixed(0));
  const workoutDates = useMemo(
    () =>
      logs
        .filter((log: any) => log.workoutCompleted && log.date)
        .map((log: any) => {
          const raw = String(log.date).slice(0, 10);
          const parsed = new Date(`${raw}T12:00:00`);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        })
        .filter(Boolean) as Date[],
    [logs]
  );

  const measurementChart = measurements.map((row: any) => ({
    date: row.date,
    value: row[measurementKey],
  }));
  const fatChart = measurements
    .filter((row: any) => row.estimatedBodyFat != null)
    .map((row: any) => ({ date: row.date, bodyFat: row.estimatedBodyFat }));

  const latestMeasurement = measurements[measurements.length - 1];
  const previousMeasurement = measurements[measurements.length - 2];
  const measurementChange =
    latestMeasurement && previousMeasurement && latestMeasurement[measurementKey] != null && previousMeasurement[measurementKey] != null
      ? Number((latestMeasurement[measurementKey] - previousMeasurement[measurementKey]).toFixed(1))
      : null;

  const beforeSet = photos.find((set: any) => set.date === beforeDate) || photos[0];
  const afterSet = photos.find((set: any) => set.date === afterDate) || photos[photos.length - 1];

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const data = await updateProgressSettings({
        gender: settingsForm.gender,
        heightCm: settingsForm.heightCm === "" ? null : Number(settingsForm.heightCm),
      });
      setProgress(data);
      toast.success("Profile details saved");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDaily = async () => {
    try {
      setSaving(true);
      const data = await saveDailyLog({
        date: dailyForm.date,
        weight: dailyForm.weight === "" ? null : Number(dailyForm.weight),
        calories: dailyForm.calories === "" ? null : Number(dailyForm.calories),
        protein: dailyForm.protein === "" ? null : Number(dailyForm.protein),
        steps: dailyForm.steps === "" ? null : Number(dailyForm.steps),
        workoutCompleted: dailyForm.workoutCompleted,
      });
      setProgress(data);
      toast.success("Daily log saved");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not save daily log");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurement = async () => {
    try {
      setSaving(true);
      const payload = {
        date: measureForm.date,
        chest: measureForm.chest === "" ? null : Number(measureForm.chest),
        waist: measureForm.waist === "" ? null : Number(measureForm.waist),
        hip: measureForm.hip === "" ? null : Number(measureForm.hip),
        arm: measureForm.arm === "" ? null : Number(measureForm.arm),
        thigh: measureForm.thigh === "" ? null : Number(measureForm.thigh),
        neck: measureForm.neck === "" ? null : Number(measureForm.neck),
      };
      const data = await saveMeasurement(payload);
      setProgress(data);
      toast.success("Measurement saved. Body fat estimate updates when waist, neck and height are present.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not save measurement");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const dailyTouched =
      dailyForm.weight !== "" ||
      dailyForm.calories !== "" ||
      dailyForm.protein !== "" ||
      dailyForm.steps !== "" ||
      dailyForm.workoutCompleted;
    const measureTouched = MEASUREMENT_KEYS.some((item) => (measureForm as any)[item.key] !== "");
    if (!dailyTouched && !measureTouched) {
      toast.error("Enter at least one detail");
      return;
    }
    try {
      setSaving(true);
      if (dailyTouched) {
        const data = await saveDailyLog({
          date: dailyForm.date,
          weight: dailyForm.weight === "" ? null : Number(dailyForm.weight),
          calories: dailyForm.calories === "" ? null : Number(dailyForm.calories),
          protein: dailyForm.protein === "" ? null : Number(dailyForm.protein),
          steps: dailyForm.steps === "" ? null : Number(dailyForm.steps),
          workoutCompleted: dailyForm.workoutCompleted,
        });
        setProgress(data);
      }
      if (measureTouched) {
        const data = await saveMeasurement({
          date: measureForm.date || dailyForm.date,
          chest: measureForm.chest === "" ? null : Number(measureForm.chest),
          waist: measureForm.waist === "" ? null : Number(measureForm.waist),
          hip: measureForm.hip === "" ? null : Number(measureForm.hip),
          arm: measureForm.arm === "" ? null : Number(measureForm.arm),
          thigh: measureForm.thigh === "" ? null : Number(measureForm.thigh),
          neck: measureForm.neck === "" ? null : Number(measureForm.neck),
        });
        setProgress(data);
      }
      toast.success("Progress saved");
      setListAdding(false);
      setAddGroup(null);
      setAddStep(0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not save progress");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoFile = async (view: "front" | "side" | "back", file?: File) => {
    if (!file) return;
    try {
      const processed = await compressAndPrivacyBlur(file);
      setPhotoForm((current) => ({ ...current, [view]: processed }));
      toast.success(`${view} photo prepared with face-area privacy blur`);
    } catch {
      toast.error("Could not process that image");
    }
  };

  const handleSavePhotos = async () => {
    if (!photoForm.front && !photoForm.side && !photoForm.back) {
      toast.error("Add at least one photo");
      return;
    }
    try {
      setSaving(true);
      const data = await saveProgressPhotos(photoForm);
      setProgress(data);
      setBeforeDate((current) => current || photoForm.date);
      setAfterDate(photoForm.date);
      setPhotoForm({ date: todayISO(), front: "", side: "", back: "" });
      toast.success("Photos saved privately to your account");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not save photos");
    } finally {
      setSaving(false);
    }
  };

  const formatDay = (value?: string) => {
    if (!value) return "—";
    const raw = String(value).slice(0, 10);
    if (raw.length < 10) return raw;
    const date = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const percentChange = (current?: number | null, previous?: number | null) => {
    if (current == null || previous == null || previous === 0) return null;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  };

  const datedValue = (rows: any[], key: string) =>
    [...rows].reverse().filter((row) => row?.[key] != null && row[key] !== "");

  const openMetric = (id: string) => {
    if (MEASUREMENT_KEYS.some((item) => item.key === id)) {
      setMeasurementKey(id as (typeof MEASUREMENT_KEYS)[number]["key"]);
    }
    setOpenWindow(id);
  };

  const rangeIndex = Math.max(0, RANGE_OPTIONS.findIndex((option) => option.value === rangeDays));
  const rangeStart = addDays(todayISO(), -rangeDays + 1);
  const measurementItem = MEASUREMENT_KEYS.find((item) => item.key === openWindow);

  const metricCards = [
    {
      id: "weight",
      title: "Weight",
      value: latestWeight != null ? String(latestWeight) : "—",
      unit: "kg",
      date: datedValue(logs, "weight")[0]?.date,
      change: percentChange(latestWeight, datedValue(logs, "weight")[1]?.weight),
      icon: Scale,
    },
    {
      id: "calories",
      title: "Calories",
      value: datedValue(logs, "calories")[0]?.calories != null ? String(datedValue(logs, "calories")[0].calories) : "—",
      unit: "kcal",
      date: datedValue(logs, "calories")[0]?.date,
      change: percentChange(datedValue(logs, "calories")[0]?.calories, datedValue(logs, "calories")[1]?.calories),
      icon: Flame,
    },
    {
      id: "protein",
      title: "Protein",
      value: datedValue(logs, "protein")[0]?.protein != null ? String(datedValue(logs, "protein")[0].protein) : "—",
      unit: "g",
      date: datedValue(logs, "protein")[0]?.date,
      change: percentChange(datedValue(logs, "protein")[0]?.protein, datedValue(logs, "protein")[1]?.protein),
      icon: Flame,
    },
    {
      id: "steps",
      title: "Steps",
      value: datedValue(logs, "steps")[0]?.steps != null ? String(datedValue(logs, "steps")[0].steps) : "—",
      unit: "steps",
      date: datedValue(logs, "steps")[0]?.date,
      change: percentChange(datedValue(logs, "steps")[0]?.steps, datedValue(logs, "steps")[1]?.steps),
      icon: Footprints,
    },
    {
      id: "workout",
      title: "Workouts",
      value: String(workoutRate),
      unit: "%",
      date: datedValue(logs, "workoutCompleted").find((row) => row.workoutCompleted)?.date,
      change: previousWorkoutRate == null ? null : Number(workoutRate) - previousWorkoutRate,
      icon: CalendarDays,
    },
    ...MEASUREMENT_KEYS.map((item) => ({
      id: item.key,
      title: item.label.replace(" (cm)", ""),
      value: datedValue(measurements, item.key)[0]?.[item.key] != null ? String(datedValue(measurements, item.key)[0][item.key]) : "—",
      unit: "cm",
      date: datedValue(measurements, item.key)[0]?.date,
      change: percentChange(datedValue(measurements, item.key)[0]?.[item.key], datedValue(measurements, item.key)[1]?.[item.key]),
      icon: Ruler,
    })),
    {
      id: "bodyFat",
      title: "Body fat",
      value: latestFat != null ? String(latestFat) : "—",
      unit: "% est.",
      date: datedValue(measurements, "estimatedBodyFat")[0]?.date,
      change: percentChange(latestFat, previousFat),
      icon: Percent,
    },
    {
      id: "photos",
      title: "Photos",
      value: String(photos.length),
      unit: photos.length === 1 ? "set" : "sets",
      date: photos[photos.length - 1]?.date,
      change: null,
      icon: Camera,
    },
  ];

  const chartPoints = (() => {
    if (openWindow === "weight") return weightChart.map((row) => ({ date: row.date, value: row.weight }));
    if (openWindow === "calories") return calorieChart.map((row) => ({ date: row.date, value: row.calories }));
    if (openWindow === "protein") return proteinChart.map((row) => ({ date: row.date, value: row.protein }));
    if (openWindow === "steps") return stepsChart.map((row) => ({ date: row.date, value: row.steps }));
    if (openWindow === "bodyFat") return fatChart.map((row) => ({ date: String(row.date).slice(5, 10), value: row.bodyFat }));
    if (measurementItem) {
      return measurementChart
        .filter((row) => row.value != null)
        .map((row) => ({ date: String(row.date).slice(5, 10), value: row.value }));
    }
    return [];
  })();

  const history = [...chartPoints].reverse().filter((row) => row.value != null);
  const activeCard = metricCards.find((card) => card.id === openWindow);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader
          title={
            listAdding
              ? addGroup === "daily"
                ? "Daily inputs"
                : addGroup === "weekly"
                  ? "Weekly inputs"
                  : "Add progress"
              : openWindow
                ? activeCard?.title || "Progress"
                : viewOnly
                  ? `${clientName || "Client"}'s log`
                  : "Progress"
          }
          onBack={() => {
            if (listAdding) {
              if (addGroup) {
                setAddGroup(null);
                setAddStep(0);
                return;
              }
              setListAdding(false);
              return;
            }
            if (openWindow) {
              setOpenWindow(null);
              return;
            }
            navigate(viewOnly ? "/trainer/gym" : "/dashboard");
          }}
          action={<ThemeToggle className="h-10 w-10 rounded-xl border border-border bg-card" />}
        />

        {listAdding ? (
          <main className="space-y-5 px-5 py-4">
            {!addGroup ? (
              <>
                <p className="text-sm text-muted-foreground">Choose what you are logging, then add each detail one by one.</p>
                <button
                  type="button"
                  onClick={() => {
                    setAddStep(0);
                    setAddGroup("daily");
                  }}
                  className="flex w-full flex-col items-start gap-1 rounded-2xl border border-border bg-card px-4 py-4 text-left"
                >
                  <span className="text-base font-semibold text-foreground">Daily inputs</span>
                  <span className="text-sm text-muted-foreground">Date, weight, calories, protein, steps</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddStep(0);
                    setAddGroup("weekly");
                  }}
                  className="flex w-full flex-col items-start gap-1 rounded-2xl border border-border bg-card px-4 py-4 text-left"
                >
                  <span className="text-base font-semibold text-foreground">Weekly inputs</span>
                  <span className="text-sm text-muted-foreground">Date, workout, chest, waist, hip, arm, thigh, neck</span>
                </button>
              </>
            ) : (
            (() => {
              const steps = addGroup === "daily" ? DAILY_ADD_STEPS : WEEKLY_ADD_STEPS;
              const step = steps[addStep];
              const last = addStep === steps.length - 1;
              return (
                <>
                  <p className="text-sm text-muted-foreground">
                    {addGroup === "daily" ? "Daily" : "Weekly"} · {addStep + 1} of {steps.length}
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground">{step.title}</h2>
                  {step.kind === "date" && (
                    <Input
                      type="date"
                      value={dailyForm.date}
                      onChange={(e) => {
                        const date = e.target.value;
                        setDailyForm({ ...dailyForm, date });
                        setMeasureForm({ ...measureForm, date });
                      }}
                    />
                  )}
                  {step.kind === "daily" && (
                    <Input
                      type="number"
                      placeholder={`${step.title}${ "unit" in step ? ` (${step.unit})` : ""}`}
                      value={(dailyForm as any)[step.key]}
                      onChange={(e) => setDailyForm({ ...dailyForm, [step.key]: e.target.value })}
                    />
                  )}
                  {step.kind === "workout" && (
                    <Button
                      type="button"
                      variant={dailyForm.workoutCompleted ? "default" : "outline"}
                      onClick={() => setDailyForm({ ...dailyForm, workoutCompleted: !dailyForm.workoutCompleted })}
                    >
                      {dailyForm.workoutCompleted ? "Workout marked" : "Mark workout"}
                    </Button>
                  )}
                  {step.kind === "measure" && (
                    <Input
                      type="number"
                      placeholder={`${step.title} (cm)`}
                      value={(measureForm as any)[step.key]}
                      onChange={(e) => setMeasureForm({ ...measureForm, [step.key]: e.target.value })}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {addGroup === "daily"
                      ? "Leave a step empty if you do not have that number today."
                      : "Leave a step empty if you are not logging it this week."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (addStep === 0) {
                          setAddGroup(null);
                          return;
                        }
                        setAddStep((current) => current - 1);
                      }}
                    >
                      Back
                    </Button>
                    {last ? (
                      <Button type="button" className="flex-1" onClick={handleSaveAll} disabled={saving}>
                        {saving ? "Saving" : "Save"}
                      </Button>
                    ) : (
                      <Button type="button" className="flex-1" onClick={() => setAddStep((current) => current + 1)}>
                        Next
                      </Button>
                    )}
                  </div>
                </>
              );
            })()
            )}
          </main>
        ) : openWindow && openWindow !== "photos" && openWindow !== "workout" ? (
          <main className="space-y-4 px-5 pb-8 pt-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Shorter range"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground active:bg-muted"
                onClick={() => setRangeDays(RANGE_OPTIONS[Math.max(0, rangeIndex - 1)].value)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-sm font-semibold text-foreground">
                {formatDay(rangeStart)} – {formatDay(todayISO())}
              </p>
              <button
                type="button"
                aria-label="Longer range"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground active:bg-muted"
                onClick={() => setRangeDays(RANGE_OPTIONS[Math.min(RANGE_OPTIONS.length - 1, rangeIndex + 1)].value)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="h-56">
              {history.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No entries in this range</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints}>
                    <defs>
                      <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#progressFill)"
                      dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {!viewOnly && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Add entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {openWindow === "bodyFat" ? (
                    <>
                      <div>
                        <Label>Gender</Label>
                        <Select value={settingsForm.gender} onValueChange={(value) => setSettingsForm({ ...settingsForm, gender: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Height (cm)</Label>
                        <Input type="number" value={settingsForm.heightCm} onChange={(e) => setSettingsForm({ ...settingsForm, heightCm: e.target.value })} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estimate uses gender, height, waist and neck{settingsForm.gender === "female" ? " and hip" : ""}.
                      </p>
                      <Button onClick={handleSaveSettings} disabled={saving}>Save details</Button>
                    </>
                  ) : measurementItem ? (
                    <>
                      <Input type="date" value={measureForm.date} onChange={(e) => setMeasureForm({ ...measureForm, date: e.target.value })} />
                      <Input
                        type="number"
                        placeholder={measurementItem.label}
                        value={(measureForm as any)[measurementItem.key]}
                        onChange={(e) => setMeasureForm({ ...measureForm, [measurementItem.key]: e.target.value })}
                      />
                      <Button onClick={handleSaveMeasurement} disabled={saving}>Save</Button>
                    </>
                  ) : (
                    <>
                      <Input type="date" value={dailyForm.date} onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })} />
                      {openWindow === "weight" && (
                        <Input type="number" placeholder="Weight (kg)" value={dailyForm.weight} onChange={(e) => setDailyForm({ ...dailyForm, weight: e.target.value })} />
                      )}
                      {openWindow === "calories" && (
                        <Input type="number" placeholder="Calories" value={dailyForm.calories} onChange={(e) => setDailyForm({ ...dailyForm, calories: e.target.value })} />
                      )}
                      {openWindow === "protein" && (
                        <Input type="number" placeholder="Protein (g)" value={dailyForm.protein} onChange={(e) => setDailyForm({ ...dailyForm, protein: e.target.value })} />
                      )}
                      {openWindow === "steps" && (
                        <Input type="number" placeholder="Steps" value={dailyForm.steps} onChange={(e) => setDailyForm({ ...dailyForm, steps: e.target.value })} />
                      )}
                      {goals[openWindow] ? <p className="text-xs text-muted-foreground">Target: {goals[openWindow]}</p> : null}
                      <Button onClick={handleSaveDaily} disabled={saving}>Save</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <h2 className="text-lg font-semibold text-foreground">History</h2>
            <ul className="space-y-2">
              {history.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nothing recorded yet.</li>
              ) : (
                history.map((row) => (
                  <li key={`${row.date}-${row.value}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground">
                        {row.value} {activeCard?.unit}
                      </span>
                      <span className="block text-xs text-muted-foreground">{formatDay(row.date)}</span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </main>
        ) : openWindow === "workout" ? (
          <main className="space-y-4 px-5 py-2">
            <div className="flex flex-wrap gap-6 text-sm">
              <p><span className="font-semibold">{completedWorkouts}</span> completed in 12 weeks</p>
              <p><span className="font-semibold">{weeklyCompletion}%</span> this week</p>
            </div>
            {!viewOnly && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Add entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input type="date" value={dailyForm.date} onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })} />
                  <Button
                    type="button"
                    variant={dailyForm.workoutCompleted ? "default" : "outline"}
                    onClick={() => setDailyForm({ ...dailyForm, workoutCompleted: !dailyForm.workoutCompleted })}
                  >
                    {dailyForm.workoutCompleted ? "Workout marked" : "Mark workout"}
                  </Button>
                  <Button onClick={handleSaveDaily} disabled={saving}>Save</Button>
                </CardContent>
              </Card>
            )}
            <h2 className="text-lg font-semibold text-foreground">History</h2>
            <div className="flex justify-center">
              <WorkoutCalendar
                modifiers={{ workout: workoutDates }}
                modifiersClassNames={{
                  workout: "bg-primary/20 text-foreground hover:bg-primary/30",
                }}
                className="rounded-2xl border border-border bg-card p-3"
              />
            </div>
          </main>
        ) : openWindow === "photos" ? (
          <main className="space-y-4 px-5 py-2">
            <p className="text-sm text-muted-foreground">
              {viewOnly
                ? "Transformation photos uploaded by this client."
                : "Photos stay on this account. The upper face area is blurred before saving."}
            </p>
            {!viewOnly && (
              <>
                <Input type="date" value={photoForm.date} onChange={(e) => setPhotoForm({ ...photoForm, date: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  {(["front", "side", "back"] as const).map((view) => (
                    <label key={view} className="cursor-pointer rounded-2xl border border-dashed border-border bg-card p-3 text-center text-sm">
                      <Camera className="mx-auto mb-1 h-4 w-4" />
                      {view}
                      <Input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(view, e.target.files?.[0])} />
                      {photoForm[view] && <img src={photoForm[view]} alt={view} className="mt-2 h-20 w-full rounded-xl object-cover" />}
                    </label>
                  ))}
                </div>
                <Button onClick={handleSavePhotos} disabled={saving}>Save photos</Button>
              </>
            )}
            <h2 className="text-lg font-semibold text-foreground">History</h2>
            {photos.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Before</Label>
                    <Select value={beforeDate} onValueChange={setBeforeDate}>
                      <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
                      <SelectContent>
                        {photos.map((set: any) => <SelectItem key={set.date} value={set.date}>{set.date}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>After</Label>
                    <Select value={afterDate} onValueChange={setAfterDate}>
                      <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
                      <SelectContent>
                        {photos.map((set: any) => <SelectItem key={`after-${set.date}`} value={set.date}>{set.date}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(["front", "side", "back"] as const).map((view) => (
                    <div key={view} className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">{view}</p>
                      <img src={beforeSet?.[view] || ""} alt="" className="h-28 w-full rounded-xl bg-muted object-cover" />
                      <img src={afterSet?.[view] || ""} alt="" className="h-28 w-full rounded-xl bg-muted object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        ) : (
          <main className="space-y-2 px-5 py-2">
            {!viewOnly && (
              <button
                type="button"
                onClick={() => {
                  setAddStep(0);
                  setAddGroup(null);
                  setListAdding(true);
                }}
                className="mb-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                Add progress
              </button>
            )}
            {metricCards.map((card) => {
              const Icon = card.icon;
              const down = card.change != null && card.change < 0;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => openMetric(card.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 text-left shadow-sm active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">{card.title}</span>
                    <span className="block text-lg font-semibold leading-tight text-foreground">
                      {card.value} <span className="text-xs font-normal text-muted-foreground">{card.unit}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">Last: {formatDay(card.date)}</span>
                  </span>
                  {card.change != null && (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold ${down ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
                        {down ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {Math.abs(card.change)}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">vs last</span>
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </main>
        )}
      </div>
    </div>
  );
};

export default ClientProgress;
