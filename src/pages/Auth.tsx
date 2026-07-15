import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Toast } from '../components/layout/Header'
import { BrandLogo } from '../components/BrandLogo'

const AUTH_BTN =
  'auth-btn h-12 w-full cursor-pointer rounded-lg bg-[#fcd535] text-[15px] font-semibold tracking-wide !text-[#202630] transition-colors duration-200 hover:bg-[#ceaf30] disabled:cursor-not-allowed disabled:opacity-60'
const AUTH_BTN_STYLE = { color: '#202630' } as const
const AUTH_LINK = 'font-semibold text-[#fcd535] transition-colors hover:text-[#ceaf30]'
const AUTH_INPUT =
  'auth-input h-12 w-full rounded-lg border border-[#2b3139] bg-transparent px-3.5 text-[15px] text-[#EAECEF] outline-none transition-all duration-200 placeholder:text-[#848e9c] hover:border-[#F0B90B] focus:border-[#F0B90B] focus:shadow-[0_0_0_3px_rgba(240,185,11,0.12)]'

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
    <AuthShell title="Log in">
      <form onSubmit={onSubmit} className="space-y-5">
        {error ? <AuthError message={error} /> : null}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Email" />
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
          <Link to="/forgot-password" className="text-sm font-medium text-[#fcd535] transition-colors hover:text-[#ceaf30]">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={loading} className={AUTH_BTN} style={AUTH_BTN_STYLE}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
      <SocialAuth />
      <p className="mt-8 text-center text-sm text-[#848e9c]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className={AUTH_LINK}>
          Create an Account
        </Link>
      </p>
      <Toast />
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const { isAuthenticated } = useApp()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/platform" replace />

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
      subtitle="Enter your email and we’ll send reset instructions"
    >
      {sent ? (
        <div className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-[#848e9c]">
            If an account exists for <span className="font-medium text-[#EAECEF]">{email}</span>, you’ll
            receive password reset instructions shortly.
          </p>
          <Link to="/login" className={`${AUTH_BTN} inline-flex items-center justify-center`} style={AUTH_BTN_STYLE}>
            Back to Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Email" />
          <button type="submit" disabled={loading || !email.trim()} className={AUTH_BTN} style={AUTH_BTN_STYLE}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="text-center text-sm text-[#848e9c]">
            Remembered it?{' '}
            <Link to="/login" className={AUTH_LINK}>
              Sign in
            </Link>
          </p>
        </form>
      )}
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
    <AuthShell title="Create account">
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
          {loading ? 'Creating…' : 'Register'}
        </button>
      </form>
      <SocialAuth />
      <p className="mt-8 text-center text-sm text-[#848e9c]">
        Already registered?{' '}
        <Link to="/login" className={AUTH_LINK}>
          Log in
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

const SOCIAL_BTN =
  'relative flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-[#333B47] bg-transparent text-[15px] font-semibold text-[#EAECEF] transition-colors hover:border-[#848e9c] hover:bg-[#1e2329]'

const SOCIAL_ICON_WRAP = 'absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" className="block shrink-0" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="block shrink-0" aria-hidden="true">
      <path
        fill="#2AABEE"
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"
      />
      <path
        fill="#fff"
        d="M17.943 7.236c.14-.613-.504-.988-.987-.72L5.68 13.03c-.48.266-.446.905.07 1.16l2.736 1.36 1.07 3.428c.16.512.748.651 1.13.262l1.728-1.767 3.33 2.456c.48.354 1.164.087 1.285-.512l1.914-11.18zM10.55 15.31l-.28 2.018-.99-3.167 7.108-4.656-5.838 5.805z"
      />
    </svg>
  )
}

function SocialAuth() {
  const [notice, setNotice] = useState<string | null>(null)
  const googleUrl = import.meta.env.VITE_GOOGLE_AUTH_URL as string | undefined
  const telegramUrl = import.meta.env.VITE_TELEGRAM_AUTH_URL as string | undefined

  const onProvider = (provider: 'google' | 'telegram') => {
    const url = provider === 'google' ? googleUrl : telegramUrl
    if (url) {
      window.location.href = url
      return
    }
    setNotice(
      `${provider === 'google' ? 'Google' : 'Telegram'} sign-in is being set up. Use email for now.`,
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#333B47]" />
        <span className="text-[12px] font-medium tracking-wide text-[#848e9c]">or</span>
        <div className="h-px flex-1 bg-[#333B47]" />
      </div>
      <div className="space-y-3">
        <button type="button" className={SOCIAL_BTN} onClick={() => onProvider('google')}>
          <span className={SOCIAL_ICON_WRAP}>
            <GoogleIcon />
          </span>
          Continue with Google
        </button>
        <button type="button" className={SOCIAL_BTN} onClick={() => onProvider('telegram')}>
          <span className={SOCIAL_ICON_WRAP}>
            <TelegramIcon />
          </span>
          Continue with Telegram
        </button>
      </div>
      {notice ? (
        <p className="mt-3 text-center text-[12px] leading-relaxed text-[#848e9c]">{notice}</p>
      ) : null}
    </div>
  )
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div
      className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10 sm:py-16"
      style={{ background: '#161a21' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(252,213,53,0.08), transparent 55%)',
        }}
      />
      <div className="relative w-full max-w-[420px] rounded-none border-0 p-[10px] -mt-[20px] sm:mt-0 sm:rounded-[24px] sm:border sm:border-[#333B47] sm:p-10">
        <div className="mb-5 text-left">
          <div className="mb-[25px] flex justify-start sm:mb-0">
            <BrandLogo variant="dark" className="h-11 sm:h-12" />
          </div>
          <h1 className="mt-3 text-left text-[26px] font-semibold tracking-tight text-[#EAECEF] sm:text-[28px]">
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
          className="absolute right-3.5 top-1/2 z-20 -translate-y-1/2 cursor-pointer bg-transparent p-0.5 text-[#848e9c] transition-colors hover:text-[#F0B90B]"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
    </label>
  )
}
