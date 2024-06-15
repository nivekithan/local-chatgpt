import * as React from "react";
import { cn } from "~/lib/utils";
import T, { TextareaAutosizeProps } from "react-textarea-autosize";

export interface AutoSizeTextareaProps extends TextareaAutosizeProps {}

const AutoSizeTextArea = React.forwardRef<
  HTMLTextAreaElement,
  AutoSizeTextareaProps
>(({ className, ...props }, ref) => {
  return (
    <T
      className={cn(
        "flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-[50vh]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

AutoSizeTextArea.displayName = "Textarea";

export { AutoSizeTextArea };
