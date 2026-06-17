import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'

interface SettingsModalProps {
  open: boolean
  initialValues: AppSettings | null
  onClose: () => void
  onSave: (settings: AppSettings) => void
}

const EMPTY: AppSettings = {
  org: '',
  project: '',
  pat: '',
  areaPath: '',
  teamMembers: '',
}

export function SettingsModal({ open, initialValues, onClose, onSave }: SettingsModalProps) {
  const [values, setValues] = useState<AppSettings>(initialValues ?? EMPTY)

  useEffect(() => {
    if (open) setValues(initialValues ?? EMPTY)
  }, [open, initialValues])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(values)
  }

  function set(key: keyof AppSettings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Field label="Organization" hint="Your Azure DevOps org slug">
            <input
              type="text"
              required
              placeholder="my-org"
              value={values.org}
              onChange={set('org')}
              className={inputCls}
            />
          </Field>

          <Field label="Project">
            <input
              type="text"
              required
              placeholder="MyProject"
              value={values.project}
              onChange={set('project')}
              className={inputCls}
            />
          </Field>

          <Field label="Personal Access Token" hint='Required scope: "Analytics (Read)"'>
            <input
              type="password"
              required
              placeholder="••••••••••••••••"
              value={values.pat}
              onChange={set('pat')}
              className={inputCls}
            />
          </Field>

          <Field label="Area Path" hint="Optional — leave empty for all areas">
            <input
              type="text"
              placeholder="MyProject\TeamA"
              value={values.areaPath}
              onChange={set('areaPath')}
              className={inputCls}
            />
          </Field>

          <Field
            label="Team Members"
            hint="Optional — comma-separated UPNs/emails. Leave empty for all assigned users."
          >
            <textarea
              rows={3}
              placeholder="jane@company.com, bob@company.com"
              value={values.teamMembers}
              onChange={set('teamMembers')}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠ The PAT is stored in localStorage — only use this app in trusted local environments.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}
