import RMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Rhighlight from "rehype-highlight";
import { CopyButton } from "./copyButton";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-[75ch] w-[75ch]">
      <RMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[Rhighlight]}
        components={{
          code({ children, className, ...props }) {
            const isInline = !className;

            if (isInline) {
              return <code {...props}>{children}</code>;
            }

            return (
              <div className="relative">
                <CopyButton content={children} />

                <code {...props} className={className}>
                  {children}
                </code>
              </div>
            );
          },
        }}
      >
        {content}
      </RMarkdown>
    </div>
  );
}
