import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [hour, setHour] = React.useState<string>(value ? format(value, "hh") : "12");
  const [minute, setMinute] = React.useState<string>(value ? format(value, "mm") : "00");
  const [ampm, setAmpm] = React.useState<string>(value ? format(value, "a") : "AM");

  React.useEffect(() => {
    if (value) {
      setDate(value);
      setHour(format(value, "hh"));
      setMinute(format(value, "mm"));
      setAmpm(format(value, "a"));
    }
  }, [value]);

  const updateDateTime = (newDate: Date | undefined, h: string, m: string, a: string) => {
    if (!newDate) {
      onChange(undefined);
      return;
    }
    const updated = new Date(newDate);
    let hours = parseInt(h, 10);
    if (a === "PM" && hours < 12) hours += 12;
    if (a === "AM" && hours === 12) hours = 0;
    
    updated.setHours(hours);
    updated.setMinutes(parseInt(m, 10));
    updated.setSeconds(0);
    updated.setMilliseconds(0);
    onChange(updated);
  };

  const handleDateSelect = (d: Date | undefined) => {
    setDate(d);
    updateDateTime(d, hour, minute, ampm);
  };

  const handleHourChange = (v: string) => {
    setHour(v);
    updateDateTime(date, v, minute, ampm);
  };

  const handleMinuteChange = (v: string) => {
    setMinute(v);
    updateDateTime(date, hour, v, ampm);
  };

  const handleAmpmChange = (v: string) => {
    setAmpm(v);
    updateDateTime(date, hour, minute, v);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-card border-border",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP 'at' p") : <span>Pick a date and time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
        <div className="p-3 border-b border-border flex items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="pointer-events-auto"
          />
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted/30">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Select value={hour} onValueChange={handleHourChange}>
            <SelectTrigger className="w-[70px] bg-background border-border h-8">
              <SelectValue placeholder="Hr" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {hours.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={minute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="w-[70px] bg-background border-border h-8">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border h-48">
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ampm} onValueChange={handleAmpmChange}>
            <SelectTrigger className="w-[70px] bg-background border-border h-8">
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
