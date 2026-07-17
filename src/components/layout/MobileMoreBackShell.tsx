import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function MobileMoreBackShell({
  title,
  children,
  right,
  className = 'p-4 sm:p-6',
}: {
  title: string
  children: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 md:hidden">
        <Link
          to="/more"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-panel text-text-secondary hover:bg-muted"
          aria-label="Back to More"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-tight text-text">
          {title}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`}>{children}</div>
    </div>
  )
}
