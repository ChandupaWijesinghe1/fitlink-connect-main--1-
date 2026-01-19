import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TrainerCardProps {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  image: string;
  onClick: (id: string) => void;
}

const TrainerCard = ({
  id,
  name,
  specialty,
  rating,
  location,
  image,
  onClick,
}: TrainerCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer glass-card border-primary/20 hover:border-primary/50 transition-all duration-300 overflow-hidden"
        onClick={() => onClick(id)}
      >
        <CardContent className="p-0">
          <div className="relative h-32 bg-gradient-to-br from-primary/30 to-primary/10">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-muted border-4 border-background overflow-hidden">
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="pt-10 pb-4 px-4 text-center">
            <h3 className="font-semibold text-foreground text-lg">{name}</h3>
            <p className="text-primary text-sm font-medium">{specialty}</p>

            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>{rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{location}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full border-primary/50 hover:bg-primary hover:text-primary-foreground"
            >
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TrainerCard;
