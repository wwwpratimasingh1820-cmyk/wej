'use client'

import Link from 'next/link'
import { useStore } from '@/store/useStore'
import { Moon, Sun, PlusSquare, User, LogIn } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const theme = useStore(state => state.theme)
  const toggleTheme = useStore(state => state.toggleTheme)
  const user = useStore(state => state.user)
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-bold text-2xl tracking-tighter">W</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-accent transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <>
                <Link
                  href="/create"
                  className={`p-2 rounded-full transition-colors ${pathname === '/create' ? 'bg-accent' : 'hover:bg-accent'}`}
                >
                  <PlusSquare size={20} />
                </Link>
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${pathname === '/profile' ? 'bg-accent' : 'hover:bg-accent'}`}
                >
                  <User size={18} />
                  <span className="text-sm font-medium hidden sm:block">{user.points} pts</span>
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Log In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
