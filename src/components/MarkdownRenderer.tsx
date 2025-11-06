import React from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renderiza Markdown de forma segura, com estilos Eco
 * Suporta: negrito, itálico, listas, links, código, blockquotes
 *
 * Mantém espaçamento compacto para caber bem em chat messages
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={clsx("markdown-content space-y-1", className)}>
      <ReactMarkdown
        components={{
        // Parágrafos normais - espaço compacto para chat
        p: ({ children }) => <p className="leading-relaxed">{children}</p>,

        // Negrito
        strong: ({ children }) => (
          <strong className="font-semibold text-eco-dark">{children}</strong>
        ),

        // Itálico
        em: ({ children }) => <em className="italic text-eco-text">{children}</em>,

        // Headings - compactos para chat
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-eco-dark">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-eco-dark">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-eco-dark">{children}</h3>
        ),

        // Listas não-ordenadas - compactas
        ul: ({ children }) => (
          <ul className="ml-4 list-inside space-y-0.5">{children}</ul>
        ),

        // Listas ordenadas - compactas
        ol: ({ children }) => (
          <ol className="ml-4 list-inside space-y-0.5">{children}</ol>
        ),

        // Itens de lista
        li: ({ children }) => <li className="list-disc">{children}</li>,

        // Código inline - com background sutil
        code: ({ children }) => (
          <code className="rounded bg-eco-line/20 px-1.5 py-0.5 font-mono text-sm text-eco-dark">
            {children}
          </code>
        ),

        // Bloco de código - compacto com cores Eco
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-2.5 text-xs text-gray-100">
            {children}
          </pre>
        ),

        // Citações - estilo Eco
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-eco-light pl-3 italic text-eco-text/80">
            {children}
          </blockquote>
        ),

        // Links - com cores Eco
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-eco-primary font-medium underline hover:text-eco-dark transition-colors"
          >
            {children}
          </a>
        ),

        // Quebras de linha
        br: () => <br />,

        // Linhas horizontais - sutil
        hr: () => <hr className="my-1.5 border-eco-line/40" />,

        // Tabelas (se usar remark-gfm no futuro)
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
        th: ({ children }) => (
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
      }}
      // Desabilita HTML raw por segurança
      allowedElements={[
        "p",
        "strong",
        "em",
        "h1",
        "h2",
        "h3",
        "ul",
        "ol",
        "li",
        "code",
        "pre",
        "blockquote",
        "a",
        "br",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ]}
      skipHtml={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
