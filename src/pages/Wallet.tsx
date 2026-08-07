import { motion } from "framer-motion";
import { AlertCircle, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionList } from "@/components/wallet/TransactionList";
import { useWallet } from "@/hooks/useWallet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const Wallet = () => {
  const { wallet, transactions, isLoading, error, user, refetch } = useWallet();

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              My Wallet
            </h1>
            <p className="text-white/80 max-w-xl mx-auto">
              View your balance and transaction history
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-2xl">
          {!user ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="bg-card">
                <LogIn className="h-4 w-4" />
                <AlertTitle>Sign in required</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    Please sign in to view your wallet balance and transaction history.
                  </p>
                  <Button asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <WalletCard
                balance={wallet?.balance || 0}
                isLoading={isLoading}
                onRefresh={refetch}
              />
              <TransactionList
                transactions={transactions}
                isLoading={isLoading}
              />
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Wallet;
