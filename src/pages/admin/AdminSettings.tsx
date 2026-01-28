import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Shield, Clock, Mail, Phone, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { isAdmin, isLoading: authLoading, user } = useAdminAuth();
  const [settings, setSettings] = useState({
    companyName: "Borix Express",
    companyEmail: "borixexpressltd@gmail.com",
    companyPhone: "+234 903 657 3414",
    companyAddress: "No.47 cornerstone Kabong, Off Rukuba Road, Jos Nigeria",
    emailNotifications: true,
    smsNotifications: true,
    bookingConfirmation: true,
    paymentAlerts: true,
    dailyReports: false,
    departureTimes: "7:00 AM, 1:00 PM",
    seatsPerCar: 5,
    carsPerTrip: 5,
  });

  const handleSave = () => {
    toast({ title: "Settings saved successfully" });
  };

  if (authLoading || !isAdmin) return null;

  return (
    <AdminLayout title="Settings" subtitle="Configure system preferences">
      <div className="space-y-6 max-w-4xl">
        {/* Company Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>Update your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={settings.companyPhone}
                    onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trip Configuration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Trip Configuration
              </CardTitle>
              <CardDescription>Configure trip schedules and capacity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Departure Times (comma separated)</Label>
                <Input
                  value={settings.departureTimes}
                  onChange={(e) => setSettings({ ...settings, departureTimes: e.target.value })}
                  placeholder="e.g., 7:00 AM, 1:00 PM"
                  className="mt-1"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Seats Per Car</Label>
                  <Input
                    type="number"
                    value={settings.seatsPerCar}
                    onChange={(e) => setSettings({ ...settings, seatsPerCar: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Cars Per Trip</Label>
                  <Input
                    type="number"
                    value={settings.carsPerTrip}
                    onChange={(e) => setSettings({ ...settings, carsPerTrip: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Total capacity per trip: {settings.seatsPerCar * settings.carsPerTrip} seats
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive booking updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive booking updates via SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">Send confirmation to customers</p>
                </div>
                <Switch
                  checked={settings.bookingConfirmation}
                  onCheckedChange={(checked) => setSettings({ ...settings, bookingConfirmation: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Payment Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified on successful payments</p>
                </div>
                <Switch
                  checked={settings.paymentAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, paymentAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive daily summary reports</p>
                </div>
                <Switch
                  checked={settings.dailyReports}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyReports: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account
              </CardTitle>
              <CardDescription>Your admin account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Admin Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1 bg-muted" />
              </div>
              <p className="text-sm text-muted-foreground">
                Contact the system administrator to change account credentials.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
