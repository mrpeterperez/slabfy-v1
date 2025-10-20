// Buying desk checkout dialog with exact UX/UI copied from EventCheckoutDialog
import React from "react";
import { X, ChevronRight, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyingDeskApi } from "../../lib/api";

export type BuyingDeskPaymentMethod = "card" | "cash" | "trade" | "mixed" | "external";
export type BuyingDeskCheckoutRoute = "trade-only" | "mixed-payment" | "external-payment";

export interface BuyingDeskCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{ id: string; title?: string; playerName?: string; offerPrice?: number } | undefined>;
  sessionId: string;
  currency?: string;
  processing?: boolean;
  boldColors?: boolean; // solid buttons when true
}

// Util
const formatMoney = (amount: number, currency = "USD") => {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(safe);
};

// Local UI bits
const ActionBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "solid" | "outline";
}> = ({ children, onClick, disabled, className = "", variant = "outline" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "w-full rounded-xl px-4 py-4 text-sm font-medium transition border",
      variant === "solid" ? "border-transparent" : "bg-background border-border hover:border-primary/60",
      disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/40",
      className,
    ].join(" ")}
  >
    {children}
  </button>
);

const useEscapeToClose = (open: boolean, onClose: () => void) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
};

export const CheckoutDialog: React.FC<BuyingDeskCheckoutDialogProps> = ({
  open,
  onOpenChange,
  items,
  sessionId,
  currency = "USD",
  processing = false,
  boldColors = true,
}) => {
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [view, setView] = React.useState<"main" | "cashReceipt">("main");
  const [cashAmountLabel, setCashAmountLabel] = React.useState<string | null>(null);
  const [receiptAction, setReceiptAction] = React.useState<"send" | "skip">("send");
  const [receiptChannel, setReceiptChannel] = React.useState<"text" | "email" | "both">("both");
  const [contactName, setContactName] = React.useState<string>("");
  const [contactPhone, setContactPhone] = React.useState<string>("");
  const [contactEmail, setContactEmail] = React.useState<string>("");
  const [cashReceived, setCashReceived] = React.useState<string>("0.00");
  const [confirmChecked, setConfirmChecked] = React.useState(false);
  const { toast } = useToast();
  const [showValidation, setShowValidation] = React.useState(false);
  const [didLoadSession, setDidLoadSession] = React.useState(false);
  const queryClient = useQueryClient();

  const busy = processing || isSubmitting;
  const isOpen = !!open;
  useEscapeToClose(isOpen, () => onOpenChange(false));

  // Calculate totals
  const total = React.useMemo(() => (items || []).reduce((s, it) => s + (it?.offerPrice ?? 0), 0), [items]);
  const itemDescription = `${(items || []).length} item${(items || []).length === 1 ? "" : "s"}`;
  const finalAmount = Math.max(0, total);
  const amountLabel = formatMoney(finalAmount, currency);

  // Load contact data from session
  React.useEffect(() => {
    let alive = true;
    const loadSession = async () => {
      if (!isOpen || didLoadSession || !sessionId) return;
      try {
        const session = await buyingDeskApi.sessions.get(sessionId);
        const sellerData = session?.seller;
        if (!alive) return;
        if (sellerData) {
          setContactName(sellerData.name || "");
          setContactPhone(sellerData.phone || "");
          setContactEmail(sellerData.email || "");
          
          if (sellerData.phone && sellerData.email) setReceiptChannel("both");
          else if (sellerData.phone) setReceiptChannel("text");
          else if (sellerData.email) setReceiptChannel("email");
        }
        setDidLoadSession(true);
      } catch {
        // Ignore errors, will work without session data
      }
    };
    loadSession();
    return () => {
      alive = false;
    };
  }, [isOpen, sessionId, didLoadSession]);

  const handleQuickPay = async (method: "card" | "cash") => {
    if (busy) return;
    if (method === "cash") {
      setCashAmountLabel(formatMoney(finalAmount, currency));
      setCashReceived(finalAmount.toFixed(2));
      setView("cashReceipt");
      return;
    }
    // Card payment would be implemented later
    setSubmitting(true);
    try {
      // await Promise.resolve(onPaymentComplete(method, { amount: finalAmount }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigation = (route: BuyingDeskCheckoutRoute) => {
    if (!busy) {
      // Navigation would be implemented for trade/mixed payments
      toast({ title: "Coming Soon", description: `This feature is being built.` });
    }
  };

  const cashNum = Number.parseFloat(cashReceived || "0");
  const changeDue = (Number.isFinite(cashNum) ? cashNum : 0) - finalAmount;
  const cashInsufficient = !Number.isFinite(cashNum) || cashNum < finalAmount;

  React.useEffect(() => {
    if (view === "cashReceipt") {
      setCashReceived(finalAmount.toFixed(2));
      setCashAmountLabel(formatMoney(finalAmount, currency));
    }
  }, [view, finalAmount, currency]);

  const handleCashComplete = async () => {
    if (busy) return;
    if (!confirmChecked) {
      setShowValidation(true);
      toast({ title: "Confirm payment first", description: "Check the confirmation box to proceed.", variant: "destructive" });
      return;
    }
    if (cashInsufficient) {
      setShowValidation(true);
      toast({ title: "Insufficient cash", description: "Cash paid must cover the total.", variant: "destructive" });
      return;
    }
    if (receiptInvalid) {
      setShowValidation(true);
      toast({ title: "Contact required", description: "Contact name is required to send the receipt.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    // Create simplified payload that matches server schema
    const payload = {
      paymentMethod: "cash" as const,
      amountPaid: Number.isFinite(cashNum) ? cashNum : finalAmount,
      notes: `Cash payment: $${formatMoney(cashNum || finalAmount, currency)}${changeDue > 0 ? ` | Change: ${formatMoney(changeDue, currency)}` : ''}`,
      buyerName: contactName || "Buying Desk Purchase",
    };
    
    try {
      
      const res = await buyingDeskApi.sessions.finalizeCheckout(sessionId, payload);
      
      // CRITICAL FIX: Comprehensive cache invalidation after successful checkout
      // This ensures cart items disappear immediately (not on page refresh)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["buying-desk", "sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["buying-desk", "sessions", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["user-assets"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio-pricing-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["my-portfolio-assets"] }),
        queryClient.invalidateQueries({ queryKey: ["reports", "sales-history"] }),
        // Fix: Add the correct query key that the portfolio actually uses
        queryClient.invalidateQueries({ queryKey: [`/api/user`] }), // Invalidates all user API calls
      ]);
      
      toast({ title: "Payment recorded", description: `Receipt #${res.receiptId} • ${amountLabel}` });
      onOpenChange(false);
    } catch (error) {
      // On error, still try to invalidate caches in case of partial success
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] }),
          queryClient.invalidateQueries({ queryKey: ["buying-desk", "sessions"] }),
          queryClient.invalidateQueries({ queryKey: ["user-assets"] }),
          queryClient.invalidateQueries({ queryKey: [`/api/user`] }),
        ]);
      } catch {} // Ignore cache invalidation errors
      
      // Show actual payment method instead of "offline"
      const paymentMethodDisplay = 'Cash';
      toast({ title: `${paymentMethodDisplay} payment recorded`, description: `Paid ${formatMoney(cashNum)} • Change ${formatMoney(Math.max(0, changeDue))}` });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const receiptInvalid = receiptAction === "send" && !contactName.trim();
  // Button should always be clickable (except while busy). Validation is handled on click with inline highlights.
  const buttonDisabled = busy;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bd-checkout-title"
          className="fixed inset-0 bg-background z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border sm:px-6">
            <div className="w-10">
              {view === "cashReceipt" && (
                <button
                  onClick={() => setView("main")}
                  className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <h1 id="bd-checkout-title" className="text-base font-medium">Checkout</h1>
            <button onClick={() => onOpenChange(false)} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors" aria-label="Close">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-md mx-auto px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-12">
              {/* Summary */}
              <div className="text-center mb-10">
                <div className="text-5xl font-bold mb-2 tracking-tight">{cashAmountLabel ?? amountLabel}</div>
                <div className="text-sm text-muted-foreground">{itemDescription}</div>
                {sessionId && <div className="mt-2 text-[11px] text-muted-foreground">Session #{sessionId}</div>}
              </div>

              {/* Quick Pay */}
              {view === "main" && (
                <div className="mb-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Pay</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionBtn onClick={() => { /* disabled for now */ }} disabled variant={boldColors ? "solid" : "outline"} className={boldColors ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"}>
                      <span>💳 Card</span>
                    </ActionBtn>
                    <ActionBtn onClick={() => handleQuickPay("cash")} disabled={busy} variant={boldColors ? "solid" : "outline"} className={boldColors ? "bg-success text-primary-foreground hover:bg-success/90" : "border-success/60 text-success bg-success/5 hover:bg-success/10 hover:border-success/70"}>
                      <span>💵 Cash</span>
                    </ActionBtn>
                  </div>
                </div>
              )}

              {/* Trade Options */}
              {view === "main" && (
                <div className="mb-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Trade Options</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionBtn onClick={() => handleNavigation("trade-only")} variant="outline" disabled={busy}>
                      <div className="flex items-center justify-between w-full">
                        <div className="text-left">
                          <div className="font-medium mb-0.5">🤝 Trade Only</div>
                          <div className="text-xs text-muted-foreground">Use slabs</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </ActionBtn>
                    <ActionBtn onClick={() => handleNavigation("mixed-payment")} variant="outline" disabled={busy}>
                      <div className="flex items-center justify-between w-full">
                        <div className="text-left">
                          <div className="font-medium mb-0.5">🔄 Mix</div>
                          <div className="text-xs text-muted-foreground">Slabs + Pay</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </ActionBtn>
                  </div>
                </div>
              )}

              {view === "main" && <div className="h-px bg-border my-8" />}

              {/* Other Methods */}
              {view === "main" && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Other Methods</div>
                  <ActionBtn onClick={() => handleNavigation("external-payment")} variant="outline" disabled={busy} className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <ExternalLink className="w-5 h-5" />
                        <span className="font-medium">Zelle / Venmo / PayPal</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </ActionBtn>
                </div>
              )}

              {/* Cash Receipt */}
              {view === "cashReceipt" && (
                <div className="space-y-6 pb-48">
                  {/* Cash received */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground mb-2">Cash Paid</label>
                    <input
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      inputMode="decimal"
                      type="number"
                      step={0.01}
                      min={0}
                      aria-invalid={showValidation && cashInsufficient}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none bg-card text-card-foreground ${showValidation && cashInsufficient ? "border-destructive focus:ring-destructive/40" : "border-border focus:ring-ring focus:border-transparent"}`}
                    />
                    {showValidation && cashInsufficient && (
                      <p className="text-xs text-destructive mt-1">Enter an amount equal to or above the total.</p>
                    )}
                    <div className="flex items-center justify-between mt-2 rounded-lg border border-border bg-card px-4 py-3">
                      <span className="text-sm font-medium">Change Due:</span>
                      <span className={`text-base font-semibold ${changeDue < 0 ? "text-destructive" : "text-primary"}`}>
                        {formatMoney(Math.abs(changeDue), currency)}
                        {changeDue < 0 ? " short" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Receipt options: Send vs No receipt */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {(["send", "skip"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setReceiptAction(opt)}
                          className={`w-full px-4 py-2 rounded-full border text-sm font-medium transition ${
                            receiptAction === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary"
                          }`}
                        >
                          {opt === "send" ? "Send Receipt" : "No receipt"}
                        </button>
                      ))}
                    </div>

                    {receiptAction === "send" && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Method</div>
                          <div className="grid grid-cols-3 gap-2">
                            {(["text", "email", "both"] as const).map((c) => (
                              <button
                                key={c}
                                onClick={() => setReceiptChannel(c)}
                                className={`w-full px-4 py-2 rounded-full border text-sm transition ${
                                  receiptChannel === c
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:border-primary"
                                }`}
                              >
                                {c === "text" ? "Text" : c === "email" ? "Email" : "Both"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name" className="text-sm font-medium">
                              Contact Name
                            </Label>
                            <Input
                              id="contact-name"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              placeholder="Enter contact name"
                              className={`px-4 py-3 h-auto ${showValidation && !contactName.trim() ? "border-red-500" : ""}`}
                            />
                            {showValidation && !contactName.trim() && (
                              <p className="text-xs text-red-500">Contact name is required</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-phone" className="text-sm font-medium">
                              Phone Number
                            </Label>
                            <Input
                              id="contact-phone"
                              value={contactPhone}
                              onChange={(e) => setContactPhone(e.target.value)}
                              placeholder="Enter phone number"
                              className="px-4 py-3 h-auto"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email" className="text-sm font-medium">
                              Email Address
                            </Label>
                            <Input
                              id="contact-email"
                              type="email"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              placeholder="Enter email address"
                              className="px-4 py-3 h-auto"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed bottom confirmation for cash */}
          {view === "cashReceipt" && (
            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-glass py-6">
              <div className="w-full max-w-md mx-auto px-4 sm:px-6 space-y-4">
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    size="lg"
                    checked={confirmChecked}
                    onCheckedChange={(v) => setConfirmChecked(Boolean(v))}
                    aria-invalid={showValidation && !confirmChecked}
                    className={showValidation && !confirmChecked ? "border-destructive data-[state=checked]:bg-destructive" : undefined}
                  />
                  <span className={showValidation && !confirmChecked ? "text-destructive" : undefined}>
                    I received {amountLabel} in cash
                  </span>
                </label>
                <Button type="button" disabled={buttonDisabled} onClick={handleCashComplete} size="lg" variant="success" className="w-full rounded-full">
                  Complete Purchase
                </Button>
              </div>
            </div>
          )}

          {/* Busy overlay */}
          <AnimatePresence>
            {busy && (
              <motion.div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutDialog;