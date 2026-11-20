import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/context/AuthContext";

const CreateSchedule = () => {
  const navigate = useNavigate();
  const { userType } = useAuth();

  const navigateToDashboard = () => {
    navigate(userType === "trainer" ? "/trainer/dashboard" : "/dashboard");
  };
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    numberOfDays: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinue = () => {
    navigate("/schedule/add-exercises", {
      state: {
        title: formData.title,
        description: formData.description,
        days: parseInt(formData.numberOfDays),
      },
    });
  };

  const isFormValid =
    formData.title.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.numberOfDays !== "" &&
    parseInt(formData.numberOfDays) > 0 &&
    parseInt(formData.numberOfDays) <= 30; // the API accepts 1 to 30 days

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button Header */}
      <div className="mx-auto w-full max-w-md">
      <ScreenHeader title="Plan setup" onBack={navigateToDashboard} />

      <main className="px-5 pb-8">
        <div className="space-y-4">
            {/* Schedule Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground font-medium">
                Schedule Title
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Morning Strength Training"
                value={formData.title}
                onChange={handleInputChange}
                className="bg-card/50 border-primary/30 focus:border-primary h-12"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your workout plan..."
                value={formData.description}
                onChange={handleInputChange}
                className="bg-card/50 border-primary/30 focus:border-primary min-h-[100px] resize-none"
              />
            </div>

            {/* Number of Days */}
            <div className="space-y-2">
              <Label htmlFor="numberOfDays" className="text-foreground font-medium">
                Number of Days
              </Label>
              <Input
                id="numberOfDays"
                name="numberOfDays"
                type="number"
                min="1"
                max="30"
                placeholder="e.g., 7"
                value={formData.numberOfDays}
                onChange={handleInputChange}
                className="bg-card/50 border-primary/30 focus:border-primary h-12"
              />
              <p className="text-xs text-muted-foreground">
                How many days will this workout schedule span?
              </p>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!isFormValid}
              className="h-12 w-full"
            >
              Continue to add exercises
            </Button>
        </div>
      </main>
      </div>
    </div>
  );
};

export default CreateSchedule;
