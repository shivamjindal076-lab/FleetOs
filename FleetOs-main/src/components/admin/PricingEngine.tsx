import { useState } from 'react';
import { DollarSign, Moon, TrendingUp, MapPin, Clock, Edit2, Save, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PricingRule {
  id: string;
  tripType: string;
  icon: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  minFare: number;
  nightSurcharge: number; // percentage
  surgeMultiplier: number;
  surgeActive: boolean;
}

const initialRules: PricingRule[] = [
  { id: 'city', tripType: 'City Ride', icon: '🚗', baseFare: 50, perKm: 14, perMin: 2, minFare: 100, nightSurcharge: 25, surgeMultiplier: 1.5, surgeActive: false },
  { id: 'airport', tripType: 'Airport Transfer', icon: '✈️', baseFare: 100, perKm: 16, perMin: 2, minFare: 350, nightSurcharge: 30, surgeMultiplier: 1.3, surgeActive: false },
  { id: 'sightseeing', tripType: 'Sightseeing', icon: '🏛️', baseFare: 500, perKm: 12, perMin: 1.5, minFare: 1500, nightSurcharge: 0, surgeMultiplier: 1.0, surgeActive: false },
  { id: 'outstation', tripType: 'Outstation', icon: '🛣️', baseFare: 200, perKm: 11, perMin: 0, minFare: 1500, nightSurcharge: 20, surgeMultiplier: 1.0, surgeActive: false },
];

const nightHours = { from: '11:00 PM', to: '5:00 AM' };

export function PricingEngine() {
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateRule = (id: string, field: keyof PricingRule, value: number | boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setHasChanges(true);
  };

  const toggleSurge = (id: string) => {
    updateRule(id, 'surgeActive', !rules.find(r => r.id === id)?.surgeActive);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-secondary" />
            <span className="text-sm font-semibold text-secondary tracking-wide uppercase">Pricing Engine</span>
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">Fare Configuration</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">Set rates for all trip types. Changes reflect instantly.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-3 pb-8">
        {/* Surge banner */}
        {rules.some(r => r.surgeActive) && (
          <Card className="p-3 mb-4 bg-warning/10 border-warning/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <span className="text-sm font-bold text-warning">Surge pricing active</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {rules.filter(r => r.surgeActive).map(r => r.tripType).join(', ')}
              </span>
            </div>
          </Card>
        )}

        {/* Night surcharge info */}
        <Card className="p-3 mb-4 bg-muted/50">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Night surcharge applies <span className="font-bold">{nightHours.from} – {nightHours.to}</span></span>
          </div>
        </Card>

        {/* Save bar */}
        {hasChanges && (
          <div className="flex gap-2 mb-4">
            <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => setHasChanges(false)}>
              <Save className="h-4 w-4 mr-1" /> Save All Changes
            </Button>
            <Button variant="outline" onClick={() => { setRules(initialRules); setHasChanges(false); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        )}

        {/* Pricing cards */}
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{rule.icon}</span>
                  <h3 className="font-bold">{rule.tripType}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Surge</span>
                    <Switch checked={rule.surgeActive} onCheckedChange={() => toggleSurge(rule.id)} />
                  </div>
                  <Button
                    size="sm"
                    variant={editing === rule.id ? 'default' : 'outline'}
                    className="h-7 text-xs"
                    onClick={() => setEditing(editing === rule.id ? null : rule.id)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {editing === rule.id ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Base Fare', field: 'baseFare' as const, prefix: '₹', value: rule.baseFare },
                  { label: 'Per Km', field: 'perKm' as const, prefix: '₹', value: rule.perKm },
                  { label: 'Per Min', field: 'perMin' as const, prefix: '₹', value: rule.perMin },
                  { label: 'Min Fare', field: 'minFare' as const, prefix: '₹', value: rule.minFare },
                  { label: 'Night +%', field: 'nightSurcharge' as const, prefix: '', value: rule.nightSurcharge },
                  { label: 'Surge ×', field: 'surgeMultiplier' as const, prefix: '', value: rule.surgeMultiplier },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</Label>
                    {editing === rule.id ? (
                      <Input
                        type="number"
                        value={item.value}
                        onChange={e => updateRule(rule.id, item.field, parseFloat(e.target.value) || 0)}
                        className="h-8 mt-1 text-sm font-bold"
                      />
                    ) : (
                      <p className="text-sm font-bold mt-1">
                        {item.prefix}{item.value}{item.field === 'nightSurcharge' ? '%' : item.field === 'surgeMultiplier' ? '×' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {rule.surgeActive && (
                <div className="mt-3 p-2 bg-warning/10 rounded-lg flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs font-semibold text-warning">
                    Effective rate: ₹{(rule.perKm * rule.surgeMultiplier).toFixed(0)}/km (×{rule.surgeMultiplier})
                  </span>
                </div>
              )}

              {/* Fare estimator */}
              <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Fare estimate: 10 km, 20 min ride</p>
                <p className="text-sm font-bold">
                  ₹{Math.max(rule.minFare, rule.baseFare + rule.perKm * 10 * (rule.surgeActive ? rule.surgeMultiplier : 1) + rule.perMin * 20).toFixed(0)}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Outstation special config */}
        <Card className="p-5 mt-4 shadow-card">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" /> Outstation Special Rates
          </h3>
          <div className="space-y-3">
            {[
              { route: 'Jaipur → Delhi', km: 280, rate: 11, total: 3200 },
              { route: 'Jaipur → Udaipur', km: 395, rate: 11.4, total: 4500 },
              { route: 'Jaipur → Ajmer', km: 135, rate: 13.3, total: 1800 },
              { route: 'Jaipur → Jodhpur', km: 335, rate: 11.9, total: 4000 },
            ].map(r => (
              <div key={r.route} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-semibold">{r.route}</p>
                  <p className="text-xs text-muted-foreground">{r.km} km · ₹{r.rate}/km</p>
                </div>
                <p className="font-bold">₹{r.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
