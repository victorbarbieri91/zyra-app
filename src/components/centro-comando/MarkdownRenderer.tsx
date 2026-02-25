'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-chat', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-sm font-semibold text-[#34495e] mb-2 mt-3 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-[#34495e] mb-2 mt-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-[#34495e] mb-2 mt-3 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-[#46627f] mb-1.5 mt-2">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),

          // Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-[#34495e]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          // Tables — reuse project's Table components
          table: ({ children }) => (
            <div className="my-2 border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                {children}
              </Table>
            </div>
          ),
          thead: ({ children }) => (
            <TableHeader>
              {children}
            </TableHeader>
          ),
          tbody: ({ children }) => (
            <TableBody>
              {children}
            </TableBody>
          ),
          tr: ({ children }) => (
            <TableRow className="hover:bg-slate-50">
              {children}
            </TableRow>
          ),
          th: ({ children }) => (
            <TableHead className="text-xs font-medium text-slate-600 bg-slate-50 whitespace-nowrap px-3 py-2">
              {children}
            </TableHead>
          ),
          td: ({ children }) => (
            <TableCell className="text-xs text-slate-700 px-3 py-2">
              {children}
            </TableCell>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="text-sm text-slate-700 ml-4 mb-2 space-y-1 list-disc">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-sm text-slate-700 ml-4 mb-2 space-y-1 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm">{children}</li>
          ),

          // Code
          code: ({ children, className: codeClassName }) => {
            const isBlock = codeClassName?.includes('language-')
            if (isBlock) {
              return (
                <code className={cn(
                  'block bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto',
                  codeClassName
                )}>
                  {children}
                </code>
              )
            }
            return (
              <code className="bg-slate-100 text-[#34495e] text-xs px-1 py-0.5 rounded">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-2">{children}</pre>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-slate-200" />
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#89bcbe] pl-3 my-2 text-sm text-slate-600 italic">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-[#1E3A8A] underline hover:text-[#34495e] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
