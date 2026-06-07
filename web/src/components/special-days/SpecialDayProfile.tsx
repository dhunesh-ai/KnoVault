"use client";

import { SpecialDay } from "@/types/SpecialDay";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Gift, CalendarHeart, MessageSquare, PartyPopper, CalendarDays, Edit2, Trash2 } from "lucide-react";
import { format, differenceInYears, isToday, addYears, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SpecialDayProfileProps {
  specialDay: SpecialDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (day: SpecialDay) => void;
  onDelete: (id: number) => void;
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  content?: string | null;
  onCopy?: () => void;
}

const Section = ({ title, icon: Icon, content, onCopy }: SectionProps) => {
  if (!content) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 relative group">
      <div className="flex items-center gap-2 text-pink-400">
        <Icon className="w-4 h-4" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      {onCopy && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Copy className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export function SpecialDayProfile({ specialDay, open, onOpenChange, onEdit, onDelete }: SpecialDayProfileProps) {
  if (!specialDay) return null;

  const originalDate = new Date(specialDay.date);
  
  const getNextOccurrence = () => {
    if (!specialDay.is_recurring) return originalDate;
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
    if (isPast(nextDate) && !isToday(nextDate)) {
      nextDate = addYears(nextDate, 1);
    }
    return nextDate;
  };

  const nextOccurrence = getNextOccurrence();
  const isHappeningToday = isToday(nextOccurrence);
  const daysUntil = differenceInDays(nextOccurrence, new Date());
  
  const getAgeOrYearsText = () => {
    if (!specialDay.is_recurring) return null;
    const years = differenceInYears(nextOccurrence, originalDate);
    if (years <= 0) return null;
    if (specialDay.type.toLowerCase() === "birthday") return `Turning ${years}`;
    if (specialDay.type.toLowerCase() === "anniversary") return `${years}th Anniversary`;
    return `${years} Years`;
  };

  const ageText = getAgeOrYearsText();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-background border-l border-border text-foreground p-0 flex flex-col">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
        
        <SheetHeader className="p-6 pb-4 border-b border-border text-left">
          <div className="flex justify-between items-start gap-4 pr-6">
            <div>
              <SheetTitle className="text-2xl font-bold text-foreground mb-1">
                {specialDay.title}
              </SheetTitle>
              <p className="text-pink-400 font-medium">
                {format(nextOccurrence, 'EEEE, MMMM do, yyyy')}
              </p>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl px-4 py-2 shrink-0 min-w-[80px]">
              {isHappeningToday ? (
                <span className="font-bold text-pink-500 animate-pulse text-lg">TODAY</span>
              ) : (
                <>
                  <span className="text-2xl font-bold text-foreground">{daysUntil}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Days</span>
                </>
              )}
            </div>
          </div>
          
          {ageText && (
            <div className="inline-flex items-center gap-1 text-sm font-medium bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full mt-3">
              <PartyPopper className="w-4 h-4" />
              {ageText}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4 pb-6">
            <Section 
              title="Gift Ideas" 
              icon={Gift} 
              content={specialDay.gift_ideas} 
              onCopy={() => handleCopy(specialDay.gift_ideas!, 'Gift ideas')}
            />
            <Section 
              title="Celebration Plans" 
              icon={PartyPopper} 
              content={specialDay.celebration_plans} 
            />
            <Section 
              title="Message Draft" 
              icon={MessageSquare} 
              content={specialDay.message_draft} 
              onCopy={() => handleCopy(specialDay.message_draft!, 'Message draft')}
            />
            <Section 
              title="Reminder Notes" 
              icon={CalendarHeart} 
              content={specialDay.reminder_notes} 
            />
            <Section 
              title="Additional Notes" 
              icon={CalendarDays} 
              content={specialDay.notes} 
              onCopy={() => handleCopy(specialDay.notes!, 'Notes')}
            />
            
            {!specialDay.gift_ideas && !specialDay.celebration_plans && !specialDay.message_draft && !specialDay.reminder_notes && !specialDay.notes && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No additional details saved for this event.</p>
                <Button variant="link" className="text-pink-400 mt-2" onClick={() => onEdit(specialDay)}>
                  Add details
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md flex justify-between">
          <Button variant="outline" className="border-border text-red-400 hover:bg-red-400/10" onClick={() => {
            onOpenChange(false);
            onDelete(specialDay.id);
          }}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button className="bg-muted hover:bg-accent text-foreground" onClick={() => {
            onEdit(specialDay);
          }}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit Event
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
