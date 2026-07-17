import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  Crosshair,
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
  { to: '/signals', label: 'Signals', icon: Store, section: 'tools', tone: 'text-link' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, section: 'tools', tone: 'text-buy' },
  { to: '/reports', label: 'Reports', icon: LayoutDashboard, section: 'tools', tone: 'text-link' },
  { to: '/calendar', label: 'Calendar', icon: Calendar, section: 'tools', tone: 'text-buy' },
  { to: '/account/invite', label: 'Refer a Friend', icon: UserPlus, section: 'rewards', tone: 'text-link' },
  { to: '/ai', label: 'AI Assistant', icon: Sparkles, section: 'education', tone: 'text-link' },
  { to: '/premium', label: 'Premium', icon: Crosshair, section: 'education', tone: 'text-buy' },
  { to: '/account/questionnaire', label: 'Questionnaire', icon: ClipboardList, section: 'education', tone: 'text-buy' },
  { to: '/account/deposit', label: 'Deposit', icon: ArrowDownToLine, section: 'funding', tone: 'text-buy' },
  { to: '/account/withdraw', label: 'Withdraw', icon: ArrowUpFromLine, section: 'funding', tone: 'text-sell' },
  { to: '/account/transactions', label: 'Transactions', icon: Wallet, section: 'funding', tone: 'text-link' },
  { to: '/account/mobile', label: 'Mobile App', icon: Smartphone, section: 'platform', tone: 'text-link' },
  { to: '/notifications', label: 'Notifications', icon: Bell, section: 'support', tone: 'text-link' },
  { to: '/account/verification', label: 'Verification', icon: ShieldCheck, section: 'support', tone: 'text-buy' },
  { to: '/account/details', label: 'Help & Settings', icon: MessageCircle, section: 'support', tone: 'text-link' },
]

function FeatureCard({ card }: { card: MoreCard }) {
  const Icon = card.icon
  return (
    <Link
      to={card.to}
      className="flex h-full min-h-[5.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-transparent px-1.5 py-2.5 text-center transition-colors hover:border-border hover:bg-sidebar-active/60 active:scale-[0.98]"
    >
      <span
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#29313d]/80',
          card.tone,
        )}
      >
        <Icon size={16} strokeWidth={1.85} />
      </span>
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-text">
        {card.label}
      </span>
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
        {/* Promo cards — single surface, no nested colored blocks */}
        <div className="space-y-3 px-4 pt-4 sm:px-6">
          <Link
            to="/account/deposit"
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3.5 transition-colors hover:bg-sidebar-active/50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-buy/35 text-buy">
              <ArrowDownToLine size={20} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-text">Fund your account</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                Deposit to unlock premium tools and signals
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-text-secondary" />
          </Link>

          <Link
            to="/account/invite"
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3.5 transition-colors hover:bg-sidebar-active/50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-link/35 text-link">
              <UserPlus size={20} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-text">Referral program</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                Invite friends and earn when they join
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-text-secondary" />
          </Link>
        </div>

        <div className="sticky top-0 z-10 bg-panel px-4 pt-3 pb-[5px] sm:px-6">
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
                      ? 'bg-white text-[#202630]'
                      : 'border border-border text-text-secondary hover:bg-sidebar-active hover:text-text',
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6 px-4 pb-6 sm:px-6">
          {visibleSections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 text-base font-bold text-text">{section.label}</h2>
              <div className="grid grid-cols-3 items-stretch gap-2">
                {section.cards.map((card) => (
                  <FeatureCard key={card.to} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
