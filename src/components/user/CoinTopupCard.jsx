import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus } from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const PRESET_AMOUNTS = [50, 100, 250, 500];
const MANUAL_PAYMENT_METHODS = [
  { value: "bkash ", label: "bKash " },
  { value: "nagad", label: "Nagad" },
];

export default function CoinTopupCard({ onTopupSuccess }) {
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online"); // "online" or "manual"

  // Online payment state
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loading, setLoading] = useState(false);

  // Manual payment state
  const [manualAmount, setManualAmount] = useState("");
  const [manualPaymentType, setManualPaymentType] = useState("");
  const [manualTransactionId, setManualTransactionId] = useState("");
  const [manualScreenshot, setManualScreenshot] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // File input ref
  const screenshotInputRef = useRef(null);

  const { toast } = useToast();

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        toast({
          title: "Upload Error",
          description: "Failed to read file. Please try again.",
          variant: "destructive",
        });
      };
      reader.onload = (event) => {
        if (event.target?.result) {
          setManualScreenshot(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputClick = () => {
    screenshotInputRef.current?.click();
  };

  const handleTopup = async () => {
    const topupAmount = selectedPreset || parseFloat(amount);

    if (!topupAmount || topupAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/payment/initiate/coin-topup", {
        amount: topupAmount,
      });

      toast({
        title: "Top-up Initiated",
        description: `Redirecting to payment...`,
      });

      // Redirect to payment if there's a payment URL
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
      }

      onTopupSuccess?.();
      setOpen(false);
      setAmount("");
      setSelectedPreset(null);
    } catch (error) {
      toast({
        title: "Top-up Failed",
        description: error.message || "Failed to process top-up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualTopup = async () => {
    const topupAmount = parseFloat(manualAmount);

    if (!topupAmount || topupAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!manualPaymentType) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    if (!manualTransactionId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter your transaction ID for verification.",
        variant: "destructive",
      });
      return;
    }

    if (!manualScreenshot) {
      toast({
        title: "Proof Required",
        description: "Please upload a payment proof screenshot.",
        variant: "destructive",
      });
      return;
    }

    setManualLoading(true);
    try {
      const response = await api.post("/api/payment/submit/manual-coin-topup", {
        amount: topupAmount,
        paymentMethod: manualPaymentType,
        proofUrl: manualScreenshot,
        transactionId: manualTransactionId.trim(),
      });

      toast({
        title: "Top-up Submitted",
        description:
          "Your request has been submitted for admin review. You'll be notified once approved.",
        variant: "default",
      });

      onTopupSuccess?.();
      setOpen(false);
      setManualAmount("");
      setManualPaymentType("");
      setManualTransactionId("");
      setManualScreenshot("");
      // Reset file input
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit top-up request",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/2 to-secondary/2 p-6 hover:border-primary/50 transition-colors cursor-pointer">
        <DialogTrigger asChild>
          <button className="w-full flex items-center justify-center gap-3 hover:opacity-80 transition-opacity">
            <div className="rounded-full bg-primary/10 p-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-muted-foreground">
                Add Funds
              </p>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Top-up Wallet
              </h3>
            </div>
          </button>
        </DialogTrigger>
      </Card>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Top-up Your Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a payment method to add funds to your wallet
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={paymentMethod}
          onValueChange={setPaymentMethod}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online">Online Payment</TabsTrigger>
            <TabsTrigger value="manual">Manual Payment</TabsTrigger>
          </TabsList>

          {/* Online Payment Tab */}
          <TabsContent value="online" className="space-y-6 mt-6">
            {/* Preset Amounts */}
            <div>
              <Label className="text-sm font-medium mb-3 inline-block">
                Quick Select
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    variant={selectedPreset === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedPreset(preset);
                      setAmount("");
                    }}
                    className={
                      selectedPreset === preset
                        ? "bg-gradient-primary text-primary-foreground"
                        : ""
                    }
                  >
                    ৳{preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">
                Custom Amount
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">
                  ৳
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={selectedPreset ? "" : amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                  className="pl-7"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Summary */}
            {(selectedPreset || amount) && (
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-heading text-lg font-bold text-foreground">
                    ৳{(selectedPreset || parseFloat(amount) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleTopup}
              disabled={loading || (!selectedPreset && !amount)}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {loading ? "Processing..." : "Proceed to Payment"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Instant funding via SSL Commerz (auto-approved)
            </p>
          </TabsContent>

          {/* Manual Payment Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            {/* Amount */}
            <div>
              <Label htmlFor="manual-amount" className="text-sm font-medium">
                Amount
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">
                  ৳
                </span>
                <Input
                  id="manual-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="pl-7"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="payment-type" className="text-sm font-medium">
                Payment Method
              </Label>
              <Select
                value={manualPaymentType}
                onValueChange={setManualPaymentType}
              >
                <SelectTrigger id="payment-type" className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div>
              <Label htmlFor="transaction-id" className="text-sm font-medium">
                Transaction ID
              </Label>
              <Input
                id="transaction-id"
                type="text"
                placeholder="Enter your payment transaction ID"
                value={manualTransactionId}
                onChange={(e) => setManualTransactionId(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Payment Proof Screenshot */}
            <div>
              <Label htmlFor="screenshot" className="text-sm font-medium">
                Payment Proof Screenshot *
              </Label>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handleFileInputClick}
                  className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-primary/2"
                >
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {manualScreenshot
                        ? "✓ Screenshot Uploaded"
                        : "Upload Screenshot"}
                    </p>
                  </div>
                </button>
                <input
                  ref={screenshotInputRef}
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                  aria-label="Upload payment proof screenshot"
                />
              </div>
              {manualScreenshot && (
                <div className="mt-3">
                  <p className="text-xs text-green-600 mb-2">
                    ✓ Screenshot attached
                  </p>
                  <img
                    src={manualScreenshot}
                    alt="Payment proof preview"
                    className="w-full h-40 object-cover rounded-lg border border-primary/20"
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            {manualAmount && (
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Amount:
                    </span>
                    <span className="font-heading text-lg font-bold text-foreground">
                      ৳{parseFloat(manualAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="text-foreground">
                      {MANUAL_PAYMENT_METHODS.find(
                        (m) => m.value === manualPaymentType,
                      )?.label || "Select"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-primary/10 mt-2">
                    <p className="text-xs text-warning">
                      ⚠️ Pending admin approval. Coins will be credited once
                      verified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleManualTopup}
              disabled={
                manualLoading ||
                !manualAmount ||
                !manualPaymentType ||
                !manualTransactionId.trim() ||
                !manualScreenshot
              }
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {manualLoading ? "Submitting..." : "Submit Request"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your request will be reviewed by our admin team
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
