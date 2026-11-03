import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Loader2,
  Minus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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

  const SummaryCard = ({
    title,
    value,
    unit,
    current,
    previous,
    invert,
  }: {
    title: string;
    value: string;
    unit: string;
    current?: number | null;
    previous?: number | null;
    invert?: boolean;
  }) => {
    const delta = deltaLabel(current ?? null, previous ?? null, invert);
    return (
      <Card className="border-border">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">
            {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
          <p className={`text-xs flex items-center gap-1 ${
            delta.improved == null ? "text-muted-foreground" : delta.improved ? "text-emerald-500" : "text-amber-600"
          }`}>
            {delta.improved == null ? <Minus className="h-3 w-3" /> : delta.improved ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            {delta.text}
          </p>
        </CardContent>
      </Card>
    );
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(viewOnly ? "/trainer/dashboard" : "/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-heading">
              {viewOnly ? `${clientName || "Client"} progress` : "Progress analytics"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewOnly
                ? "Read-only view. You cannot change this client's data."
                : `Private fitness tracking for ${user?.name || "you"}`}
            </p>
          </div>
          <ThemeToggle className="h-10 w-10" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={rangeDays === option.value ? "default" : "outline"}
              onClick={() => setRangeDays(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <SummaryCard title="Current weight" value={latestWeight != null ? String(latestWeight) : "—"} unit="kg" current={avg(rangedLogs, "weight")} previous={avg(previousLogs, "weight")} invert />
          <SummaryCard title="Estimated body fat" value={latestFat != null ? String(latestFat) : "—"} unit="% est." current={latestFat} previous={previousFat} invert />
          <SummaryCard title="Avg daily calories" value={avg(rangedLogs, "calories") != null ? String(avg(rangedLogs, "calories")) : "—"} unit="kcal" current={avg(rangedLogs, "calories")} previous={avg(previousLogs, "calories")} />
          <SummaryCard title="Avg daily protein" value={avg(rangedLogs, "protein") != null ? String(avg(rangedLogs, "protein")) : "—"} unit="g" current={avg(rangedLogs, "protein")} previous={avg(previousLogs, "protein")} />
          <SummaryCard title="Avg daily steps" value={avg(rangedLogs, "steps") != null ? String(Math.round(avg(rangedLogs, "steps") || 0)) : "—"} unit="steps" current={avg(rangedLogs, "steps")} previous={avg(previousLogs, "steps")} />
          <SummaryCard title="Workout completion" value={String(workoutRate)} unit="%" current={workoutRate} previous={previousWorkoutRate} />
        </section>

        {!viewOnly && <Card className="border-border">
          <CardHeader>
            <CardTitle>Log today</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Label>Date</Label>
              <Input type="date" value={dailyForm.date} onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={dailyForm.weight} onChange={(e) => setDailyForm({ ...dailyForm, weight: e.target.value })} />
            </div>
            <div>
              <Label>Calories</Label>
              <Input type="number" value={dailyForm.calories} onChange={(e) => setDailyForm({ ...dailyForm, calories: e.target.value })} />
            </div>
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" value={dailyForm.protein} onChange={(e) => setDailyForm({ ...dailyForm, protein: e.target.value })} />
            </div>
            <div>
              <Label>Steps</Label>
              <Input type="number" value={dailyForm.steps} onChange={(e) => setDailyForm({ ...dailyForm, steps: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant={dailyForm.workoutCompleted ? "default" : "outline"} onClick={() => setDailyForm({ ...dailyForm, workoutCompleted: !dailyForm.workoutCompleted })}>
                {dailyForm.workoutCompleted ? "Workout done" : "Mark workout"}
              </Button>
              <Button onClick={handleSaveDaily} disabled={saving}>Save</Button>
            </div>
          </CardContent>
        </Card>}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle>Weight progression</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(16, 100%, 55%)" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="average" name="7-day average" stroke="hsl(174, 70%, 42%)" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Calorie consumption</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calorieChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  {goals.calories ? <ReferenceLine y={goals.calories} stroke="hsl(var(--primary))" label="Target" /> : null}
                  <Bar dataKey="calories" fill="hsl(16, 100%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Protein intake</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proteinChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  {goals.protein ? <ReferenceLine y={goals.protein} stroke="hsl(var(--accent))" label="Target" /> : null}
                  <Bar dataKey="protein" fill="hsl(174, 70%, 42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Daily steps</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  {goals.steps ? <ReferenceLine y={goals.steps} stroke="hsl(var(--primary))" label="Target" /> : null}
                  <Bar dataKey="steps" fill="hsl(220, 15%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle>Workout consistency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <p><span className="font-semibold">{completedWorkouts}</span> completed in 12 weeks</p>
                <p><span className="font-semibold">{weeklyCompletion}%</span> this week</p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-3 w-3 rounded-sm bg-green-200 border border-green-300" />
                  Workout done
                </p>
              </div>
              <div className="flex justify-center">
                <WorkoutCalendar
                  modifiers={{ workout: workoutDates }}
                  modifiersClassNames={{
                    workout:
                      "bg-green-200 text-green-900 hover:bg-green-300 dark:bg-green-300 dark:text-green-950",
                  }}
                  className="rounded-xl border border-border p-3"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Light green days are workouts you completed. Use the arrows to change month.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Weekly body measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {MEASUREMENT_KEYS.map((item) => (
                  <Button key={item.key} size="sm" variant={measurementKey === item.key ? "default" : "outline"} onClick={() => setMeasurementKey(item.key)}>
                    {item.label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Change vs previous: {measurementChange == null ? "Need two records" : `${measurementChange > 0 ? "+" : ""}${measurementChange} cm`}
                {measurementChange != null && " (increase or decrease is shown as size change, not automatically as improvement)."}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurementChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="cm" stroke="hsl(16, 100%, 55%)" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!viewOnly && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Input type="date" value={measureForm.date} onChange={(e) => setMeasureForm({ ...measureForm, date: e.target.value })} />
                {MEASUREMENT_KEYS.map((item) => (
                  <Input key={item.key} type="number" placeholder={item.label} value={(measureForm as any)[item.key]} onChange={(e) => setMeasureForm({ ...measureForm, [item.key]: e.target.value })} />
                ))}
                <Button className="col-span-2 md:col-span-1" onClick={handleSaveMeasurement} disabled={saving}>Save measurements</Button>
              </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Estimated body fat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                US Navy estimate from gender, height, waist, neck{settingsForm.gender === "female" ? " and hip" : ""}. This is an estimate, not a lab measurement.
              </p>
              {viewOnly ? (
                <p className="text-sm text-muted-foreground">
                  Gender: {settingsForm.gender} · Height: {settingsForm.heightCm || "—"} cm
                </p>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <Button onClick={handleSaveSettings} disabled={saving}>Save details</Button>
              </>
              )}
              <p className="text-2xl font-semibold">{latestFat != null ? `${latestFat}%` : "—"} <span className="text-sm font-normal text-muted-foreground">estimated</span></p>
              <p className="text-sm text-muted-foreground">Previous: {previousFat != null ? `${previousFat}%` : "no prior estimate"}</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fatChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bodyFat" name="Estimated %" stroke="hsl(174, 70%, 42%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!progress?.heightCm && <p className="text-xs text-amber-600">Add height to enable automatic body-fat estimates.</p>}
            </CardContent>
          </Card>
        </section>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Monthly transformation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {viewOnly
                ? "Transformation photos uploaded by this client."
                : "Photos are stored only on your account. The upper face area is automatically privacy-blurred before saving."}
            </p>
            {!viewOnly && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input type="date" value={photoForm.date} onChange={(e) => setPhotoForm({ ...photoForm, date: e.target.value })} />
              {(["front", "side", "back"] as const).map((view) => (
                <label key={view} className="border border-dashed border-border rounded-lg p-3 text-sm text-center cursor-pointer">
                  <Camera className="h-4 w-4 mx-auto mb-1" />
                  {view} view
                  <Input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(view, e.target.files?.[0])} />
                  {photoForm[view] && <img src={photoForm[view]} alt={view} className="mt-2 h-24 w-full object-cover rounded" />}
                </label>
              ))}
            </div>
            <Button onClick={handleSavePhotos} disabled={saving}>Save photos</Button>
            </>
            )}

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
                      <img src={beforeSet?.[view] || ""} alt={`Before ${view}`} className="h-36 w-full object-cover rounded bg-muted" />
                      <img src={afterSet?.[view] || ""} alt={`After ${view}`} className="h-36 w-full object-cover rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientProgress;
