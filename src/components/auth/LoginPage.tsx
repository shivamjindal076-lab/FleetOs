import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, UserPlus, Loader2, Car, Settings } from 'lucide-react';

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
      <Card className="w-full max-w-sm p-6 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Staff Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to access admin, driver, and pricing panels
          </p>
        </div>

        {/* Role selector tiles */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setRole('driver'); onDriverSelect?.(); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              role === 'driver'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Car className="h-6 w-6" />
            <span className="text-sm font-semibold">Driver</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              role === 'admin'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Settings className="h-6 w-6" />
            <span className="text-sm font-semibold">Admin</span>
          </button>
        </div>

        {role === 'admin' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isSignUp ? (
              <UserPlus className="h-4 w-4 mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>
        )}
      </Card>
    </div>
  );
}
