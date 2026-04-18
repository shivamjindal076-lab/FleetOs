import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, UserPlus, Loader2, Car, Settings, Zap } from 'lucide-react';

export function LoginPage({ onDriverSelect }: { onDriverSelect?: () => void }) {
  const { signIn, signUp } = useAuth();
  const [role, setRole] = useState<'driver' | 'admin'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setError(error.message);
    } else if (isSignUp) {
      setMessage('Check your email for a confirmation link.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-[2rem] shadow-elevated p-10">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 kinetic-gradient rounded-2xl flex items-center justify-center mb-4 shadow-elevated">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-black tracking-tighter text-foreground">FleetOs</h1>
          <p className="text-sm text-muted-foreground mt-1 font-label">Staff access portal</p>
        </div>

        {/* Role selector tiles */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setRole('driver'); onDriverSelect?.(); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
              role === 'driver'
                ? 'border-2 border-accent bg-accent/10'
                : 'border border-border hover:border-accent/40 bg-card'
            }`}
          >
            <Car className="h-6 w-6 text-foreground" />
            <span className="text-sm font-semibold text-foreground">Driver</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
              role === 'admin'
                ? 'border-2 border-accent bg-accent/10'
                : 'border border-border hover:border-accent/40 bg-card'
            }`}
          >
            <Settings className="h-6 w-6 text-foreground" />
            <span className="text-sm font-semibold text-foreground">Admin</span>
          </button>
        </div>

        {role === 'admin' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-label text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-muted border-none rounded-xl focus:ring-2 focus:ring-ring/30 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-label text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="bg-muted border-none rounded-xl focus:ring-2 focus:ring-ring/30 mt-1"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full kinetic-gradient text-white font-bold font-display rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
