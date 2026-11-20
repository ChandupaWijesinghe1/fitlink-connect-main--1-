import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Phone, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { getConnectionOverview } from "@/api/connections";
import { getTrainerById } from "@/api/trainers";

const ClientProfile = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const [trainer, setTrainer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userType && userType !== "client") {
      navigate("/trainer/dashboard");
    }
  }, [userType, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user?._id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const overview = await getConnectionOverview();
        if (overview.connectedTrainerId) {
          const data = await getTrainerById(overview.connectedTrainerId);
          setTrainer(data);
        } else {
          setTrainer(null);
        }
      } catch {
        setTrainer(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?._id]);

  const handleLogout = () => {
    logout();
    navigate("/");
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
      <main className="mx-auto max-w-md space-y-5 px-5 py-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-foreground">Profile</h1>
          <ThemeToggle className="h-11 w-11 rounded-2xl border border-border bg-card" />
        </div>

        <div className="space-y-2 text-center">
          <Avatar className="mx-auto h-20 w-20 border-4 border-card">
            <AvatarImage src={user?.profileImage || ""} alt={user?.name} />
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
              {user?.name?.charAt(0) || "C"}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-heading text-lg font-bold text-foreground">{user?.name || "Client"}</h2>
          <p className="text-xs text-muted-foreground">{user?.email || "No email"}</p>
        </div>

        <Card>
          <CardContent className="divide-y divide-border p-0">
            <button
              type="button"
              onClick={() => navigate("/progress")}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold"
            >
              <span className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                Progress
              </span>
              <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 px-4 py-4 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span>{user?.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span>{user?.phone || "No phone on file"}</span>
            </div>
            <button
              type="button"
              onClick={() => trainer?._id && navigate(`/trainer/${trainer._id}`)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm"
            >
              <User className="h-4 w-4 text-accent" />
              <span>{trainer ? trainer.name : "No trainer connected yet"}</span>
            </button>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </main>
    </div>
  );
};

export default ClientProfile;
