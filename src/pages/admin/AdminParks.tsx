
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Park {
  id: string;
  name: string;
  city: string;
  address: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const AdminParks = () => {
  const { toast } = useToast();

  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPark, setEditingPark] = useState<Park | null>(null);

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    contact_phone: "",
  });

  const fetchParks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("parks")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading parks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setParks((data || []) as Park[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchParks();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      city: "",
      address: "",
      contact_phone: "",
    });
    setEditingPark(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (park: Park) => {
    setEditingPark(park);

    setForm({
      name: park.name,
      city: park.city,
      address: park.address || "",
      contact_phone: park.contact_phone || "",
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      toast({
        title: "Missing information",
        description: "Park name and city are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingPark) {
      const { error } = await supabase
        .from("parks")
        .update({
          name: form.name.trim(),
          city: form.city.trim(),
          address: form.address.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPark.id);

      if (error) {
        toast({
          title: "Could not update park",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Park updated",
        description: `${form.name} has been updated successfully.`,
      });
    } else {
      const { error } = await supabase.from("parks").insert({
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        status: "active",
      });

      if (error) {
        toast({
          title: "Could not add park",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Park added",
        description: `${form.name} has been added successfully.`,
      });
    }

    setDialogOpen(false);
    resetForm();
    fetchParks();
  };

  const toggleParkStatus = async (park: Park) => {
    const newStatus = park.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("parks")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", park.id);

    if (error) {
      toast({
        title: "Could not update park status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: newStatus === "active" ? "Park activated" : "Park deactivated",
      description: `${park.name} is now ${newStatus}.`,
    });

    fetchParks();
  };

  const deletePark = async (park: Park) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${park.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("parks")
      .delete()
      .eq("id", park.id);

    if (error) {
      toast({
        title: "Could not delete park",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Park deleted",
      description: `${park.name} has been deleted.`,
    });

    fetchParks();
  };

  return (
    <AdminLayout
      title="Parks"
      subtitle="Manage Borix Express operating parks"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Operating Parks
            </h2>
            <p className="text-muted-foreground">
              Add and manage the parks used by Borix Express drivers.
            </p>
          </div>

          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Park
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading parks...
            </CardContent>
          </Card>
        ) : parks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No parks yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first Borix Express operating park.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Park
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {parks.map((park) => (
              <Card key={park.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {park.name}
                          </h3>

                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              park.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {park.status}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground mt-1">
                          {park.city}
                        </p>

                        {park.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {park.address}
                          </p>
                        )}

                        {park.contact_phone && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {park.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(park)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleParkStatus(park)}
                      >
                        <Power className="w-4 h-4 mr-1" />
                        {park.status === "active" ? "Disable" : "Activate"}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePark(park)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPark ? "Edit Park" : "Add Park"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="park-name">Park Name *</Label>
                <Input
                  id="park-name"
                  placeholder="e.g. Jos Main Park"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="park-city">City *</Label>
                <Input
                  id="park-city"
                  placeholder="e.g. Jos"
                  value={form.city}
                  onChange={(e) =>
                    setForm({ ...form, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="park-address">Address</Label>
                <Input
                  id="park-address"
                  placeholder="Park address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="park-phone">Contact Phone</Label>
                <Input
                  id="park-phone"
                  placeholder="Park contact number"
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contact_phone: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>

              <Button onClick={handleSave}>
                {editingPark ? "Save Changes" : "Add Park"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminParks;
