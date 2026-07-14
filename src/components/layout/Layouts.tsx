import { Outlet } from 'react-router-dom'
import { Header, Toast } from './Header'
import { IconSidebar } from './IconSidebar'

export function PlatformLayout() {
  return (
    <div className="flex h-full flex-col bg-muted">
      <Header />
      <div className="relative flex min-h-0 flex-1 overflow-x-clip overflow-y-hidden">
        <IconSidebar />
        <main className="min-w-0 flex-1 overflow-hidden pb-[calc(5px+3.25rem+3.5rem)] md:pb-16 lg:pb-0">
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
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <Toast />
    </div>
  )
}