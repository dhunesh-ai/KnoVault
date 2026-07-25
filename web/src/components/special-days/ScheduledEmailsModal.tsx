"use client";

import { useEffect, useState } from "react";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { ScheduledEmail } from "@/types/SpecialDay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, Trash2, Clock, CheckCircle2, AlertCircle, Send, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduledEmailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduledEmailsModal({ open, onOpenChange }: ScheduledEmailsModalProps) {
  const { scheduledEmails, isLoadingScheduledEmails, fetchScheduledEmails, deleteScheduledEmail } = useSpecialDaysStore();
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchScheduledEmails();
    }
  }, [open, fetchScheduledEmails]);

  const filteredEmails = scheduledEmails.filter((email) => {
    if (filter === "all") return true;
    return email.status.toLowerCase() === filter.toLowerCase();
  });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteScheduledEmail(id);
      toast.success("Scheduled email cancelled and deleted");
    } catch (e) {
      toast.error("Failed to cancel scheduled email");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Send className="w-3 h-3 mr-1" /> Sending</Badge>;
      case "sent":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-violet-600" />
        
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-card/40">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            📬 Scheduled Emails
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            Manage automated email wishes queued for birthdays, anniversaries, and custom celebrations.
          </DialogDescription>

          <div className="pt-4">
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="bg-card border border-border p-1 w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">All ({scheduledEmails.length})</TabsTrigger>
                <TabsTrigger value="scheduled">Pending ({scheduledEmails.filter(e => e.status === "scheduled").length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({scheduledEmails.filter(e => e.status === "sent").length})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({scheduledEmails.filter(e => e.status === "failed").length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
          {isLoadingScheduledEmails ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
              <p className="text-sm text-muted-foreground">Loading scheduled email queue...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 text-purple-500">
                <Mail className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-foreground">No Scheduled Emails</h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Wishes you schedule for special days will appear in this automated queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <AnimatePresence>
                {filteredEmails.map((email: ScheduledEmail) => {
                  const sendDate = new Date(email.send_datetime);
                  return (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 rounded-2xl bg-card/70 border border-border/60 hover:border-purple-500/30 transition-all shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(email.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {email.timezone || "UTC"}
                          </span>
                        </div>
                        {email.status === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(email.id)}
                            disabled={deletingId === email.id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8"
                          >
                            {deletingId === email.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                            Cancel
                          </Button>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-foreground text-base">{email.subject}</h4>
                        <p className="text-xs font-semibold text-purple-400 mt-0.5">Recipient: {email.recipient_email}</p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {email.body}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          {format(sendDate, "EEEE, MMMM do, yyyy 'at' hh:mm a")}
                        </span>
                        {email.retry_count > 0 && (
                          <span className="text-amber-400 font-bold">Retried {email.retry_count}x</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
