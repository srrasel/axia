import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Toast } from '../components/layout/Header'
import { BrandLogo } from '../components/BrandLogo'

const AUTH_BTN =
  'auth-btn h-12 w-full rounded-lg bg-[#fcd535] text-[15px] font-semibold tracking-wide !text-[#202630] transition-all duration-200 hover:bg-[#ceaf30] hover:shadow-[0_0_0_1px_rgba(252,213,53,0.15)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'
const AUTH_BTN_STYLE = { color: '#202630' } as const
const AUTH_LINK = 'font-semibold text-[#fcd535] transition-colors hover:text-[#ceaf30]'
const AUTH_INPUT =
  'h-12 w-full rounded-lg border border-[#2b3139] bg-transparent px-3.5 text-[15px] text-[#EAECEF] outline-none transition-all duration-200 placeholder:text-[#848e9c] hover:border-[#F0B90B] focus:border-[#F0B90B] focus:shadow-[0_0_0_3px_rgba(240,185,11,0.12)]'

export function LoginPage() {
  const { login, verifyLogin2fa, isAuthenticated } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [code, setCode] = useState('')

  if (isAuthenticated) return <Navigate to="/platform" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await login(email, password, remember)
    setLoading(false)
    if (!result) {
      navigate('/platform')
      return
    }
    if (result.requires2fa && result.tempToken) {
      setTempToken(result.tempToken)
      return
    }
    setError(result.error || 'Login failed')
  }

  const onVerify2fa = async (e: FormEvent) => {
    e.preventDefault()
    if (!tempToken) return
    setLoading(true)
    setError(null)
    const err = await verifyLogin2fa(tempToken, code)
    setLoading(false)
    if (err) setError(err)
    else navigate('/platform')
  }

  if (tempToken) {
    return (
      <AuthShell title="Two-step verification" subtitle="Enter the 6-digit code from Google Authenticator">
        <form onSubmit={onVerify2fa} className="space-y-5">
          {error ? <AuthError message={error} /> : null}
          <Field
            label="Authenticator code"
            value={code}
            onChange={setCode}
            inputMode="numeric"
            autoFocus
            placeholder="Enter 6-digit code"
          />
          <button
            type="submit"
            disabled={loading || code.replace(/\s/g, '').length < 6}
            className={AUTH_BTN}
            style={AUTH_BTN_STYLE}
          >
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
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
        <Toast />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your NitajFX trading account">
      <form onSubmit={onSubmit} className="space-y-5">
        {error ? <AuthError message={error} /> : null}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Email" />
        <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Password" />
        <label className="flex items-center gap-2.5 text-sm text-[#848e9c]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-[#2b3139] accent-[#fcd535]"
          />
          Remember me
        </label>
        <button type="submit" disabled={loading} className={AUTH_BTN} style={AUTH_BTN_STYLE}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-[#848e9c]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className={AUTH_LINK}>
          Create an account
        </Link>
      </p>
      <Toast />
    </AuthShell>
  )
}

export function RegisterPage() {
  const { register, isAuthenticated } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const referralCode = params.get('ref') || undefined

  if (isAuthenticated) return <Navigate to="/platform" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const err = await register(name, email, password, referralCode)
    setLoading(false)
    if (err) setError(err)
    else navigate('/platform')
  }

  return (
    <AuthShell title="Create account" subtitle="Start trading with NitajFX in minutes">
      <form onSubmit={onSubmit} className="space-y-5">
        {error ? <AuthError message={error} /> : null}
        {referralCode ? (
          <p className="rounded-lg border border-[#F0B90B]/30 bg-transparent px-3.5 py-2.5 text-sm text-[#fcd535]">
            Referral code applied: {referralCode}
          </p>
        ) : null}
        <Field label="Full name" value={name} onChange={setName} placeholder="Full name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Email" />
        <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Password" />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm password"
        />
        <button type="submit" disabled={loading} className={AUTH_BTN} style={AUTH_BTN_STYLE}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-[#848e9c]">
        Already registered?{' '}
        <Link to="/login" className={AUTH_LINK}>
          Sign in
        </Link>
      </p>
      <Toast />
    </AuthShell>
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
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div
      className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-12 sm:py-16"
      style={{ background: '#181a20' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(252,213,53,0.08), transparent 55%)',
        }}
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="flex justify-center">
            <BrandLogo variant="dark" className="h-11 sm:h-12" />
          </div>
          <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-[#EAECEF] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#848e9c]">{subtitle}</p>
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoFocus?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium tracking-wide text-[#EAECEF]">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        inputMode={inputMode}
        placeholder={placeholder}
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
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${AUTH_INPUT} !bg-transparent pr-11`}
          style={{ backgroundColor: 'transparent' }}
          required
          autoComplete={label.toLowerCase().includes('confirm') ? 'new-password' : 'current-password'}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent text-[#848e9c] transition-colors hover:text-[#F0B90B]"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
    </label>
  )
}
