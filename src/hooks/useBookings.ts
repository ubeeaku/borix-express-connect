import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Booking {
  id: string;
  booking_reference: string;
  route_id: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  travel_date: string;
  departure_time: string;
  number_of_seats: number;
  total_amount: number;
  payment_status: string;
  created_at: string | null;
  route?: {
    origin: string;
    destination: string;
    price: number;
  };
}

export interface BookingsFilter {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  routeId: string;
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingsFilter>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    routeId: "all",
  });

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          route:routes(origin, destination, price)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filter.status && filter.status !== "all") {
        query = query.eq("payment_status", filter.status);
      }

      if (filter.routeId && filter.routeId !== "all") {
        query = query.eq("route_id", filter.routeId);
      }

      if (filter.dateFrom) {
        query = query.gte("travel_date", filter.dateFrom);
      }

      if (filter.dateTo) {
        query = query.lte("travel_date", filter.dateTo);
      }

      if (filter.search) {
        // Sanitize search input: remove all PostgREST special characters and SQL wildcards
        const sanitizedSearch = filter.search
          .replace(/[,().%_\\*]/g, '') // Remove PostgREST operators and SQL wildcards
          .replace(/[^\w\s@\-]/g, '') // Only allow alphanumeric, spaces, @, and hyphens
          .trim()
          .slice(0, 50); // Limit length
        
        if (sanitizedSearch.length >= 2) {
          // Use escaped wildcards for ILIKE pattern matching
          const escapedSearch = sanitizedSearch.replace(/[%_]/g, '\\$&');
          query = query.or(
            `booking_reference.ilike.%${escapedSearch}%,passenger_name.ilike.%${escapedSearch}%,passenger_email.ilike.%${escapedSearch}%`
          );
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: status })
        .eq("id", bookingId);

      if (error) throw error;
      
      // Refresh bookings
      await fetchBookings();
      return { success: true };
    } catch (err) {
      console.error("Error updating booking:", err);
      return { success: false, error: "Failed to update booking" };
    }
  };

  const getStats = useCallback(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.payment_status === "completed").length;
    const pending = bookings.filter((b) => b.payment_status === "pending").length;
    const failed = bookings.filter((b) => b.payment_status === "failed").length;
    const revenue = bookings
      .filter((b) => b.payment_status === "completed")
      .reduce((sum, b) => sum + b.total_amount, 0);

    return { total, completed, pending, failed, revenue };
  }, [bookings]);

  return {
    bookings,
    isLoading,
    error,
    filter,
    setFilter,
    fetchBookings,
    updateBookingStatus,
    getStats,
  };
};
