import { useState, useEffect } from 'react';
import { CustomerHome } from '@/components/customer/CustomerHome';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { DriverApp } from '@/components/driver/DriverApp';
import { DriverLoginPage } from '@/components/auth/DriverLoginPage';
import { PricingEngine } from '@/components/admin/PricingEngine';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Car, Settings, DollarSign, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppView = 'customer' | 'admin' | 'driver' | 'pricing';

const Index = () => {
  const [view, setView] = useState<AppView>(() => {
    const saved = localStorage.getItem('fleetos_view');
    if (saved === 'admin' || saved === 'driver' || saved === 'pricing') return saved;
    return 'customer';
  });

  const handleSetView = (next: AppView) => {
    localStorage.setItem('fleetos_view', next);
    setView(next);
  };
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isDriver, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!user || roleLoading) return;
    if (isAdmin) setView('admin');
    else if (isDriver) setView('driver');
  }, [user, isAdmin, isDriver, roleLoading]);

  const protectedViews: AppView[] = ['admin', 'pricing'];
  const adminViews: AppView[] = ['admin', 'pricing'];
  const needsAuth = protectedViews.includes(view);
  const needsAdmin = adminViews.includes(view);
  const needsDriver = view === 'driver';

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If trying to access a protected view without auth, show login
  if (needsAuth && !user) {
    return (
      <div className="relative min-h-screen">
        <LoginPage onDriverSelect={() => handleSetView('driver')} />
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSetView('customer')}
            className="rounded-full text-xs"
          >
            ← Back to Customer View
          </Button>
        </div>
      </div>
    );
  }

  // If authenticated but not admin, deny access to admin views
  if (needsAdmin && user && !isAdmin) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You don't have permission to access this section. Contact your fleet manager to request admin access.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => handleSetView('customer')} className="rounded-full text-xs">
              ← Back to Customer View
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut()} className="rounded-full text-xs">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {view === 'customer' && <CustomerHome />}
      {view === 'admin' && <AdminDashboard />}
      {view === 'driver' && <DriverLoginPage />}
      {view === 'pricing' && <PricingEngine />}

      {/* View switcher (prototype nav) */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-1 bg-primary/95 backdrop-blur-sm rounded-full px-1.5 py-1.5 shadow-elevated">
          {([
            { id: 'customer' as AppView, label: 'Customer', icon: Car, show: true },
            { id: 'driver' as AppView, label: 'Driver', icon: Car, show: isDriver },
            { id: 'admin' as AppView, label: 'Admin', icon: Settings, show: isAdmin },
            { id: 'pricing' as AppView, label: 'Pricing', icon: DollarSign, show: isAdmin },
          ])
            .filter(t => t.show)
            .map(t => (
            <button
              key={t.id}
              onClick={() => handleSetView(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition ${
                view === t.id ? 'bg-secondary text-secondary-foreground' : 'text-primary-foreground/60 hover:text-primary-foreground'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
          {!user && (
            <button
            data-testid="open-login"
              onClick={() => setView('admin')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-primary-foreground/60 hover:text-primary-foreground transition"
            >
              <Settings className="h-3.5 w-3.5" />
              Login
            </button>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-primary-foreground/60 hover:text-primary-foreground transition"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
