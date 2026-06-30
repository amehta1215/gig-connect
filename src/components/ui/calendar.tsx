import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { startOfDay } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  disablePastDates?: boolean;
};

function Calendar({ className, classNames, showOutsideDays = true, disabled, disablePastDates = true, modifiers, modifiersClassNames, ...props }: CalendarProps) {
  const today = startOfDay(new Date());

  // Combine any existing disabled matcher with past dates (only if disablePastDates is true)
  const disabledMatcher = React.useMemo(() => {
    if (!disablePastDates) return disabled;
    const pastDateMatcher = { before: today };
    if (!disabled) return pastDateMatcher;
    if (Array.isArray(disabled)) return [pastDateMatcher, ...disabled];
    return [pastDateMatcher, disabled];
  }, [disabled, today, disablePastDates]);

  // Always mark past dates so they can be styled distinctly; consumer modifiers can still override
  const allModifiers = {
    past: { before: today },
    ...modifiers,
  };

  const allModifiersClassNames = {
    past: 'day-past',
    ...modifiersClassNames,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      disabled={disabledMatcher}
      modifiers={allModifiers}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/30 [&:has([aria-selected])]:bg-accent/60 [&:has([aria-selected].rdp-day_disabled)]:bg-accent/30 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent/60 hover:text-accent-foreground"),
        day_past: "day-past",
        day_range_end: "day-range-end",
        day_selected:
          "bg-accent/60 text-accent-foreground hover:bg-accent/60 hover:text-accent-foreground focus:bg-accent/60 focus:text-accent-foreground [&.rdp-day_disabled]:bg-accent/30 [&.rdp-day_disabled]:text-accent-foreground/50",
        day_today: "bg-accent text-accent-foreground rounded-full",
        day_outside:
          "day-outside aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "hover:bg-accent/50 hover:text-accent-foreground/50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
