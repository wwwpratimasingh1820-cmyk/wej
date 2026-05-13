'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('') // For signup
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')
    
    const supabase = createClient()
    
    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (authError) throw authError
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0]
            }
          }
        })
        if (authError) throw authError
        setSuccessMessage('A confirmation email has been sent to your inbox. Please confirm your email before logging in.')
        setIsLogin(true)
        return
      }
      
      router.push('/')
      router.refresh()
    } catch (err: any) {
      if (err.message === 'Email not confirmed') {
        setError('Please check your email and confirm your address before logging in.')
      } else {
        setError(err.message)
      }
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
            {error.includes('confirm your address') && (
              <button 
                onClick={async () => {
                  setResendLoading(true)
                  setError('')
                  setSuccessMessage('')
                  try {
                    const supabase = createClient()
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email,
                    })
                    if (resendError) {
                      setError('Could not resend email. It might be disabled or already confirmed.')
                    } else {
                      setSuccessMessage('Confirmation email resent! Please check your inbox.')
                    }
                  } catch (err) {
                    setError('An unexpected error occurred.')
                  } finally {
                    setResendLoading(false)
                  }
                }}
                disabled={resendLoading}
                className="self-start text-xs font-bold underline hover:no-underline disabled:opacity-50"
                type="button"
              >
                {resendLoading ? 'Resending...' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-6 text-sm text-green-500 bg-green-500/10 rounded-lg">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-accent text-foreground rounded-xl p-3 outline-none focus:ring-2 focus:ring-foreground transition-shadow"
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
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
            onClick={() => setIsLogin(!isLogin)} 
            className="text-foreground font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
