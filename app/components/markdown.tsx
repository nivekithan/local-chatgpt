import RMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BundledLanguage, codeToHtml } from "shiki";
import { useSuspenseQuery } from "@tanstack/react-query";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-[75ch] w-[75ch]">
      <RMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = (match?.[1] || "text") as BundledLanguage;
            const code = String(children).replace(/\n$/, "");

            const isInline =
              node?.position?.start.line === node?.position?.end.line;

            const { data: highlightedCode } = useSuspenseQuery({
              queryKey: [code],
              queryFn: async () => {
                try {
                  const highlightedCode = await codeToHtml(code, {
                    lang: language,
                    theme: "github-dark",
                    transformers: [
                      {
                        pre(node) {
                          if (isInline) {
                            this.addClassToHast(node, "pre-inline not-prose");
                          }
                        },
                      },
                    ],
                  });
                  return highlightedCode;
                } catch (err) {
                  console.log(err);
                  return null;
                }
              },
            });

            return highlightedCode ? (
              <span
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              ></span>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </RMarkdown>
    </div>
  );
}
