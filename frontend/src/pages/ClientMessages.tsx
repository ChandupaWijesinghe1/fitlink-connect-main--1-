import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Send,
  Calendar,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  User,
  Clock,
  Star,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
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

    const socket = initializeSocket(user._id);

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

      // Send via API
      await sendMessageAPI(messageData);

      // Send via Socket for real-time
      socket.emit('message:send', {
        senderId: user._id,
        senderType: 'User',
        receiverId: selectedConversation.otherUser.id,
        receiverType: selectedConversation.otherUser.type,
        message: newMessage.trim(),
      });

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
    <div className="min-h-screen bg-background">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex h-screen">
        {/* Conversations Sidebar */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-96 border-r border-border/50 flex flex-col bg-card/30 backdrop-blur-sm"
          style={{ display: selectedConversation && window.innerWidth < 768 ? "none" : "flex" }}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-accent/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Messages</h1>
                <p className="text-sm text-muted-foreground">Chat with your trainers</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trainers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-accent"
              />
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {isLoadingConversations ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20 px-4">
                <p className="text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.conversationId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${selectedConversation?.conversationId === conversation.conversationId
                        ? "bg-gradient-to-r from-accent/30 to-primary/20 border border-accent/50"
                        : "hover:bg-secondary/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-accent/30">
                        <AvatarFallback className="bg-accent/20 text-accent">
                          {conversation.otherUser.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {conversation.otherUser.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conversation.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.message}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-gradient-to-r from-accent to-primary text-accent-foreground border-0 text-xs px-2 py-0.5">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedConversation(null);
                      // Clear the trainerId from URL
                      navigate('/messages', { replace: true });
                    }}
                    className="md:hidden hover:bg-accent/20"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-11 w-11 border-2 border-accent/50">
                    <AvatarFallback>{selectedConversation.otherUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">
                      {selectedConversation.otherUser.name}
                    </h2>
                    <p className="text-sm text-accent">
                      {typingUsers.has(selectedConversation.otherUser.id)
                        ? "typing..."
                        : selectedConversation.otherUser.type}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-accent" />
                      <p className="text-muted-foreground">Start your conversation with {selectedConversation.otherUser.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    <AnimatePresence>
                      {messages.map((message, index) => (
                        <motion.div
                          key={message._id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex ${message.sender.id === user?._id ? "justify-end" : "justify-start"}`}
                        >
                          {message.messageType === "schedule" ? (
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="max-w-sm w-full"
                            >
                              <div className="bg-gradient-to-br from-accent/30 via-primary/20 to-accent/30 rounded-2xl p-4 border border-accent/50 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-2 rounded-lg bg-accent/30">
                                    <Calendar className="h-5 w-5 text-accent" />
                                  </div>
                                  <div>
                                    <span className="text-xs text-accent font-medium flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" />
                                      Shared Schedule
                                    </span>
                                    <h4 className="font-semibold text-foreground">
                                      {message.scheduleData?.title || "Workout Schedule"}
                                    </h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {message.scheduleData?.days || 0} days
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenSchedule(message.scheduleId!)}
                                    disabled={isLoadingSchedule}
                                    className="flex-1 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:opacity-90"
                                  >
                                    {isLoadingSchedule ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Dumbbell className="h-4 w-4 mr-1" />
                                    )}
                                    View Details
                                  </Button>
                                </div>
                                <span className="text-xs text-muted-foreground mt-2 block text-right">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            <div
                              className={`max-w-[75%] px-4 py-3 rounded-2xl ${message.sender.id === user?._id
                                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-sm"
                                  : "bg-gradient-to-r from-secondary to-secondary/80 text-foreground rounded-bl-sm border border-border/50"
                                }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <span className={`text-xs mt-1 block text-right ${message.sender.id === user?._id ? "text-primary-foreground/70" : "text-muted-foreground"
                                }`}>
                                {formatMessageTime(message.createdAt)}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm"
              >
                <div className="flex gap-3 max-w-3xl mx-auto">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onBlur={handleStopTyping}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isSending}
                    className="flex-1 bg-secondary/50 border-border/50 focus:border-primary rounded-xl"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 rounded-xl px-6"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </motion.div>
            </>
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