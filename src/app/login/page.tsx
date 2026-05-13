'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn, AlertTriangle } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formattedUsername = username.trim().toLowerCase()
    if (!formattedUsername) {
      setError('Username is required')
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    
    const supabase = createClient()
    const dummyEmail = `${formattedUsername}@wej.internal`
    
    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password,
        })
        if (authError) {
          if (authError.message === 'Invalid login credentials') {
            throw new Error('Invalid username or password')
          }
          throw authError
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: dummyEmail,
          password,
          options: {
            data: {
              username: formattedUsername
            }
          }
        })
        if (authError) {
          if (authError.message === 'User already registered') {
            throw new Error('Username already taken')
          }
          throw authError
        }
      }
      
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-background border rounded-3xl p-8 shadow-xl">
        <div className="flex justify-center mb-6 text-foreground">
          <LogIn size={40} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-8">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        
        {error && (
          <div className="p-4 mb-6 text-sm text-red-500 bg-red-500/10 rounded-lg flex flex-col gap-2">
            <span>{error}</span>
          </div>
        )}

        {!isLogin && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium leading-relaxed">
              Your username and password cannot be recovered. If you lose them, your points and content will be permanently lost. Store them safely.
            </p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-accent text-foreground rounded-xl p-3 outline-none focus:ring-2 focus:ring-foreground transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-accent text-foreground rounded-xl p-3 outline-none focus:ring-2 focus:ring-foreground transition-shadow"
              required
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-accent text-foreground rounded-xl p-3 outline-none focus:ring-2 focus:ring-foreground transition-shadow"
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-foreground text-background font-bold py-3 rounded-xl mt-6 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }} 
            className="text-foreground font-semibold hover:underline"
            type="button"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
