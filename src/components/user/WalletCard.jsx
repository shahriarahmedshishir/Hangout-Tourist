import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function WalletCard({ balance = 0 }) {
  return (
    <Card className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 shadow-card hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Wallet Balance
          </p>
          <h3 className="font-heading text-3xl font-bold text-foreground">
            ${balance.toFixed(2)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Available for bookings
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}
