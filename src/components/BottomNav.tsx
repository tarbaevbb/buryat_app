import { NavLink } from 'react-router-dom'
import { Home, Trophy, User, RefreshCw } from 'lucide-react'

const items = [
  { to: '/', label: 'Учиться', icon: Home },
  { to: '/review', label: 'Повтор', icon: RefreshCw },
  { to: '/leaderboard', label: 'Рейтинг', icon: Trophy },
  { to: '/profile', label: 'Профиль', icon: User },
]

export function BottomNav() {
  return (
    <nav className="pb-safe sticky bottom-0 z-20 border-t-2 border-tg-secondary-bg bg-tg-bg">
      <ul className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `no-select flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  isActive ? 'text-brand' : 'text-tg-hint'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
