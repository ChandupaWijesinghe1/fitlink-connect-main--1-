import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const CreateSchedule = () => {
  const navigate = useNavigate();
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
    parseInt(formData.numberOfDays) > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button Header */}
      <header className="p-4 md:p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </header>

      <main className="px-4 md:px-6 pb-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="text-center space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-foreground"
            >
              Let's Create Your Schedule
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground"
            >
              Design your perfect workout plan
            </motion.p>
          </div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 md:p-8 rounded-2xl space-y-6"
          >
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
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button
                onClick={handleContinue}
                disabled={!isFormValid}
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                Continue to Add Exercises
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default CreateSchedule;
