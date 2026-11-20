import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  User,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { initializeSocket, getSocket, disconnectSocket } from "@/lib/socket";
import {
  getAllConversations,
  getConversation,
  sendMessage as sendMessageAPI,
  markMessagesAsRead
} from "@/api/messages";
import { getScheduleById } from "@/api/schedules";
import { getTrainerById } from "@/api/trainers";  // ← NEW
import ChatThread from "@/components/chat/ChatThread";
import ChatList from "@/components/chat/ChatList";

interface Conversation {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    type: string;
  };
  lastMessage: {
    message: string;
    createdAt: string;
    messageType?: string;
    sender?: { id: string };
  };
  unreadCount: number;
}

interface Message {
  _id: string;
  sender: {
    id: string;
    name: string;
    type: string;
  };
  receiver: {
    id: string;
    name: string;
    type: string;
  };
  message: string;
  messageType: string;
  scheduleId?: string;
  scheduleData?: {
    title: string;
    days: number;
  };
  isRead: boolean;
  createdAt: string;
}

const ClientMessages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();  // ← NEW
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Initialize Socket.io
  useEffect(() => {
    if (!user?._id) return;

    const socket = initializeSocket();

    // Listen for incoming messages
    socket.on('message:receive', (message: Message) => {
      console.log('📨 Received message:', message);

      // Add to messages if in active conversation
      if (selectedConversation &&
        (message.sender.id === selectedConversation.otherUser.id ||
          message.receiver.id === selectedConversation.otherUser.id)) {
        setMessages(prev => [...prev, message]);

        // Mark as read
        markMessagesAsRead(selectedConversation.otherUser.id);
      }

      // Update conversations list
      fetchConversations();
    });

    // Listen for typing indicators
    socket.on('user:typing', ({ senderId }) => {
      setTypingUsers(prev => new Set(prev).add(senderId));
    });

    socket.on('user:stopTyping', ({ senderId }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(senderId);
        return newSet;
      });
    });

    return () => {
      socket.off('message:receive');
      socket.off('user:typing');
      socket.off('user:stopTyping');
      disconnectSocket();
    };
  }, [user?._id, selectedConversation]);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const data = await getAllConversations();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchConversations();
    }
  }, [user?._id]);

  // ========== NEW: Auto-open trainer chat from URL parameter ==========
  useEffect(() => {
    const trainerId = searchParams.get('trainerId');
    
    if (trainerId && !selectedConversation) {
      // Check if conversation with this trainer already exists
      const existingConversation = conversations.find(
        conv => conv.otherUser.id === trainerId
      );

      if (existingConversation) {
        // Open existing conversation
        handleConversationSelect(existingConversation);
      } else {
        // Create new conversation with this trainer (even if conversations list is empty)
        openNewTrainerConversation(trainerId);
      }
    }
  }, [searchParams, conversations]);  // Removed selectedConversation from dependencies

  // Open new conversation with trainer
  const openNewTrainerConversation = async (trainerId: string) => {
    try {
      // Fetch trainer details
      const trainerData = await getTrainerById(trainerId);
      
      // Create a temporary conversation object
      const newConversation: Conversation = {
        conversationId: `temp-${trainerId}`,
        otherUser: {
          id: trainerData._id,
          name: trainerData.name,
          type: 'Trainer'
        },
        lastMessage: {
          message: 'Start a conversation',
          createdAt: new Date().toISOString()
        },
        unreadCount: 0
      };

      setSelectedConversation(newConversation);
      setMessages([]); // Empty messages for new conversation
      
      toast({
        title: "New Conversation",
        description: `Start chatting with ${trainerData.name}`,
      });
    } catch (error: any) {
      console.error('Error opening trainer conversation:', error);
      toast({
        title: "Error",
        description: "Failed to open conversation with trainer",
        variant: "destructive",
      });
    }
  };
  // ========== END Auto-open ==========

  // Fetch conversation messages
  const fetchMessages = async (otherUserId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await getConversation(otherUserId);
      setMessages(data.messages || []);

      // Mark as read
      await markMessagesAsRead(otherUserId);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      // Don't show error toast for new conversations (404 is expected)
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.otherUser.id);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const socket = getSocket();
    if (!socket) return;

    try {
      setIsSending(true);

      const messageData = {
        receiverId: selectedConversation.otherUser.id,
        content: newMessage.trim(),
        messageType: 'text',
      };

      // Send via API. The server saves the message and pushes it to the
      // receiver over the socket, so nothing is emitted from here.
      await sendMessageAPI(messageData);

      setNewMessage("");

      // Refresh messages and conversations
      fetchMessages(selectedConversation.otherUser.id);
      fetchConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle open schedule in dialog
  const handleOpenSchedule = async (scheduleId: string) => {
    if (!scheduleId) {
      toast({
        title: "Error",
        description: "Schedule not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingSchedule(true);
      const scheduleData = await getScheduleById(scheduleId);
      setSelectedSchedule(scheduleData);
      setScheduleDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Handle save schedule
  const handleSaveSchedule = async () => {
    console.log('🔵 Save button clicked!');
    console.log('Selected schedule:', selectedSchedule);
    
    if (!selectedSchedule?._id) {
      console.log('❌ No schedule ID');
      toast({
        title: "Error",
        description: "No schedule selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingSchedule(true);
      console.log('📤 Calling saveScheduleToUser API...');
      
      // Import the function
      const { saveScheduleToUser } = await import("@/api/schedules");
      
      // Save the schedule
      const result = await saveScheduleToUser(selectedSchedule._id);
      console.log('✅ Save successful:', result);
      
      toast({
        title: "Schedule Saved!",
        description: `"${selectedSchedule.title}" has been added to your schedules.`,
      });
      
      setScheduleDialogOpen(false);
      
    } catch (error: any) {
      console.error('❌ Save error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 400) {
        toast({
          title: "Already Saved",
          description: error.response.data.message || "You already have this schedule",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save Failed",
          description: error.response?.data?.message || "Failed to save schedule. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingSchedule(false);
      console.log('🏁 Save process complete');
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:typing', {
        senderId: user._id,
        receiverId: selectedConversation.otherUser.id,
      });
    }
  };

  const handleStopTyping = () => {
    if (!selectedConversation || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:stopTyping', {
        senderId: user._id,
        receiverId: selectedConversation.otherUser.id,
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (isToday) {
      return time;
    } else if (isYesterday) {
      return `Yesterday ${time}`;
    } else {
      const dateStr = date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
      return `${dateStr}, ${time}`;
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--app-bottom-nav)] z-30 flex overflow-hidden bg-background">
        {/* Conversations Sidebar */}
        <div
          className="flex h-full w-full flex-col md:w-[400px] md:border-r md:border-border"
          style={{ display: selectedConversation && window.innerWidth < 768 ? "none" : "flex" }}
        >
          <ChatList
            items={conversations.map((conversation) => ({
              id: conversation.conversationId,
              name: conversation.otherUser.name,
              preview:
                conversation.lastMessage.messageType === "schedule"
                  ? "Shared a workout plan"
                  : conversation.lastMessage.message,
              time: conversation.lastMessage.createdAt,
              unreadCount: conversation.unreadCount,
              sentByMe: String(conversation.lastMessage.sender?.id || "") === String(user?._id || ""),
            }))}
            selectedId={selectedConversation?.conversationId}
            isLoading={isLoadingConversations}
            emptyText="No conversations yet"
            onSelect={(id) => {
              const conversation = conversations.find((item) => item.conversationId === id);
              if (conversation) handleConversationSelect(conversation);
            }}
            onBack={() => navigate("/dashboard")}
          />
        </div>

        {/* Chat Area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedConversation ? (
            <ChatThread
              title={selectedConversation.otherUser.name}
              subtitle={typingUsers.has(selectedConversation.otherUser.id) ? "typing..." : undefined}
              messages={messages}
              currentUserId={user?._id}
              isLoading={isLoadingMessages}
              isSending={isSending}
              draft={newMessage}
              onDraftChange={setNewMessage}
              onSend={handleSendMessage}
              onBack={() => {
                setSelectedConversation(null);
                navigate("/messages", { replace: true });
              }}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              formatTime={formatMessageTime}
              onOpenSchedule={handleOpenSchedule}
              menuLabel="View profile"
              onMenu={() => navigate(`/trainer/${selectedConversation.otherUser.id}`)}
              emptyText={`Start your conversation with ${selectedConversation.otherUser.name}`}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center p-8">
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center border-2 border-accent/30">
                    <User className="h-16 w-16 text-accent" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Your Trainers</h2>
                <p className="text-muted-foreground max-w-sm">
                  Select a trainer to start chatting and receive personalized workout schedules
                </p>
              </div>
            </motion.div>
          )}
        </div>

      {/* Schedule Detail Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent/30 to-primary/20">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              {selectedSchedule?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <p className="text-muted-foreground">{selectedSchedule.description || "No description provided"}</p>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/20 text-accent">
                    <Clock className="h-4 w-4" />
                    <span>{selectedSchedule.days?.length || 0} Days</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary">
                    <Dumbbell className="h-4 w-4" />
                    <span>
                      {selectedSchedule.days?.reduce((acc: number, day: any) => acc + day.exercises.length, 0) || 0} Exercises
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Workout Days
                  </h4>
                  {selectedSchedule.days?.map((day: any, index: number) => (
                    <motion.div
                      key={day.dayNumber}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl bg-secondary/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <span className="text-primary-foreground font-bold">{day.dayNumber}</span>
                        </div>
                        <div>
                          <h5 className="font-semibold text-foreground">Day {day.dayNumber}</h5>
                          <p className="text-xs text-muted-foreground">{day.exercises.length} exercises</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {day.exercises.map((exercise: any, exIndex: number) => (
                          <div
                            key={exIndex}
                            className="flex items-center justify-between p-2 rounded-lg bg-card/50"
                          >
                            <span className="text-sm text-foreground font-medium">{exercise.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {exercise.sets}×{exercise.reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSaveSchedule}
                    className="flex-1 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save to My Schedules
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setScheduleDialogOpen(false)}
                    className="border-border/50"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientMessages;