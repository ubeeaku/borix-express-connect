import { Wallet, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WalletCardProps {
  balance: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const WalletCard = ({ balance, isLoading, onRefresh }: WalletCardProps) => {
  // Balance is stored in kobo, convert to Naira
  const balanceInNaira = balance / 100;

  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-primary-foreground/70">Wallet Balance</p>
            {isLoading ? (
              <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
            ) : (
              <h2 className="text-3xl font-bold">
                ₦{balanceInNaira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60 mt-4">
          Use your wallet balance for refunds and future bookings
        </p>
      </CardContent>
    </Card>
  );
};
