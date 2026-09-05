import { useEffect, useState } from "react";
import {
  User,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  MapPin,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Driver {
  id: string;
  user_id: string | null;
  application_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  park_id: string | null;
  status: string;
  rating: number | null;
  total_trips: number;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Park {
  id: string;
  name: string;
  city: string;
  status: string;
}

const AdminDrivers = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    park_id: "",
    status: "active",
  });

  const fetchData = async () => {
    setLoading(true);

    const [driversResult, parksResult] = await Promise.all([
      supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("parks")
        .select("id, name, city, status")
        .order("name", { ascending: true }),
    ]);

    if (driversResult.error) {
      console.error("Failed to load drivers:", driversResult.error);

      toast({
        title: "Failed to load drivers",
        description: driversResult.error.message,
        variant: "destructive",
      });
    } else {
      setDrivers((driversResult.data ?? []) as Driver[]);
    }

    if (parksResult.error) {
      console.error("Failed to load parks:", parksResult.error);

      toast({
        title: "Failed to load parks",
        description: parksResult.error.message,
        variant: "destructive",
      });
    } else {
      setParks((parksResult.data ?? []) as Park[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      park_id: "",
      status: "active",
    });

    setSelectedDriver(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setSelectedDriver(driver);

    setFormData({
      full_name: driver.full_name,
      phone: driver.phone,
      email: driver.email ?? "",
      park_id: driver.park_id ?? "",
      status: driver.status,
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast({
        title: "Missing information",
        description: "Full name and phone number are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (selectedDriver) {
        const { error } = await supabase
          .from("drivers")
          .update({
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || null,
            park_id: formData.park_id || null,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedDriver.id);

        if (error) throw error;

        toast({
          title: "Driver updated",
          description: `${formData.full_name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from("drivers")
          .insert({
            user_id: null,
            application_id: null,
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || null,
            park_id: formData.park_id || null,
            status: formData.status,
          });

        if (error) throw error;

        toast({
          title: "Driver added",
          description: `${formData.full_name} has been added to the driver database.`,
        });
      }

      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Failed to save driver:", error);

      toast({
        title: "Could not save driver",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (driver: Driver) => {
    const newStatus = driver.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("drivers")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driver.id);

    if (error) {
      toast({
        title: "Could not update driver status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: newStatus === "active" ? "Driver activated" : "Driver deactivated",
    });

    await fetchData();
  };

  const handleDelete = async (driver: Driver) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${driver.full_name}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", driver.id);

    if (error) {
      toast({
        title: "Could not delete driver",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Driver deleted",
      description: `${driver.full_name} has been removed.`,
    });

    await fetchData();
  };

  const getPark = (parkId: string | null) =>
    parks.find((park) => park.id === parkId);

  const activeDrivers = drivers.filter(
    (driver) => driver.status === "active"
  ).length;

  const inactiveDrivers = drivers.filter(
    (driver) => driver.status !== "active"
  ).length;

  if (authLoading || !isAdmin) return null;

  return (
    <AdminLayout
      title="Drivers"
      subtitle="Manage approved Borix Express drivers"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle className="w-3 h-3 mr-1" />
              {activeDrivers} Active
            </Badge>

            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
              <XCircle className="w-3 h-3 mr-1" />
              {inactiveDrivers} Inactive
            </Badge>
          </div>

          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Driver
          </Button>
        </div>

        {/* Drivers table */}
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No drivers yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Approved driver applications will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Operating Park</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {drivers.map((driver) => {
                  const park = getPark(driver.park_id);

                  return (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                            {driver.profile_photo_url ? (
                              <img
                                src={driver.profile_photo_url}
                                alt={driver.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-accent" />
                            )}
                          </div>

                          <div>
                            <div className="font-medium">
                              {driver.full_name}
                            </div>

                            {!driver.user_id && (
                              <div className="text-xs text-muted-foreground">
                                Login account not linked
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {driver.phone}
                          </div>

                          {driver.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {driver.email}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {park ? (
                          <div>
                            <div className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3 h-3 text-accent" />
                              {park.name}
                            </div>
                            <div className="text-xs text-muted-foreground ml-4">
                              {park.city}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not assigned
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current text-accent" />
                          <span>
                            {Number(driver.rating ?? 5).toFixed(1)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>{driver.total_trips}</TableCell>

                      <TableCell>
                        {driver.status === "active" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                            {driver.status}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(driver)}
                            title="Edit driver"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus(driver)}
                            title={
                              driver.status === "active"
                                ? "Deactivate driver"
                                : "Activate driver"
                            }
                          >
                            <PowerIcon
                              active={driver.status === "active"}
                            />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(driver)}
                            title="Delete driver"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add/Edit Driver Dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDriver ? "Edit Driver" : "Add Driver"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="e.g. Musa Ibrahim"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+234..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  placeholder="driver@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Operating Park</Label>
                <Select
                  value={formData.park_id || undefined}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      park_id: value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select operating park" />
                  </SelectTrigger>

                  <SelectContent>
                    {parks.filter((park) => park.status === "active").length ===
                    0 ? (
                      <SelectItem value="no-parks" disabled>
                        No active parks available
                      </SelectItem>
                    ) : (
                      parks
                        .filter((park) => park.status === "active")
                        .map((park) => (
                          <SelectItem key={park.id} value={park.id}>
                            {park.name} — {park.city}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!selectedDriver && (
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  A manually added driver will not have a login account until
                  one is linked to the driver record.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : selectedDriver ? (
                  "Save Changes"
                ) : (
                  "Add Driver"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const PowerIcon = ({ active }: { active: boolean }) => {
  return active ? (
    <XCircle className="w-4 h-4 text-muted-foreground" />
  ) : (
    <CheckCircle className="w-4 h-4 text-green-600" />
  );
};

export default AdminDrivers;

