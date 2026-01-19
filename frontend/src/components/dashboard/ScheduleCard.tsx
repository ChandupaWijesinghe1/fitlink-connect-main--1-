import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleCardProps {
  id: string;
  title: string;
  description: string;
  numberOfDays: number;
  owner: string;
  isOwnSchedule: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const scheduleEmojis = ["🏋️", "💪", "🔥", "⚡", "🎯", "🚀", "💫", "✨", "🌟", "🏆"];

const getRandomEmoji = (id: string) => {
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % scheduleEmojis.length;
  return scheduleEmojis[index];
};

const ScheduleCard = ({
  id,
  title,
  description,
  numberOfDays,
  owner,
  isOwnSchedule,
  onClick,
  onDelete,
}: ScheduleCardProps) => {
  const emoji = getRandomEmoji(id);

  const handleDelete = (e: React.MouseEvent) => {
    console.log('🖱️ Delete button clicked!');
    console.log('📋 Schedule ID:', id);
    console.log('🎯 onDelete function exists?', !!onDelete);
    
    e.stopPropagation();
    if (onDelete) {
      console.log('✅ Calling onDelete...');
      onDelete(id);
    } else {
      console.log('❌ onDelete is undefined!');
    }
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        className="cursor-pointer overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5 hover:from-primary/10 hover:via-card hover:to-accent/10 transition-all duration-500 group shadow-lg hover:shadow-xl hover:shadow-primary/20"
        onClick={() => onClick(id)}
      >
        <CardContent className="p-0">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <div className="p-4 md:p-5">
            {/* Header with emoji, title, and DELETE BUTTON */}
            <div className="flex items-start gap-3 mb-3">
              <motion.div 
                className="text-3xl flex-shrink-0"
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2 }}
                transition={{ duration: 0.5 }}
              >
                {emoji}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-300 line-clamp-1">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {description}
                </p>
              </div>
              {/* ========== ADD DELETE BUTTON HERE ========== */}
              {isOwnSchedule && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {/* ========== END DELETE BUTTON ========== */}
            </div>

            {/* Footer with days badge and owner */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-sm">👤</span>
                <span className={`text-sm font-medium ${isOwnSchedule ? "text-primary" : "text-muted-foreground"}`}>
                  {isOwnSchedule ? "Created by me ✨" : owner}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full border border-primary/30">
                <span className="text-sm">📅</span>
                <span className="text-sm font-bold text-primary">
                  {numberOfDays} {numberOfDays === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ScheduleCard;