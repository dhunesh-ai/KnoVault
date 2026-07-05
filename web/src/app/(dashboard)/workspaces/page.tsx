"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspacesStore } from "@/store/useWorkspacesStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Plus, 
  Search, 
  Lock, 
  Globe, 
  Key, 
  Loader2, 
  Hash, 
  ExternalLink 
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "Academic",
  "Project",
  "Startup",
  "Personal Team",
  "Event Planning",
  "Research",
  "Family",
];

const EMOJIS = ["💼", "🚀", "🎓", "💡", "🎨", "🔬", "📅", "🏠", "🧩", "📈", "🤝", "📣"];

const THEMES = [
  { name: "purple", color: "bg-purple-600 border-purple-400 hover:bg-purple-700", text: "text-purple-400" },
  { name: "blue", color: "bg-blue-600 border-blue-400 hover:bg-blue-700", text: "text-blue-400" },
  { name: "emerald", color: "bg-emerald-600 border-emerald-400 hover:bg-emerald-700", text: "text-emerald-400" },
  { name: "amber", color: "bg-amber-600 border-amber-400 hover:bg-amber-700", text: "text-amber-400" },
  { name: "rose", color: "bg-rose-600 border-rose-400 hover:bg-rose-700", text: "text-rose-400" },
];

const THEME_COLORS: Record<string, string> = {
  purple: "rgba(124, 77, 255, 0.15)",
  blue: "rgba(41, 121, 255, 0.15)",
  emerald: "rgba(0, 230, 118, 0.15)",
  amber: "rgba(255, 196, 0, 0.15)",
  rose: "rgba(255, 23, 68, 0.15)",
};

const THEME_BORDER_COLORS: Record<string, string> = {
  purple: "border-purple-500/30 hover:border-purple-500/80 focus-within:border-purple-500/80 shadow-[0_0_15px_rgba(124,77,255,0.1)]",
  blue: "border-blue-500/30 hover:border-blue-500/80 focus-within:border-blue-500/80 shadow-[0_0_15px_rgba(41,121,255,0.1)]",
  emerald: "border-emerald-500/30 hover:border-emerald-500/80 focus-within:border-emerald-500/80 shadow-[0_0_15px_rgba(0,230,118,0.1)]",
  amber: "border-amber-500/30 hover:border-amber-500/80 focus-within:border-amber-500/80 shadow-[0_0_15px_rgba(255,196,0,0.1)]",
  rose: "border-rose-500/30 hover:border-rose-500/80 focus-within:border-rose-500/80 shadow-[0_0_15px_rgba(255,23,68,0.1)]",
};

const THEME_BADGES: Record<string, string> = {
  purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

export default function WorkspacesPage() {
  const router = useRouter();
  const {
    workspaces,
    isLoading,
    isSaving,
    fetchWorkspaces,
    createWorkspace,
    joinWithToken,
  } = useWorkspacesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  // New Workspace state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💼");
  const [theme, setTheme] = useState("purple");
  const [category, setCategory] = useState("Project");
  const [privacy, setPrivacy] = useState("Private");

  // Join Workspace state
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    try {
      const created = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        theme,
        category,
        privacy_level: privacy,
      });
      toast.success("Workspace created successfully!");
      setCreateOpen(false);
      resetCreateForm();
      router.push(`/workspaces/${created.id}`);
    } catch (e) {
      toast.error("Failed to create workspace");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    try {
      const joined = await joinWithToken(inviteToken.trim());
      toast.success(`Joined workspace: ${joined.name}!`);
      setJoinOpen(false);
      setInviteToken("");
      router.push(`/workspaces/${joined.id}`);
    } catch (error: any) {
      const errMsg = error?.response?.data?.detail || "Invalid or expired invite code";
      toast.error(errMsg);
    }
  };

  const resetCreateForm = () => {
    setName("");
    setDescription("");
    setIcon("💼");
    setTheme("purple");
    setCategory("Project");
    setPrivacy("Private");
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "Public":
        return <Globe className="w-3.5 h-3.5" />;
      case "Invite Only":
        return <Key className="w-3.5 h-3.5" />;
      default:
        return <Lock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            👥 Workspaces
          </h1>
          <p className="text-muted-foreground mt-1">Collaborate, share knowledge, and manage team projects.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setJoinOpen(true)}
            className="border-border text-foreground hover:bg-accent"
          >
            Join Workspace
          </Button>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-[0_0_15px_rgba(124,77,255,0.4)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground w-full focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
            <Users className="w-16 h-16 mb-4 opacity-25 text-primary" />
            <h3 className="text-xl font-medium text-foreground mb-2">No Workspaces Found</h3>
            <p className="max-w-xs mb-4">Create a team room or ask for an invite code to join a workspace.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setJoinOpen(true)}>
                Enter Invite Code
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                Create Workspace
              </Button>
            </div>
          </div>
        ) : (
          <motion.div 
            layout 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16"
          >
            <AnimatePresence>
              {filteredWorkspaces.map((ws) => {
                const borderClass = THEME_BORDER_COLORS[ws.theme] || THEME_BORDER_COLORS.purple;
                const badgeClass = THEME_BADGES[ws.theme] || THEME_BADGES.purple;
                const overlayBg = THEME_COLORS[ws.theme] || THEME_COLORS.purple;

                return (
                  <motion.div
                    key={ws.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => router.push(`/workspaces/${ws.id}`)}
                    className={`group cursor-pointer rounded-2xl border bg-card/40 backdrop-blur-xl p-5 flex flex-col justify-between h-[200px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${borderClass}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: overlayBg }}>
                          {ws.icon || "💼"}
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {ws.category}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/40 border border-border px-2 py-0.5 rounded-full">
                            {getPrivacyIcon(ws.privacy_level)}
                            {ws.privacy_level}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ws.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {ws.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/40 mt-auto">
                      <span>{ws.members?.length || 1} members</span>
                      <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Join Workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter an invite code code to access a private workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invite Code</label>
              <Input
                placeholder="e.g. WS-INV-XXXXXX"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                className="bg-card border-border text-foreground"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Join Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Collaborative Workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Build a workspace to collaborate on notes, meetings, goals, and tasks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Name</label>
              <Input
                placeholder="Team Project A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card border-border text-foreground"
                maxLength={40}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Coordinate milestones and share meeting summaries..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-card border-border text-foreground min-h-[80px]"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-card border border-border text-foreground rounded-md h-10 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Privacy Level</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full bg-card border border-border text-foreground rounded-md h-10 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  <option value="Private">Private</option>
                  <option value="Invite Only">Invite Only</option>
                  <option value="Public">Public</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Emoji Icon</label>
              <div className="flex flex-wrap gap-2 p-3 bg-card border border-border rounded-xl">
                {EMOJIS.map((emojiOption) => (
                  <button
                    key={emojiOption}
                    type="button"
                    onClick={() => setIcon(emojiOption)}
                    className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg border transition-all ${
                      icon === emojiOption
                        ? "bg-primary/20 border-primary text-foreground"
                        : "border-transparent hover:bg-accent text-foreground/80"
                    }`}
                  >
                    {emojiOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color Theme</label>
              <div className="flex gap-3">
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.name}
                    type="button"
                    onClick={() => setTheme(themeOption.name)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${themeOption.color} ${
                      theme === themeOption.name
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                  >
                    {theme === themeOption.name && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
