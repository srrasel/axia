import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  Crosshair,
  Gift,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'

type SectionKey = 'tools' | 'rewards' | 'education' | 'funding' | 'platform' | 'support'

type MoreCard = {
  to: string
  label: string
  icon: LucideIcon
  section: SectionKey
  tone: string
}

const FILTERS: Array<{ key: 'popular' | SectionKey; label: string }> = [
  { key: 'popular', label: 'Popular' },
  { key: 'tools', label: 'Tools' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'education', label: 'Education' },
  { key: 'funding', label: 'Funding' },
  { key: 'platform', label: 'Platform' },
  { key: 'support', label: 'Support' },
]

const SECTION_ORDER: SectionKey[] = ['tools', 'rewards', 'education', 'funding', 'platform', 'support']

const SECTION_LABELS: Record<SectionKey, string> = {
  tools: 'Tools',
  rewards: 'Rewards',
  education: 'Education',
  funding: 'Funding',
  platform: 'Platform',
  support: 'Support',
}

/** Tools 4 · Rewards 1 · Education 3 · Funding 3 · Platform 1 · Support 3 */
const CARDS: MoreCard[] = [
  // Tools — 4
  { to: '/signals', label: 'Signals', icon: Store, section: 'tools', tone: 'text-[#fcd535]' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, section: 'tools', tone: 'text-link' },
  { to: '/reports', label: 'Reports', icon: LayoutDashboard, section: 'tools', tone: 'text-buy' },
  { to: '/calendar', label: 'Calendar', icon: Calendar, section: 'tools', tone: 'text-[#fcd535]' },
  // Rewards — 1
  { to: '/account/invite', label: 'Refer a Friend', icon: UserPlus, section: 'rewards', tone: 'text-[#fcd535]' },
  // Education — 3
  { to: '/ai', label: 'AI Assistant', icon: Sparkles, section: 'education', tone: 'text-link' },
  { to: '/premium', label: 'Premium', icon: Crosshair, section: 'education', tone: 'text-[#fcd535]' },
  { to: '/account/questionnaire', label: 'Questionnaire', icon: ClipboardList, section: 'education', tone: 'text-buy' },
  // Funding — 3
  { to: '/account/deposit', label: 'Deposit', icon: ArrowDownToLine, section: 'funding', tone: 'text-buy' },
  { to: '/account/withdraw', label: 'Withdraw', icon: ArrowUpFromLine, section: 'funding', tone: 'text-sell' },
  { to: '/account/transactions', label: 'Transactions', icon: Wallet, section: 'funding', tone: 'text-[#fcd535]' },
  // Platform — 1
  { to: '/account/mobile', label: 'Mobile App', icon: Smartphone, section: 'platform', tone: 'text-link' },
  // Support — 3
  { to: '/notifications', label: 'Notifications', icon: Bell, section: 'support', tone: 'text-[#fcd535]' },
  { to: '/account/verification', label: 'Verification', icon: ShieldCheck, section: 'support', tone: 'text-buy' },
  { to: '/account/details', label: 'Help & Settings', icon: MessageCircle, section: 'support', tone: 'text-link' },
]

const BANNERS = [
  {
    to: '/account/deposit',
    title: 'Boost your trading capital',
    subtitle: 'Deposit to unlock premium tools and signals',
    className: 'from-[#2a2410] via-[#3d3214] to-[#1a1d23]',
    accent: 'bg-[#fcd535]',
  },
  {
    to: '/account/invite',
    title: 'Invite friends, earn rewards',
    subtitle: 'Share your referral code and grow together',
    className: 'from-[#12151a] via-[#1c222c] to-[#29313d]',
    accent: 'bg-buy',
  },
]

function FeatureCard({ card }: { card: MoreCard }) {
  const Icon = card.icon
  return (
    <Link
      to={card.to}
      className="flex flex-col items-center gap-2 rounded-2xl bg-muted px-2 py-4 text-center transition-colors hover:bg-sidebar-active active:scale-[0.98]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel shadow-sm">
        <Icon size={24} strokeWidth={1.75} className={card.tone} />
      </span>
      <span className="text-[12px] font-semibold leading-tight text-text">{card.label}</span>
    </Link>
  )
}

export function MorePage() {
  const [filter, setFilter] = useState<'popular' | SectionKey>('popular')

  const visibleSections = useMemo(() => {
    const keys = filter === 'popular' ? SECTION_ORDER : SECTION_ORDER.filter((k) => k === filter)
    return keys.map((key) => ({
      key,
      label: SECTION_LABELS[key],
      cards: CARDS.filter((c) => c.section === key),
    }))
  }, [filter])

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          {BANNERS.map((b) => (
            <Link
              key={b.to}
              to={b.to}
              className={clsx(
                'relative flex min-h-[108px] w-[min(100%,320px)] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm',
                b.className,
              )}
            >
              <div className="relative z-10 max-w-[70%] pr-2">
                <div className="text-[17px] font-bold leading-snug">{b.title}</div>
                <p className="mt-1.5 text-[12px] leading-snug text-white/75">{b.subtitle}</p>
              </div>
              <div
                className={clsx(
                  'absolute -bottom-3 -right-2 flex h-20 w-20 items-center justify-center rounded-2xl opacity-90',
                  b.accent,
                )}
              >
                <Gift size={36} className="text-[#202630]" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>

        <div className="sticky top-0 z-10 bg-panel/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={clsx(
                    'h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-[#fcd535] text-[#202630]'
                      : 'bg-muted text-text-secondary hover:bg-sidebar-active hover:text-text',
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6 px-4 pb-6 sm:px-6">
          {visibleSections.map((section) => {
            const cols = section.cards.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'
            return (
              <section key={section.key}>
                <h2 className="mb-3 text-base font-bold text-text">{section.label}</h2>
                <div className={clsx('grid gap-2.5', cols)}>
                  {section.cards.map((card) => (
                    <FeatureCard key={card.to} card={card} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
