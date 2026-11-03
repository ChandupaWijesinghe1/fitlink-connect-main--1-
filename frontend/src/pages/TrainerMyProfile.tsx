import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Loader2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import {
  addTrainerPost,
  deleteTrainerPost,
  getMyTrainerProfile,
} from "@/api/trainers";
import { toast } from "sonner";

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1200;
      let { width, height } = img;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width *= ratio;
        height *= ratio;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = url;
  });
};

const TrainerMyProfile = () => {
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trainer, setTrainer] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (userType && userType !== "trainer") {
      navigate("/dashboard");
    }
  }, [userType, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await getMyTrainerProfile();
        setTrainer(data);
        setPosts(data.posts || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
    } catch {
      toast.error("Could not read that image");
    }
  };

  const handleCreatePost = async () => {
    if (!preview) {
      toast.error("Choose an image first");
      return;
    }

    try {
      setIsPosting(true);
      const updatedPosts = await addTrainerPost({
        image: preview,
        caption: caption.trim(),
      });
      setPosts(updatedPosts);
      setPreview(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Image posted to your profile");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to post image");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const updatedPosts = await deleteTrainerPost(postId);
      setPosts(updatedPosts);
      toast.success("Post removed");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete post");
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/trainer/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-xl md:text-2xl font-heading gradient-text">My Profile</h1>
          <ThemeToggle className="h-10 w-10" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card className="overflow-hidden border-border">
          <div className="h-28 md:h-40 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={trainer?.profileImage || ""} alt={trainer?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {trainer?.name?.charAt(0) || user?.name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{trainer?.name || user?.name}</h2>
                <p className="text-primary">{trainer?.specialization}</p>
                <p className="text-sm text-muted-foreground mt-1">{trainer?.bio || "Add a bio from your profile details."}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {trainer?.clients?.length || 0} clients
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 md:p-6 space-y-4">
            <h3 className="text-lg font-semibold">Post an image</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 border-dashed"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-24 rounded-md object-cover" />
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                  Choose image
                </span>
              )}
            </Button>
            <Textarea
              placeholder="Write a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <Button onClick={handleCreatePost} disabled={isPosting || !preview} className="w-full">
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPosting ? "Posting..." : "Post to profile"}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h3 className="text-lg font-semibold mb-4">Your posts</h3>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No posts yet. Share your first training photo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post: any) => (
                <motion.div key={post._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="overflow-hidden border-border">
                    <img src={post.image} alt={post.caption || "Trainer post"} className="w-full h-56 object-cover" />
                    <CardContent className="p-3 flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.caption || "No caption"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeletePost(post._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TrainerMyProfile;
