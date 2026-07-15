import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AccountLayout, PlatformLayout } from './components/layout/Layouts'
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/Auth'
import { TradingPage } from './pages/Trading'
import { PortfolioPage } from './pages/Portfolio'
import {
  AiAssistantPage,
  AnalyticsPage,
  CalendarPage,
  LeaderboardPage,
  NotificationsPage,
  ReportsPage,
  SignalsPage,
} from './pages/Modules'
import {
  AccountDetailsPage,
  DepositPage,
  InvitePage,
  ManageAccountsPage,
  MobileAppPage,
  PremiumPage,
  QuestionnairePage,
  TransactionsPage,
  VerificationPage,
  WithdrawPage,
} from './pages/Account'

function Protected() {
  const { isAuthenticated } = useApp()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<Protected />}>
          <Route element={<PlatformLayout />}>
            <Route path="/" element={<Navigate to="/platform" replace />} />
            <Route path="/platform" element={<TradingPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/signals" element={<SignalsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/ai" element={<AiAssistantPage />} />
          </Route>

          <Route path="/account" element={<AccountLayout />}>
            <Route path="details" element={<AccountDetailsPage />} />
            <Route path="manage" element={<ManageAccountsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="withdraw" element={<WithdrawPage />} />
            <Route path="deposit" element={<DepositPage />} />
            <Route path="invite" element={<InvitePage />} />
            <Route path="questionnaire" element={<QuestionnairePage />} />
            <Route path="mobile" element={<MobileAppPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/platform" replace />} />
      </Routes>
    </AppProvider>
  )
}
