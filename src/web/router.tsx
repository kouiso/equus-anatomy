import { createRootRoute, createRoute, createRouter, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { AnatomyScreen } from './routes/anatomy'
import { CatalogScreen } from './routes/catalog'
import { CatalogDetailScreen } from './routes/catalog-detail'
import { SavedScreen } from './routes/saved'
import { CalibrateScreen } from './routes/calibrate'
import { BookIcon, BookmarkIcon, LayersIcon } from './component/icons'

function Shell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg text-fg lg:max-w-6xl">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-end justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <div>
            <h1 className="text-lg font-medium leading-snug tracking-wide">馬体解剖</h1>
            <p className="font-display text-sm italic leading-none tracking-brand text-muted">EQUUS</p>
          </div>
        </header>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const match = useMatchRoute()
  const tabs = [
    { to: '/catalog', label: '図鑑', Icon: BookIcon },
    { to: '/', label: '解剖', Icon: LayersIcon },
    { to: '/saved', label: '保存', Icon: BookmarkIcon },
  ] as const
  return (
    <nav
      aria-label="メイン"
      className="grid grid-cols-3 border-t border-line bg-bg/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-sm"
    >
      {tabs.map(({ to, label, Icon }) => {
        const active = Boolean(match({ to, fuzzy: to !== '/' }))
        return (
          <Link
            key={to}
            to={to}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs tracking-wide ${active ? 'text-fg' : 'text-faint'}`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

const rootRoute = createRootRoute({ component: Shell })
const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: AnatomyScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/catalog', component: CatalogScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/catalog/$id', component: CatalogDetailScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/saved', component: SavedScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/calibrate', component: CalibrateScreen }),
]

export const router = createRouter({ routeTree: rootRoute.addChildren(routes), defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
