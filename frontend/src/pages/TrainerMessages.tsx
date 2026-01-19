import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";  // ← UPDATED
import { 
  ArrowLeft, 
  Search, 
  Send, 
  Calendar, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  Clock, 
  Dumbbell, 
  ChevronRight,
  Loader2,
  Play,
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { initializeSocket, getSocket, disconnectSocket } from "@/lib/socket";
import {
  getTrainerClients,
  getAllConversations,
  getConversation,
  sendMessage as sendMessageAPI,
  shareSchedule as shareScheduleAPI,
  markMessagesAsRead,
} from "@/api/messages";
import { getUserSchedules } from "@/api/schedules";
import { getAllUsers } from "@/api/trainers";  // ← NEW

interface Client {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
}

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

interface Schedule {
  _id: string;
  title: string;
  description: string;
  days: any[];
}

const TrainerMessages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();  // ← NEW
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [mySchedules, setMySchedules] = useState<Schedule[]>([]);

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);

  // Initialize Socket.io
  useEffect(() => {
    if (!user?._id) return;

    const socket = initializeSocket(user._id);

    // Listen for incoming messages
    socket.on('message:receive', (message: Message) => {
      console.log('📨 Trainer received message:', message);

      // Add to messages if in active conversation
      if (selectedClient && 
          (message.sender.id === selectedClient._id ||
           message.receiver.id === selectedClient._id)) {
        setMessages(prev => [...prev, message]);

        // Mark as read
        markMessagesAsRead(selectedClient._id);
      }

      // Update conversations
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
  }, [user?._id, selectedClient]);

  // Fetch trainer's clients
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const data = await getTrainerClients();
      setClients(data.clients || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const data = await getAllConversations();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch messages
  const fetchMessages = async (clientId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await getConversation(clientId);
      setMessages(data.messages || []);

      // Mark as read
      await markMessagesAsRead(clientId);
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

  // Fetch trainer's schedules
  const fetchMySchedules = async () => {
    if (!user?._id) return;

    try {
      setIsLoadingSchedules(true);
      const data = await getUserSchedules(user._id);
      setMySchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchClients();
      fetchConversations();
      fetchMySchedules();
    }
  }, [user?._id]);

  // ========== NEW: Auto-open client chat from URL parameter ==========
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    
    if (clientId && !selectedClient) {
      // Check if client exists in trainer's clients
      const existingClient = clients.find(c => c._id === clientId);

      if (existingClient) {
        // Open existing client
        handleClientSelect(existingClient);
      } else {
        // Fetch client data from all users and create temporary client
        openNewClientConversation(clientId);
      }
    }
  }, [searchParams, clients]);

  // Open new conversation with client
  const openNewClientConversation = async (clientId: string) => {
    try {
      // Fetch all users to find this specific client
      const allUsers = await getAllUsers();
      const clientData = allUsers.find((u: any) => u._id === clientId);
      
      if (!clientData) {
        toast({
          title: "Error",
          description: "Client not found",
          variant: "destructive",
        });
        return;
      }

      // Create temporary client object
      const newClient: Client = {
        _id: clientData._id,
        name: clientData.name,
        email: clientData.email,
        profileImage: clientData.profileImage
      };

      setSelectedClient(newClient);
      setMessages([]); // Empty messages for new conversation
      
      toast({
        title: "New Conversation",
        description: `Start chatting with ${clientData.name}`,
      });
    } catch (error: any) {
      console.error('Error opening client conversation:', error);
      toast({
        title: "Error",
        description: "Failed to open conversation with client",
        variant: "destructive",
      });
    }
  };
  // ========== END Auto-open ==========

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    fetchMessages(client._id);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient || !user) return;

    const socket = getSocket();
    if (!socket) return;

    try {
      setIsSending(true);

      const messageData = {
        receiverId: selectedClient._id,
        content: newMessage.trim(),
        messageType: 'text',
      };

      // Send via API
      await sendMessageAPI(messageData);

      // Send via Socket for real-time
      socket.emit('message:send', {
        senderId: user._id,
        senderType: 'Trainer',
        receiverId: selectedClient._id,
        receiverType: 'User',
        message: newMessage.trim(),
      });

      setNewMessage("");

      // Refresh messages and conversations
      fetchMessages(selectedClient._id);
      fetchConversations(); // Update conversation list
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

  // Handle share schedule
  const handleShareSchedule = async (schedule: Schedule) => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (!socket) return;

    try {
      const scheduleData = {
        receiverId: selectedClient._id,
        scheduleId: schedule._id,
        scheduleTitle: schedule.title,
        scheduleDays: schedule.days?.length || 0,
      };

      // Share via API
      await shareScheduleAPI(scheduleData);

      toast({
        title: "Schedule Shared!",
        description: `Shared "${schedule.title}" with ${selectedClient.name}`,
      });

      setShowScheduleSheet(false);

      // Refresh messages and conversations
      fetchMessages(selectedClient._id);
      fetchConversations(); // Update conversation list
    } catch (error: any) {
      console.error('Error sharing schedule:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share schedule",
        variant: "destructive",
      });
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:typing', {
        senderId: user._id,
        receiverId: selectedClient._id,
      });
    }
  };

  const handleStopTyping = () => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:stopTyping', {
        senderId: user._id,
        receiverId: selectedClient._id,
      });
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Get conversation for client
  const getClientConversation = (clientId: string) => {
    return conversations.find(conv => conv.otherUser.id === clientId);
  };

  // Filter clients - only show clients with conversations
  const filteredClients = clients.filter(client => {
    const hasConversation = conversations.some(conv => conv.otherUser.id === client._id);
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    return hasConversation && matchesSearch;
  });

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
      return time; // Just time for today: "3:45 PM"
    } else if (isYesterday) {
      return `Yesterday ${time}`; // "Yesterday 3:45 PM"
    } else {
      // Show date for older messages: "Jan 8, 3:45 PM"
      const dateStr = date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
      return `${dateStr}, ${time}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Client List (Hidden on mobile when chat is open) */}
      <div className={`${
        selectedClient ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 border-r border-border bg-card/50 flex-col`}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trainer/dashboard")}
              className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-heading tracking-wide gradient-text">Messages</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border focus:border-primary text-sm md:text-base h-9 md:h-10"
            />
          </div>
        </div>

        {/* Client List */}
        <ScrollArea className="flex-1">
          {isLoadingClients ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-20 px-4">
              <p className="text-muted-foreground text-sm">No clients yet</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredClients.map((client, index) => {
                const conversation = getClientConversation(client._id);

                return (
                  <motion.div
                    key={client._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => handleClientSelect(client)}
                      className={`w-full p-2.5 md:p-3 rounded-xl flex items-center gap-2 md:gap-3 transition-all duration-200 ${
                        selectedClient?._id === client._id
                          ? "bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/30">
                        <AvatarImage src={client.profileImage} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-sm">
                          {client.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate text-sm md:text-base">
                            {client.name}
                          </span>
                          {conversation && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conversation && (
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.message}
                          </p>
                        )}
                      </div>
                      {conversation && conversation.unreadCount > 0 && (
                        <Badge className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 min-w-[20px] md:min-w-[24px] h-5 md:h-6 flex items-center justify-center text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area (Shown on mobile when client is selected) */}
      {selectedClient ? (
        <div className="flex-1 flex flex-col h-screen md:h-auto">
          {/* Chat Header - Fixed */}
          <div className="sticky top-0 z-10 p-3 md:p-4 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button for mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedClient(null);
                    // Clear the clientId from URL
                    navigate('/trainer/messages', { replace: true });
                  }}
                  className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-9 h-9 md:w-11 md:h-11 border-2 border-accent/50">
                  <AvatarImage src={selectedClient.profileImage} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-accent-foreground font-bold text-sm">
                    {selectedClient.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground text-sm md:text-base">{selectedClient.name}</h2>
                  <p className="text-xs text-accent">
                    {typingUsers.has(selectedClient._id) ? "typing..." : "Client"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10">
                <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </div>

          {/* Messages - Scrollable area between header and input */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Send className="h-12 w-12 mx-auto mb-4 text-accent" />
                  <p className="text-muted-foreground">Start your conversation with {selectedClient.name}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
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
                        <div 
                          className={`max-w-[85%] md:max-w-[70%] rounded-2xl overflow-hidden cursor-pointer ${
                            message.sender.id === user?._id ? "rounded-br-md" : "rounded-bl-md"
                          }`}
                          onClick={() => {
                            // Navigate to schedule detail if scheduleId exists
                            if (message.scheduleId) {
                              navigate(`/schedule/${message.scheduleId}`);
                            } else {
                              toast({
                                title: "Schedule Not Found",
                                description: "This schedule is no longer available",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <div className="bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 p-3 md:p-4 hover:border-accent/50 transition-all">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                              <div className="p-1.5 md:p-2 rounded-lg bg-accent/20">
                                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                              </div>
                              <span className="font-semibold text-accent text-sm md:text-base">Workout Schedule</span>
                            </div>
                            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border/50">
                              <h4 className="font-bold text-foreground mb-1 md:mb-2 text-sm md:text-base">
                                {message.scheduleData?.title || "Workout Schedule"}
                              </h4>
                              <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                                <span>📅 {message.scheduleData?.days || 0} days</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-accent font-medium mt-2 md:mt-3 pt-2 border-t border-accent/20">
                                <span>Click to view details</span>
                                <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 md:px-4 py-1.5 md:py-2 ${
                            message.sender.id === user?._id
                              ? "bg-gradient-to-r from-primary to-orange-500"
                              : "bg-secondary/80"
                          }`}>
                            <div className={`flex items-center justify-end gap-1 ${
                              message.sender.id === user?._id ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
                              {message.sender.id === user?._id && (
                                message.isRead ? <CheckCheck className="w-3 h-3 md:w-4 md:h-4" /> : <Check className="w-3 h-3 md:w-4 md:h-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[85%] md:max-w-[70%] p-3 md:p-4 rounded-2xl ${
                          message.sender.id === user?._id
                            ? "bg-gradient-to-br from-primary to-orange-500 text-primary-foreground rounded-br-md"
                            : "bg-secondary/80 text-foreground rounded-bl-md border border-border/50"
                        }`}>
                          <p className="text-sm md:text-base break-words">{message.message}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 md:mt-2 ${
                            message.sender.id === user?._id ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
                            {message.sender.id === user?._id && (
                              message.isRead ? <CheckCheck className="w-3 h-3 md:w-4 md:h-4" /> : <Check className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="sticky bottom-0 z-10 p-3 md:p-4 border-t border-border bg-card/95 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center gap-1">
                  <Sheet open={showScheduleSheet} onOpenChange={setShowScheduleSheet}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent h-9 w-9 md:h-10 md:w-10">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-card border-border w-[90vw] sm:w-[400px]">
                      <SheetHeader>
                        <SheetTitle className="gradient-text font-heading text-xl md:text-2xl">Share Schedule</SheetTitle>
                      </SheetHeader>
                      {isLoadingSchedules ? (
                        <div className="flex justify-center items-center py-20">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : mySchedules.length === 0 ? (
                        <div className="text-center py-20">
                          <p className="text-muted-foreground text-sm">No schedules yet</p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {mySchedules.map((schedule, index) => (
                            <motion.div
                              key={schedule._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <button
                                onClick={() => handleShareSchedule(schedule)}
                                className="w-full p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all duration-200 text-left group"
                              >
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base truncate">
                                      {schedule.title}
                                    </h4>
                                    <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground mt-1">
                                      <span>{schedule.days?.length || 0} days</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onBlur={handleStopTyping}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isSending}
                    className="bg-secondary/50 border-border focus:border-primary text-sm md:text-base h-9 md:h-10"
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-primary-foreground shadow-lg shadow-primary/30 h-9 w-9 md:h-10 md:w-10"
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <h2 className="text-lg md:text-xl font-heading text-foreground mb-2">Select a Conversation</h2>
            <p className="text-sm md:text-base text-muted-foreground">Choose a client to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerMessages;