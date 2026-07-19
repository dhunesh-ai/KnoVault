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
    <div className="space-y-6 flex flex-col h-[calc(100vh-6.5rem)] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            👥 Workspaces
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Collaborate, share knowledge, and manage team projects.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button 
            variant="outline"
            onClick={() => setJoinOpen(true)}
            className="border-border/50 bg-card rounded-2xl font-bold text-xs h-10 px-4 hover:bg-accent/40 text-foreground"
          >
            Join Workspace
          </Button>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/95 text-white shadow-[0_4px_16px_rgba(124,77,255,0.25)] rounded-2xl font-semibold text-xs h-10 px-5"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Workspace
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/85" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card border-border/40 text-foreground w-full h-10 rounded-2xl focus-visible:ring-primary/45 text-xs placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Workspaces Found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-5">Create a team room or ask for an invite code to join a workspace.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setJoinOpen(true)}>
                Enter Invite Code
              </Button>
              <Button className="rounded-xl text-xs font-bold" onClick={() => setCreateOpen(true)}>
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
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={() => router.push(`/workspaces/${ws.id}`)}
                    className={`group cursor-pointer rounded-3xl border bg-card/45 backdrop-blur-md p-5.5 flex flex-col justify-between h-[205px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${borderClass}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-105 shadow-sm" style={{ backgroundColor: overlayBg }}>
                          {ws.icon || "💼"}
                        </div>
                        <div className="flex gap-1.5">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-lg ${badgeClass}`}>
                            {ws.category}
                          </span>
                          <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-muted-foreground bg-accent/40 border border-border/30 px-2.5 py-0.5 rounded-lg">
                            {getPrivacyIcon(ws.privacy_level)}
                            {ws.privacy_level}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-extrabold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {ws.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed font-medium">
                          {ws.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pt-3 border-t border-border/20 mt-auto">
                      <span>{ws.members?.length || 1} members</span>
                      <span className="flex items-center gap-1 group-hover:text-primary transition-colors text-primary font-bold">
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
        <DialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">Join Workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-semibold">
              Enter an invite code code to access a private workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Invite Code</label>
              <Input
                placeholder="e.g. WS-INV-XXXXXX"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                className="bg-accent/25 border-border/40 text-xs rounded-2xl h-10"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setJoinOpen(false)} className="rounded-xl text-xs font-bold h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold h-9 shadow-md">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Join Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">Create Collaborative Workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-semibold">
              Build a workspace to collaborate on notes, meetings, goals, and tasks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Workspace Name</label>
              <Input
                placeholder="Team Project A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-accent/25 border-border/40 text-xs rounded-2xl h-10"
                maxLength={40}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Description</label>
              <Textarea
                placeholder="Coordinate milestones and share meeting summaries..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-accent/25 border-border/40 text-xs rounded-2xl min-h-[80px]"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-accent/25 border border-border/40 text-foreground rounded-2xl h-10 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs font-medium"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-card text-foreground">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Privacy Level</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full bg-accent/25 border border-border/40 text-foreground rounded-2xl h-10 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs font-medium"
                >
                  <option value="Private" className="bg-card text-foreground">Private</option>
                  <option value="Invite Only" className="bg-card text-foreground">Invite Only</option>
                  <option value="Public" className="bg-card text-foreground">Public</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Emoji Icon</label>
              <div className="flex flex-wrap gap-2 p-3 bg-accent/15 border border-border/30 rounded-2xl">
                {EMOJIS.map((emojiOption) => (
                  <button
                    key={emojiOption}
                    type="button"
                    onClick={() => setIcon(emojiOption)}
                    className={`w-9 h-9 flex items-center justify-center text-xl rounded-xl border transition-all ${
                      icon === emojiOption
                        ? "bg-primary/20 border-primary text-foreground scale-105"
                        : "border-transparent hover:bg-accent/40 text-foreground/80"
                    }`}
                  >
                    {emojiOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Color Theme</label>
              <div className="flex gap-3">
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.name}
                    type="button"
                    onClick={() => setTheme(themeOption.name)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${themeOption.color} ${
                      theme === themeOption.name
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent"
                    }`}
                  >
                    {theme === themeOption.name && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl text-xs font-bold h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold h-9 shadow-md">
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
