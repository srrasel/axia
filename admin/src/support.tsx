import { useEffect, useState } from 'react'
import { api } from './api'
import { PageHeader, Panel, StatusBadge, TablePagination, usePagination, actionBtnNeutral, actionBtnSuccess } from './layout'

type SupportRow = {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
  user: { id: string; name: string; email: string }
}

export function SupportMessagesPage() {
  const [rows, setRows] = useState<SupportRow[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const pager = usePagination(rows)

  const load = () => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ''
    void api<{ messages: SupportRow[] }>(`/api/admin/support-messages${q}`)
      .then((r) => setRows(r.messages))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => {
    load()
  }, [status])

  const setMessageStatus = async (id: string, next: 'open' | 'closed') => {
    try {
      await api(`/api/admin/support-messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  return (
    <div>
      <PageHeader title="Support Messages" subtitle="Messages submitted from the member support form.">
        <select
          className="h-10 rounded-xl border border-border bg-panel px-3 text-sm outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </PageHeader>

      {error ? <p className="mb-3 text-sm text-sell">{error}</p> : null}

      <Panel title="Inbox" subtitle="Latest messages from members" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-[14px] text-secondary">
              <tr>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">User</th>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">Subject</th>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">Message</th>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">Status</th>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">Date</th>
                <th className="pl-[15px] pr-3 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-secondary">
                    No support messages yet.
                  </td>
                </tr>
              ) : (
                pager.pageItems.map((m) => (
                  <tr key={m.id} className="border-t border-border/70 align-top">
                    <td className="pl-[15px] pr-3 py-2.5">
                      <div className="font-medium text-white">{m.user.name}</div>
                      <div className="text-xs text-secondary">{m.user.email}</div>
                    </td>
                    <td className="pl-[15px] pr-3 py-2.5 font-medium">{m.subject}</td>
                    <td className="pl-[15px] pr-3 py-2.5 max-w-sm whitespace-pre-wrap text-secondary">{m.message}</td>
                    <td className="pl-[15px] pr-3 py-2.5">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="pl-[15px] pr-3 py-2.5 text-xs text-secondary">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="pl-[15px] pr-3 py-2.5">
                      {m.status === 'open' ? (
                        <button
                          type="button"
                          className={actionBtnSuccess}
                          onClick={() => void setMessageStatus(m.id, 'closed')}
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={actionBtnNeutral}
                          onClick={() => void setMessageStatus(m.id, 'open')}
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          from={pager.from}
          to={pager.to}
          onPageChange={pager.setPage}
        />
      </Panel>
    </div>
  )
}
