import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Search,
  Plus,
  UserPlus,
  CreditCard,
  MessageSquare,
  ArrowLeft,
  X,
  Mail,
  Phone,
  Calendar,
  Crown,
  Dumbbell,
  CheckCircle2,
  Send,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GymMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  subscriptionType: "monthly" | "quarterly" | "yearly";
  subscriptionStatus: "active" | "expired" | "pending";
  joinDate: string;
  isAccountMember: boolean;
}

interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const mockGymMembers: GymMember[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    phone: "+1 234 567 890",
    subscriptionType: "monthly",
    subscriptionStatus: "active",
    joinDate: "2024-01-15",
    isAccountMember: true,
  },
  {
    id: "2",
    name: "Sarah Connor",
    email: "sarah@example.com",
    phone: "+1 234 567 891",
    subscriptionType: "yearly",
    subscriptionStatus: "active",
    joinDate: "2023-06-20",
    isAccountMember: true,
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    subscriptionType: "quarterly",
    subscriptionStatus: "expired",
    joinDate: "2024-02-01",
    isAccountMember: false,
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily@example.com",
    phone: "+1 234 567 893",
    subscriptionType: "monthly",
    subscriptionStatus: "pending",
    joinDate: "2024-03-10",
    isAccountMember: true,
  },
];

const mockSearchClients: ClientSearchResult[] = [
  { id: "c1", name: "Alex Turner", email: "alex@example.com" },
  { id: "c2", name: "Jessica Williams", email: "jessica@example.com" },
  { id: "c3", name: "David Brown", email: "david@example.com" },
  { id: "c4", name: "Lisa Anderson", email: "lisa@example.com" },
];

const TrainerGym = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<GymMember[]>(mockGymMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showAddNonMemberDialog, setShowAddNonMemberDialog] = useState(false);
  const [showSubscriptionsSheet, setShowSubscriptionsSheet] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    subscriptionType: "monthly" as "monthly" | "quarterly" | "yearly",
  });

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClients = mockSearchClients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const subscriptionStats = {
    active: members.filter((m) => m.subscriptionStatus === "active").length,
    expired: members.filter((m) => m.subscriptionStatus === "expired").length,
    pending: members.filter((m) => m.subscriptionStatus === "pending").length,
  };

  const handleAddClient = (client: ClientSearchResult) => {
    const newGymMember: GymMember = {
      id: `gym-${client.id}`,
      name: client.name,
      email: client.email,
      subscriptionType: "monthly",
      subscriptionStatus: "pending",
      joinDate: new Date().toISOString().split("T")[0],
      isAccountMember: true,
    };
    setMembers([...members, newGymMember]);
    setShowAddClientDialog(false);
    setClientSearchQuery("");
    toast.success(`${client.name} added to your gym!`);
  };

  const handleAddNonMember = () => {
    if (!newMember.name || !newMember.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    const newGymMember: GymMember = {
      id: `non-${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      phone: newMember.phone,
      subscriptionType: newMember.subscriptionType,
      subscriptionStatus: "pending",
      joinDate: new Date().toISOString().split("T")[0],
      isAccountMember: false,
    };
    setMembers([...members, newGymMember]);
    setShowAddNonMemberDialog(false);
    setNewMember({ name: "", email: "", phone: "", subscriptionType: "monthly" });
    toast.success(`${newMember.name} added as a non-account member!`);
  };

  const handleBroadcastMessage = () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    toast.success(`Message sent to ${members.length} gym members!`);
    setBroadcastMessage("");
    setShowBroadcastDialog(false);
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "expired":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSubscriptionTypeBadge = (type: string) => {
    switch (type) {
      case "yearly":
        return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30";
      case "quarterly":
        return "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-primary/20 text-primary border-primary/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-primary/20"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/trainer/dashboard")}
                className="text-foreground hover:bg-primary/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-glow">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-heading font-bold text-foreground">
                    Your Gym
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {members.length} members
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{members.length}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-500/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{subscriptionStats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{subscriptionStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-gradient-to-br from-card to-red-500/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{subscriptionStats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Button
            onClick={() => setShowAddClientDialog(true)}
            className="h-auto py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow flex flex-col items-center gap-2"
          >
            <UserPlus className="h-6 w-6" />
            <span className="text-sm font-medium">Add Client</span>
          </Button>

          <Button
            onClick={() => setShowAddNonMemberDialog(true)}
            variant="outline"
            className="h-auto py-4 border-secondary/50 text-foreground hover:bg-secondary/20 flex flex-col items-center gap-2"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Add Non-Member</span>
          </Button>

          <Button
            onClick={() => setShowSubscriptionsSheet(true)}
            variant="outline"
            className="h-auto py-4 border-amber-500/50 text-foreground hover:bg-amber-500/20 flex flex-col items-center gap-2"
          >
            <CreditCard className="h-6 w-6 text-amber-400" />
            <span className="text-sm font-medium">Subscriptions</span>
          </Button>

          <Button
            onClick={() => setShowBroadcastDialog(true)}
            variant="outline"
            className="h-auto py-4 border-emerald-500/50 text-foreground hover:bg-emerald-500/20 flex flex-col items-center gap-2"
          >
            <MessageSquare className="h-6 w-6 text-emerald-400" />
            <span className="text-sm font-medium">Message All</span>
          </Button>
        </motion.div>

        {/* Members List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Gym Members
                </CardTitle>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/40 border border-primary/10 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg">
                              {member.name.charAt(0)}
                            </div>
                            {member.isAccountMember && (
                              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <UserCheck className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              {member.name}
                              {member.subscriptionType === "yearly" && (
                                <Crown className="h-4 w-4 text-amber-400" />
                              )}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getSubscriptionTypeBadge(
                              member.subscriptionType
                            )}`}
                          >
                            {member.subscriptionType}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getSubscriptionBadge(
                              member.subscriptionStatus
                            )}`}
                          >
                            {member.subscriptionStatus}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredMembers.length === 0 && (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No members found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="bg-card border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Client to Gym
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name or email..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientSearchQuery &&
                filteredClients.map((client) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-background/50 border border-primary/10 hover:border-primary/30 cursor-pointer transition-all"
                    onClick={() => handleAddClient(client)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              {clientSearchQuery && filteredClients.length === 0 && (
                <p className="text-center py-4 text-muted-foreground">
                  No clients found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Non-Member Dialog */}
      <Dialog open={showAddNonMemberDialog} onOpenChange={setShowAddNonMemberDialog}>
        <DialogContent className="bg-card border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Non-Account Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name *
              </Label>
              <Input
                id="name"
                placeholder="Enter member name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                className="bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Subscription Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["monthly", "quarterly", "yearly"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={newMember.subscriptionType === type ? "default" : "outline"}
                    onClick={() => setNewMember({ ...newMember, subscriptionType: type })}
                    className={
                      newMember.subscriptionType === type
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                        : "border-primary/30 text-foreground hover:bg-primary/20"
                    }
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleAddNonMember}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscriptions Sheet */}
      <Sheet open={showSubscriptionsSheet} onOpenChange={setShowSubscriptionsSheet}>
        <SheetContent className="bg-card border-l-primary/20 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-400" />
              Gym Subscriptions
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-400">{subscriptionStats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-400">{subscriptionStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-2xl font-bold text-red-400">{subscriptionStats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>

            {/* Members by Subscription */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Members by Status</h3>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-lg bg-background/50 border border-primary/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{member.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Joined {member.joinDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSubscriptionTypeBadge(
                          member.subscriptionType
                        )}`}
                      >
                        {member.subscriptionType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSubscriptionBadge(
                          member.subscriptionStatus
                        )}`}
                      >
                        {member.subscriptionStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Broadcast Message Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="bg-card border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              Message All Members
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a message to all {members.length} gym members at once.
            </p>
            <Textarea
              placeholder="Type your message here..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="min-h-32 bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground resize-none"
            />
            <Button
              onClick={handleBroadcastMessage}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to All Members
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerGym;
