import { Button } from "~/components/ui/button";
import { Copy } from "lucide-react";
import { ReactNode, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";

export const CopyButton = ({ content }: { content: ReactNode }) => {
  const toCopy = useMemo(() => {
    return convertReactToString(content);
  }, [content]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2"
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(toCopy);
            toast("Copied to clipboard", { position: "top-right" });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Copy code to clipboard</p>
      </TooltipContent>
    </Tooltip>
  );
};

function convertReactToString(ele: ReactNode): string {
  if (!ele) {
    return "";
  }

  if (typeof ele === "boolean") {
    return String(ele);
  }

  if (typeof ele === "string") {
    return ele;
  }

  if (Array.isArray(ele)) {
    return ele.map(convertReactToString).join("");
  }

  if (typeof ele === "number") {
    return String(ele);
  }

  if ("props" in ele && "children" in ele.props) {
    return convertReactToString(ele.props.children);
  }

  return "";
}
