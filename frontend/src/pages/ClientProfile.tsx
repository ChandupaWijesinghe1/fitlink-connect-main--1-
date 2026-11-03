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
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 font-heading text-xl text-foreground">Profile</h1>
          <ThemeToggle className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card className="overflow-hidden border-border">
          <div className="h-24 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="relative -mt-10 pb-6">
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarImage src={user?.profileImage || ""} alt={user?.name} />
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {user?.name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-2xl font-heading text-foreground">{user?.name || "Client"}</h2>
            <p className="text-sm text-muted-foreground">Client account</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-foreground">{user?.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-foreground">{user?.phone || "No phone on file"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                {trainer ? `Connected to ${trainer.name}` : "No trainer connected yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="rounded-full" onClick={() => navigate("/progress")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View progress
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
          <Button
            variant="outline"
            className="rounded-full text-destructive hover:bg-destructive/10 sm:col-span-2"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ClientProfile;
