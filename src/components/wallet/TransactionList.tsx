import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  booking_reference: string | null;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const isCredit = transaction.type === "credit" || transaction.type === "refund";
  const amountInNaira = transaction.amount / 100;

  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCredit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {isCredit ? (
            <ArrowDownRight className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground capitalize">
            {transaction.type}
          </p>
          <p className="text-sm text-muted-foreground">
            {transaction.description || transaction.booking_reference || "Wallet transaction"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-semibold ${
            isCredit ? "text-green-600" : "text-red-600"
          }`}
        >
          {isCredit ? "+" : "-"}₦{amountInNaira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(transaction.created_at), "MMM dd, yyyy • HH:mm")}
        </p>
      </div>
    </div>
  );
};

export const TransactionList = ({ transactions, isLoading }: TransactionListProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-24 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your wallet transaction history will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            {transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
