import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the lowest active route fare so marketing surfaces (hero, features)
 * stay in sync with prices managed from the admin dashboard.
 */
export const useMinRoutePrice = (fallback = 13000) => {
  const [price, setPrice] = useState<number>(fallback);
  const [route, setRoute] = useState<{ origin: string; destination: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("origin, destination, price")
        .order("price", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setPrice(data.price);
      setRoute({ origin: data.origin, destination: data.destination });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { price, route };
};
