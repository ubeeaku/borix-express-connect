import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, Landmark, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/apiBase";

type BankAccount = {
  bank_code: string;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
  updated_at: string;
};

type Bank = { name: string; code: string };

type PayoutRequest = {
  id: string;
  amount: number;
  status: string;
  status_message: string | null;
  reference: string;
  created_at: string;
};

type WalletSummary = {
  available_amount: number;
  pending_amount: number;
  paid_amount: number;
};

type DriverWalletProps = { driverId: string };

const naira = (amount: number) => "₦" + amount.toLocaleString("en-NG");

const statusLabel: Record<string, string> = {
  queued: "Confirming",
  otp: "Awaiting Paystack approval",
  processing: "Processing",
  success: "Sent",
  failed: "Failed",
  reversed: "Returned",
};

async function apiRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("Your session expired. Sign in again.");

  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      Authorization: "Bearer " + session.access_token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not complete the request.");
  return result as T;
}

export default function DriverWallet({ driverId }: DriverWalletProps) {
  const [summary, setSummary] = useState<WalletSummary>({
    available_amount: 0,
    pending_amount: 0,
    paid_amount: 0,
  });
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, requestsResult, bankResult] = await Promise.all([
        supabase.rpc("get_own_driver_wallet_summary"),
        supabase
          .from("driver_payout_requests")
          .select("id, amount, status, status_message, reference, created_at")
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false })
          .limit(10),
        apiRequest<{ account: BankAccount | null }>("/api/driver/payout/bank-account"),
      ]);

      if (summaryResult.error || requestsResult.error) {
        toast({
          title: "Could not load your wallet",
          description: summaryResult.error?.message || requestsResult.error?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSummary(summaryResult.data?.[0] ?? {
        available_amount: 0,
        pending_amount: 0,
        paid_amount: 0,
      });
      setRequests((requestsResult.data ?? []) as PayoutRequest[]);
      setAccount(bankResult.account);
    } catch (error) {
      toast({
        title: "Could not load your wallet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openBankDialog = async () => {
    setBankDialogOpen(true);
    if (banks.length) return;
    try {
      const result = await apiRequest<{ banks: Bank[] }>("/api/driver/payout/bank-list");
      setBanks(result.banks);
    } catch (error) {
      toast({
        title: "Could not load banks",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveBankAccount = async () => {
    setSavingBank(true);
    try {
      const result = await apiRequest<{ account: BankAccount }>(
        "/api/driver/payout/bank-account",
        "POST",
        { bank_code: bankCode, account_number: accountNumber },
      );
      setAccount(result.account);
      setBankDialogOpen(false);
      setAccountNumber("");
      setBankCode("");
      toast({
        title: "Bank account verified",
        description: result.account.account_name + " · " + result.account.bank_name,
      });
    } catch (error) {
      toast({
        title: "Could not save bank account",
        description: error instanceof Error ? error.message : "Please check the details and try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBank(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      const result = await apiRequest<{
        status: string;
        amount: number;
        message?: string;
      }>("/api/driver/payout/withdraw", "POST", {});
      toast({
        title: result.status === "success" ? "Withdrawal sent" : "Withdrawal requested",
        description: result.message || statusLabel[result.status] || "Your bank transfer is being processed.",
      });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not start withdrawal",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const available = Number(summary.available_amount || 0);
  const pending = Number(summary.pending_amount || 0);
  const paid = Number(summary.paid_amount || 0);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Driver Wallet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Borix credits completed trips. Withdraw available earnings to your verified Nigerian bank account.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />
          Refresh wallet
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Available to withdraw</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{loading ? "…" : naira(available)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transfer in progress</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{loading ? "…" : naira(pending)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid to you</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{loading ? "…" : naira(paid)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-5 w-5 text-accent" /> Bank account</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void openBankDialog()}>
            {account ? "Change account" : "Add bank account"}
          </Button>
        </CardHeader>
        <CardContent>
          {account ? (
            <div>
              <p className="font-semibold text-foreground">{account.account_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {account.bank_name} ···· {account.account_number_last4}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add and verify your bank account before your first withdrawal.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-accent/30">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">Withdraw your available earnings</p>
            <p className="mt-1 text-sm text-muted-foreground">Borix covers Paystack transfer charges and applicable bank duty.</p>
          </div>
          <Button type="button" onClick={() => void withdraw()} disabled={withdrawing || loading || !account || available <= 0}>
            {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
            {withdrawing ? "Requesting…" : "Withdraw " + naira(available)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-5 w-5 text-accent" /> Recent withdrawals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : requests.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">Your bank withdrawals will appear here.</p>
          ) : requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{naira(request.amount)}</p>
                <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p>
                {request.status_message && ["failed", "reversed"].includes(request.status) && (
                  <p className="mt-1 text-xs text-muted-foreground">{request.status_message}</p>
                )}
              </div>
              <Badge className={
                request.status === "success" ? "bg-green-100 text-green-700" :
                ["failed", "reversed"].includes(request.status) ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }>
                {statusLabel[request.status] || request.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{account ? "Change payout bank account" : "Add payout bank account"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Paystack will verify the account name. Your full account number is not stored in Borix.</p>
            <div className="space-y-2">
              <Label htmlFor="driver-payout-bank">Bank</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger id="driver-payout-bank"><SelectValue placeholder={banks.length ? "Choose a bank" : "Loading banks…"} /></SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-payout-account-number">10-digit account number</Label>
              <Input
                id="driver-payout-account-number"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => void saveBankAccount()}
              disabled={savingBank || !bankCode || accountNumber.length !== 10}
            >
              {savingBank && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingBank ? "Verifying account…" : "Verify and save bank account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
