import { useState, type FormEvent, type HTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from './auth'
import { BrandLogo } from './BrandLogo'

const AUTH_BTN =
  'auth-btn inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fcd535] text-[15px] font-semibold tracking-wide !text-[#202630] transition-colors duration-200 hover:bg-[#ceaf30] disabled:cursor-not-allowed disabled:opacity-60'
const AUTH_BTN_STYLE = { color: '#202630' } as const
const AUTH_LINK = 'font-semibold text-[#fcd535] transition-colors hover:text-[#ceaf30]'
const AUTH_INPUT =
  'auth-input h-12 w-full rounded-lg border border-[#2b3139] bg-transparent px-3.5 text-[15px] text-[#EAECEF] outline-none transition-all duration-200 placeholder:text-[#848e9c] hover:border-[#F0B90B] focus:border-[#F0B90B] focus:shadow-[0_0_0_3px_rgba(240,185,11,0.12)]'

function AuthSubmitButton({
  loading,
  children,
  disabled,
}: {
  loading: boolean
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button type="submit" disabled={disabled || loading} className={AUTH_BTN} style={AUTH_BTN_STYLE}>
      {loading ? (
        <Loader2 size={22} strokeWidth={2.25} className="animate-spin" aria-label="Loading" />
      ) : (
        children
      )}
    </button>
  )
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-sell/40 bg-transparent px-3.5 py-2.5 text-sm text-sell">{message}</p>
  )
}

function AuthShell({
  title,
  subtitle,
  children,
  mobileTopSpaced,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  mobileTopSpaced?: boolean
}) {
  return (
    <div
      className={`relative flex min-h-full justify-center overflow-hidden px-4 ${
        mobileTopSpaced
          ? 'items-start pt-[30px] pb-10 sm:items-center sm:py-16'
          : 'items-center py-10 sm:py-16'
      }`}
      style={{ background: '#161a21' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(252,213,53,0.08), transparent 55%)',
        }}
      />
      <div
        className={`relative w-full max-w-[420px] rounded-none border-0 p-[10px] sm:mt-0 sm:rounded-[24px] sm:border sm:border-[#333B47] sm:p-10 ${
          mobileTopSpaced ? 'mt-0' : '-mt-[20px]'
        }`}
      >
        <div className="mb-5 text-left">
          <div className="mb-[30px] flex justify-start sm:mb-0">
            <BrandLogo variant="dark" className="h-11 sm:h-12" />
          </div>
          <p className="mt-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#fcd535]">
            CRM Admin
          </p>
          <h1 className="mt-1 mb-[20px] text-left text-[26px] font-semibold tracking-tight text-[#EAECEF] sm:text-[28px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-[14px] leading-relaxed text-[#848e9c]">{subtitle}</p> : null}
        </div>
        <div className="bg-transparent">{children}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  autoFocus,
  placeholder,
  name,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  autoFocus?: boolean
  placeholder?: string
  name?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium tracking-wide text-[#EAECEF]">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        autoFocus={autoFocus}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`${AUTH_INPUT} !bg-transparent`}
        style={{ backgroundColor: 'transparent' }}
        required
      />
    </label>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium tracking-wide text-[#EAECEF]">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name="password"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${AUTH_INPUT} !bg-transparent pr-11`}
          style={{ backgroundColor: 'transparent' }}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3.5 top-1/2 z-20 -translate-y-1/2 cursor-pointer bg-transparent p-0.5 text-[#848e9c] transition-colors hover:text-[#F0B90B]"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
    </label>
  )
}

export function LoginPage() {
  const { login, verify2fa, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [code, setCode] = useState('')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!authLoading && user) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (tempToken) {
      const err = await verify2fa(tempToken, code)
      setLoading(false)
      if (err) setError(err)
      else navigate('/')
      return
    }
    const result = await login(email, password)
    setLoading(false)
    if (!result) {
      navigate('/')
      return
    }
    if (result.requires2fa && result.tempToken) {
      setTempToken(result.tempToken)
      return
    }
    setError(result.error || 'Login failed')
  }

  if (tempToken) {
    return (
      <AuthShell title="Two-step verification" subtitle="Enter the 6-digit code from Google Authenticator">
        <form onSubmit={onSubmit} className="space-y-5" autoComplete="on">
          {error ? <AuthError message={error} /> : null}
          <Field
            label="Authenticator code"
            value={code}
            onChange={setCode}
            inputMode="numeric"
            autoFocus
            placeholder="Enter 6-digit code"
            name="otp"
            autoComplete="one-time-code"
          />
          <AuthSubmitButton loading={loading} disabled={code.replace(/\s/g, '').length < 6}>
            Verify & sign in
          </AuthSubmitButton>
          <button
            type="button"
            className="h-10 w-full text-sm text-[#848e9c] transition-colors hover:text-[#EAECEF]"
            onClick={() => {
              setTempToken(null)
              setCode('')
              setError(null)
            }}
          >
            ← Back to password
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Log in" subtitle="Manager · Employee · Admin desk">
      <form onSubmit={onSubmit} className="space-y-5" autoComplete="on">
        {error ? <AuthError message={error} /> : null}
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          placeholder="Email"
        />
        <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Password" />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#848e9c]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="auth-checkbox h-4 w-4 cursor-pointer rounded border border-[#2b3139]"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[#fcd535] transition-colors hover:text-[#ceaf30]"
          >
            Forgot password?
          </Link>
        </div>
        <AuthSubmitButton loading={loading}>Log In</AuthSubmitButton>
      </form>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!authLoading && user) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // UI flow — reset email is handled by support / upcoming API
    await new Promise((r) => window.setTimeout(r, 600))
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your staff email. We'll send you a link to reset your password."
      mobileTopSpaced
    >
      {sent ? (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-[#848e9c]">
            If a CRM account exists for <span className="font-medium text-[#EAECEF]">{email}</span>,
            you’ll receive password reset instructions shortly.
          </p>
          <Link to="/login" className={`${AUTH_BTN} inline-flex items-center justify-center`} style={AUTH_BTN_STYLE}>
            Back to Log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            placeholder="Email"
          />
          <AuthSubmitButton loading={loading} disabled={!email.trim()}>
            Reset
          </AuthSubmitButton>
          <p className="text-center text-sm text-[#848e9c]">
            Remembered it?{' '}
            <Link to="/login" className={AUTH_LINK}>
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
