import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Route {
  id: string;
  origin: string;
  destination: string;
  price: number;
  created_at: string | null;
}

const AdminRoutes = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({ origin: "", destination: "", price: "" });

  const fetchRoutes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("routes").select("*").order("created_at", { ascending: false });
    if (!error && data) setRoutes(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleSubmit = async () => {
    if (!formData.origin || !formData.destination || !formData.price) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (selectedRoute) {
      const { error } = await supabase
        .from("routes")
        .update({
          origin: formData.origin,
          destination: formData.destination,
          price: parseInt(formData.price),
        })
        .eq("id", selectedRoute.id);

      if (error) {
        toast({ title: "Failed to update route", variant: "destructive" });
      } else {
        toast({ title: "Route updated successfully" });
        fetchRoutes();
      }
    } else {
      const { error } = await supabase.from("routes").insert({
        origin: formData.origin,
        destination: formData.destination,
        price: parseInt(formData.price),
      });

      if (error) {
        toast({ title: "Failed to create route", variant: "destructive" });
      } else {
        toast({ title: "Route created successfully" });
        fetchRoutes();
      }
    }

    setDialogOpen(false);
    setSelectedRoute(null);
    setFormData({ origin: "", destination: "", price: "" });
  };

  const handleEdit = (route: Route) => {
    setSelectedRoute(route);
    setFormData({
      origin: route.origin,
      destination: route.destination,
      price: route.price.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;

    const { error } = await supabase.from("routes").delete().eq("id", selectedRoute.id);

    if (error) {
      toast({ title: "Failed to delete route", variant: "destructive" });
    } else {
      toast({ title: "Route deleted successfully" });
      fetchRoutes();
    }

    setDeleteDialogOpen(false);
    setSelectedRoute(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="Routes" subtitle="Manage transport routes">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground">Total: {routes.length} routes</p>
          </div>
          <Button
            onClick={() => {
              setSelectedRoute(null);
              setFormData({ origin: "", destination: "", price: "" });
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Route
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl shadow-sm overflow-hidden"
        >
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.origin}</TableCell>
                    <TableCell>{route.destination}</TableCell>
                    <TableCell>₦{route.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(route)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRoute(route);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Origin</Label>
              <Input
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="e.g., Jos"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Abuja"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Price (₦)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., 15000"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedRoute ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the route "{selectedRoute?.origin} → {selectedRoute?.destination}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminRoutes;
