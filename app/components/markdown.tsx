import RMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-[75ch] w-[75ch]">
      <RMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1] || "text";
            const code = String(children).replace(/\n$/, "");

            const isInline =
              node?.position?.start.line === node?.position?.end.line;

            // const { data: highlightedCode } = useSuspenseQuery({
            //   queryKey: [code],
            //   queryFn: async () => {
            //     try {
            //       const highlightedCode = await codeToHtml(code, {
            //         lang: language,
            //         theme: "github-dark",
            //         transformers: [
            //           {
            //             pre(node) {
            //               if (isInline) {
            //                 this.addClassToHast(node, "pre-inline not-prose");
            //               }
            //             },
            //           },
            //         ],
            //       });
            //       return highlightedCode;
            //     } catch (err) {
            //       console.log(err);
            //       return null;
            //     }
            //   },
            // });
            //
            // return highlightedCode ? (
            //   <span
            //     dangerouslySetInnerHTML={{ __html: highlightedCode }}
            //   ></span>
            // ) : (
            //   <code {...rest} className={className}>
            //     {children}
            //   </code>
            // );
            //
            return (
              <Highlight
                code={code}
                language={language}
                theme={themes.duotoneDark}
              >
                {({ style, tokens, getLineProps, getTokenProps }) => {
                  const Tag = isInline ? "span" : "pre";
                  return (
                    <Tag
                      style={{
                        ...style,
                        display: isInline ? "inline" : style.display,
                      }}
                      className={isInline ? "not-prose" : ""}
                    >
                      {tokens.map((line, i) => {
                        const lineProps = getLineProps({ line });
                        const LineTag = isInline ? "span" : "div";
                        return (
                          <LineTag
                            key={i}
                            {...lineProps}
                            style={{
                              ...lineProps.style,
                              display: isInline
                                ? "inline"
                                : lineProps.style?.display,
                            }}
                          >
                            {line.map((token, key) => {
                              return (
                                <span
                                  key={key}
                                  {...getTokenProps({ token, key })}
                                />
                              );
                            })}
                          </LineTag>
                        );
                      })}
                    </Tag>
                  );
                }}
              </Highlight>
            );
          },
        }}
      >
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
