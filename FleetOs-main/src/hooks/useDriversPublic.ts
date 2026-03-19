import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicDriver {
  id: number;
  name: string | null;
  vehicle_model: string | null;
  status: string | null;
}

export function useDriversPublic() {
  return useQuery({
    queryKey: ['drivers_public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers_public' as any)
        .select('*');
      if (error) throw error;
      return (data ?? []) as unknown as PublicDriver[];
    },
  });
}
