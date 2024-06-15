import RMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Rhighlight from "rehype-highlight";

export function FasterMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-[75ch] w-[75ch]">
      <RMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[Rhighlight]}>
        {content}
      </RMarkdown>
    </div>
  );
}

export function SimpleMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-[75ch] w-[75ch]">
      <RMarkdown remarkPlugins={[remarkGfm]}>{content}</RMarkdown>
    </div>
  );
}
