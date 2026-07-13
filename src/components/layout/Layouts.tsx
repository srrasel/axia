import { Outlet } from 'react-router-dom'
import { AlertBanner, Header, Toast } from './Header'
import { IconSidebar } from './IconSidebar'

export function PlatformLayout() {
  return (
    <div className="flex h-full flex-col bg-muted">
      <Header />
      <AlertBanner />
      <div className="flex min-h-0 flex-1">
        <IconSidebar />
        <main className="min-w-0 flex-1 overflow-hidden pb-[7.5rem] md:pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}

export function AccountLayout() {
  return (
    <div className="flex h-full flex-col bg-muted">
      <Header showClose />
      <AlertBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <Toast />
    </div>
  )
}
