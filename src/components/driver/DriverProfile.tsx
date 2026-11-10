import { useRef, useState } from "react";
import { Camera, Loader2, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type DriverProfileData = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  profile_photo_url: string | null;
};

type DriverProfileProps = {
  driver: DriverProfileData;
  onProfileChange: (updates: Partial<DriverProfileData>) => void;
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export default function DriverProfile({ driver, onProfileChange }: DriverProfileProps) {
  const [phone, setPhone] = useState(driver.phone);
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const savePhone = async () => {
    const normalizedPhone = phone.trim();
    if (!/^\+?[0-9][0-9 ().-]{5,19}$/.test(normalizedPhone)) {
      toast({
        title: "Enter a valid phone number",
        description: "Use 6 to 20 digits and an optional leading +.",
        variant: "destructive",
      });
      return;
    }

    setSavingPhone(true);
    const { error } = await supabase.rpc("update_own_driver_profile", {
      p_phone: normalizedPhone,
      p_profile_photo_url: null,
    });
    setSavingPhone(false);

    if (error) {
      toast({ title: "Could not update your profile", description: error.message, variant: "destructive" });
      return;
    }

    onProfileChange({ phone: normalizedPhone });
    toast({ title: "Phone number updated" });
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!acceptedImageTypes.includes(file.type)) {
      toast({ title: "Choose a JPG, PNG or WebP image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image is too large", description: "Choose an image under 5 MB.", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    let uploadedPath: string | null = null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) throw new Error("Your driver session has expired. Sign in again.");

      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      uploadedPath = `drivers/${session.user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-profile-photos")
        .upload(uploadedPath, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const photoUrl = supabase.storage.from("driver-profile-photos").getPublicUrl(uploadedPath).data.publicUrl;
      const { error: profileError } = await supabase.rpc("update_own_driver_profile", {
        p_phone: null,
        p_profile_photo_url: photoUrl,
      });
      if (profileError) throw profileError;

      onProfileChange({ profile_photo_url: photoUrl });
      toast({ title: "Profile photo updated", description: "Passengers will see this photo when choosing a departure." });
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from("driver-profile-photos").remove([uploadedPath]);
      }
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({ title: "Could not upload your photo", description: message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const initials = driver.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Driver Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your passenger-facing photo and contact number up to date.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {driver.profile_photo_url ? (
              <img src={driver.profile_photo_url} alt={`${driver.full_name} profile`} className="h-full w-full object-cover" />
            ) : initials ? (
              initials
            ) : (
              <UserRound className="h-10 w-10" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{driver.full_name}</h3>
            <p className="text-sm text-muted-foreground">Your profile photo appears to passengers when they choose a departure.</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void uploadPhoto(event.target.files?.[0])}
              disabled={uploadingPhoto}
            />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {uploadingPhoto ? "Uploading photo…" : "Change profile photo"}
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Contact details</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="driver-profile-name">Full name</Label>
            <Input id="driver-profile-name" className="mt-1" value={driver.full_name} readOnly />
          </div>
          <div>
            <Label htmlFor="driver-profile-email">Email address</Label>
            <Input id="driver-profile-email" className="mt-1" value={driver.email ?? ""} readOnly />
          </div>
          <div>
            <Label htmlFor="driver-profile-phone">Phone number</Label>
            <Input id="driver-profile-phone" className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          </div>
          <Button type="button" onClick={() => void savePhone()} disabled={savingPhone || phone.trim() === driver.phone}>
            {savingPhone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save phone number
          </Button>
        </div>
      </div>
    </section>
  );
}
