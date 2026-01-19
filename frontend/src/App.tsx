import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";  // ← ADD THIS
import Index from "./pages/Index";
import ClientSignup from "./pages/ClientSignup";
import ClientDashboard from "./pages/ClientDashboard";
import ClientMessages from "./pages/ClientMessages";
import CreateSchedule from "./pages/CreateSchedule";
import AddExercises from "./pages/AddExercises";
import ScheduleDetail from "./pages/ScheduleDetail";
import TrainerLogin from "./pages/TrainerLogin";
import TrainerSignup from "./pages/TrainerSignup";
import TrainerDashboard from "./pages/TrainerDashboard";
import TrainerMessages from "./pages/TrainerMessages";
import TrainerProfile from "./pages/TrainerProfile";
import TrainerGym from "./pages/TrainerGym";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ExerciseManagement from "@/pages/ExerciseManagement";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>  {/* ← ADD THIS */}
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<ClientSignup />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/messages" element={<ClientMessages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/trainer/:id" element={<TrainerProfile />} />
            <Route path="/schedule/create" element={<CreateSchedule />} />
            <Route path="/schedule/add-exercises" element={<AddExercises />} />
            <Route path="/schedule/:id" element={<ScheduleDetail />} />
            <Route path="/trainer/login" element={<TrainerLogin />} />
            <Route path="/trainer/signup" element={<TrainerSignup />} />
            <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
            <Route path="/trainer/messages" element={<TrainerMessages />} />
            <Route path="/trainer/gym" element={<TrainerGym />} />
            <Route path="/trainer/notifications" element={<Notifications />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/exercises/manage" element={<ExerciseManagement />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>  {/* ← ADD THIS */}
  </QueryClientProvider>
);

export default App;