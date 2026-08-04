import { useEffect, useState } from 'react'
import { Eye, X, Check, Ban, FileText } from 'lucide-react'
import { api } from './api'
import { PageHeader, Panel, StatusBadge, TablePagination, usePagination, actionBtnPrimary, actionBtnSuccess, actionBtnDanger, actionBtnNeutral, actionTdClass, nameCellClass } from './layout'

type KycDoc = {
  id: string
  kind: string
  docType: string
  fileName: string
  mimeType?: string | null
  status: string
  note?: string | null
  hasFile?: boolean
  createdAt: string
  user: { id: string; name: string; email: string; kycStatus: string }
}

type FilePayload = {
  id: string
  fileName: string
  mimeType?: string | null
  fileData: string
  docType: string
  kind: string
  status: string
  user?: { id: string; name: string; email: string }
}

function fmt(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatKind(kind: string) {
  return kind === 'identity' ? 'Identity' : kind === 'residence' ? 'Residence' : kind
}

export function KycPage() {
  const [documents, setDocuments] = useState<KycDoc[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<FilePayload | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [rejectNote, setRejectNote] = useState('Please re-upload a clearer document')
  const pager = usePagination(documents, 15)

  const load = () =>
    void api<{ documents: KycDoc[] }>('/api/admin/kyc')
      .then((r) => setDocuments(r.documents))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))

  useEffect(() => {
    load()
  }, [])

  async function openPreview(id: string) {
    setPreviewLoading(true)
    setError(null)
    try {
      const r = await api<{ document: FilePayload }>(`/api/admin/kyc/${id}/file`)
      setPreview(r.document)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/kyc/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: status === 'rejected' ? rejectNote : undefined,
        }),
      })
      if (preview?.id === id) setPreview(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const isImage =
    preview &&
    (preview.mimeType?.startsWith('image/') ||
      preview.fileData.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif)$/i.test(preview.fileName))

  return (
    <div>
      <PageHeader
        title="KYC Reviews"
        subtitle="Check passport, national ID, and residence documents. Approve or reject after review."
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-sell/30 bg-sell/15 px-3 py-2 text-sm text-sell">{error}</p>
      ) : null}

      <Panel title="Document Queue" subtitle={`${documents.length} submission(s)`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-[14px] capitalize text-secondary">
              <tr>
                <th className="pl-[15px] pr-3 py-2.5">User</th>
                <th className="pl-[15px] pr-3 py-2.5">Kind</th>
                <th className="pl-[15px] pr-3 py-2.5">Document</th>
                <th className="pl-[15px] pr-3 py-2.5">File</th>
                <th className="pl-[15px] pr-3 py-2.5">Submitted</th>
                <th className="pl-[15px] pr-3 py-2.5">Status</th>
                <th className="pl-[15px] pr-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((d) => (
                <tr key={d.id} className="border-b border-border/60">
                  <td className="pl-[15px] pr-3 py-3">
                    <div className={`${nameCellClass} capitalize`}>{d.user.name}</div>
                    <div className="text-xs text-secondary">{d.user.email}</div>
                  </td>
                  <td className="pl-[15px] pr-3 py-3 capitalize">{formatKind(d.kind)}</td>
                  <td className="pl-[15px] pr-3 py-3 font-medium">{d.docType}</td>
                  <td className="max-w-[180px] truncate pl-[15px] pr-3 py-3 text-secondary" title={d.fileName}>
                    {d.fileName}
                    {!d.hasFile ? (
                      <span className="ml-1 text-[10px] text-sell">(no file)</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap pl-[15px] pr-3 py-3 text-xs text-secondary">{fmt(d.createdAt)}</td>
                  <td className="pl-[15px] pr-3 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className={actionTdClass}>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={previewLoading || !d.hasFile}
                        className={actionBtnNeutral}
                        onClick={() => void openPreview(d.id)}
                      >
                        <Eye size={14} />
                        Check
                      </button>
                      {d.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className={actionBtnSuccess}
                            onClick={() => void review(d.id, 'approved')}
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className={actionBtnDanger}
                            onClick={() => void review(d.id, 'rejected')}
                          >
                            <Ban size={14} />
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-secondary">
                    No KYC documents yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <TablePagination
            page={pager.page}
            totalPages={pager.totalPages}
            total={pager.total}
            from={pager.from}
            to={pager.to}
            onPageChange={pager.setPage}
          />
        </div>
      </Panel>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-text">
                  {preview.docType} · {formatKind(preview.kind)}
                </h2>
                <p className="mt-0.5 truncate text-xs text-secondary">
                  {preview.user?.name} · {preview.user?.email} · {preview.fileName}
                </p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-secondary hover:text-text"
                onClick={() => setPreview(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#0e1116] p-4">
              {isImage ? (
                <img
                  src={preview.fileData}
                  alt={preview.fileName}
                  className="mx-auto max-h-[60vh] max-w-full rounded-lg object-contain"
                />
              ) : preview.fileData.startsWith('data:application/pdf') ||
                preview.mimeType === 'application/pdf' ||
                /\.pdf$/i.test(preview.fileName) ? (
                <iframe
                  title={preview.fileName}
                  src={preview.fileData}
                  className="h-[60vh] w-full rounded-lg border border-border bg-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-secondary">
                  <FileText size={40} />
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a
                    href={preview.fileData}
                    download={preview.fileName}
                    className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-muted"
                  >
                    Download file
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border px-4 py-3 sm:px-5">
              {preview.status === 'pending' ? (
                <label className="block text-xs text-secondary">
                  Reject Note
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-[#12151a] px-3 text-sm text-text outline-none focus:border-accent"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
                {preview.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className={actionBtnDanger}
                      onClick={() => void review(preview.id, 'rejected')}
                    >
                      <Ban size={14} />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={actionBtnPrimary}
                      onClick={() => void review(preview.id, 'approved')}
                    >
                      <Check size={14} />
                      Approve
                    </button>
                  </>
                ) : (
                  <StatusBadge status={preview.status} />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
