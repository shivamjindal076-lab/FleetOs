import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { NewBookingSheet } from './NewBookingSheet';
import { useDrivers } from '@/hooks/useSupabaseData';

export type ActiveTab = 'dashboard' | 'bookings' | 'drivers' | 'collections' | 'settings';

interface AdminShellProps {
  children: React.ReactNode;
  activeTab?: ActiveTab;
}

export function AdminShell({ children, activeTab = 'dashboard' }: AdminShellProps) {
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [currentTab, setCurrentTab] = useState<ActiveTab>(activeTab);
  const { data: drivers = [] } = useDrivers();

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const content = isValidElement(children)
    ? cloneElement(children, { activeSection: currentTab } as { activeSection: ActiveTab })
    : children;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={currentTab} onNewBooking={() => setShowNewBooking(true)} onTabChange={setCurrentTab} />
      <TopHeader activeTab={currentTab} onNewBooking={() => setShowNewBooking(true)} onTabChange={setCurrentTab} />

      <main className="ml-64 pt-20 min-h-screen">
        {content}
      </main>

      <NewBookingSheet
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        drivers={drivers}
      />
    </div>
  );
}
