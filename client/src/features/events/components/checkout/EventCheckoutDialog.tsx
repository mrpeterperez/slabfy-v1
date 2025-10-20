// QuickPay style checkout cloned for events — fixed header + back arrow + cash received + receipt flow
import React from "react";
import { X, ChevronRight, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BuyerSelector, type BuyerSelectorValue } from "./buyer-selector";
import { useContacts } from "@/features/contacts/hooks/use-contacts";

export type EventPaymentMethod = "card" | "cash" | "trade" | "mixed" | "external";
export type EventCheckoutRoute = "trade-only" | "mixed-payment" | "external-payment";

export interface EventCheckoutDialogProps {
  amount: number; // original total sale amount
  discountedAmount?: number; // final discounted total, preferred to avoid flicker
  itemDescription: string; // e.g., "3 items"
  onClose: () => void;
  onPaymentComplete: (method: EventPaymentMethod, details?: any) => void | Promise<void>;
  onNavigate: (route: EventCheckoutRoute) => void;
  orderId?: string;
  currency?: string;
  isOpen?: boolean;
  processing?: boolean;
  boldColors?: boolean; // solid buttons when true
  customerName?: string; // Pre-fill customer name from order
  customerEmail?: string; // Pre-fill customer email from order
  customerPhone?: string; // Pre-fill customer phone from order
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

export const EventCheckoutDialog: React.FC<EventCheckoutDialogProps> = ({
  orderId,
  amount,
  discountedAmount,
  itemDescription,
  onClose,
  onPaymentComplete,
  onNavigate,
  currency = "USD",
  isOpen = true,
  processing = false,
  boldColors = true,
  customerName,
  customerEmail,
  customerPhone,
}) => {
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [view, setView] = React.useState<"main" | "cashReceipt">("main");
  const [cashAmountLabel, setCashAmountLabel] = React.useState<string | null>(null);
  const [receiptAction, setReceiptAction] = React.useState<"send" | "skip">("send");
  const [receiptChannel, setReceiptChannel] = React.useState<"text" | "email" | "both">("both");
  const { data: contacts = [] } = useContacts(false);

  // Match customer email to existing contact to get REAL name
  const [buyer, setBuyer] = React.useState<BuyerSelectorValue | null>(() => {
    if (customerEmail) {
      // Try to find existing contact by email - use NEWEST contact (most recent = most accurate)
      const matchingContacts = contacts.filter(
        (c: any) => c.email?.toLowerCase() === customerEmail.toLowerCase()
      );
      
      if (matchingContacts.length > 0) {
        // Sort by created_at DESC and take newest
        const matchedContact = matchingContacts.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )[0];
        
        // Use REAL contact name, not what customer typed
        return {
          id: matchedContact.id,
          name: matchedContact.name,
          companyName: matchedContact.companyName || null,
          email: matchedContact.email,
          phone: matchedContact.phone || customerPhone || null,
        };
      }
      
      // No match - use what customer provided (will create new contact)
      if (customerName) {
        return {
          id: null,
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
        };
      }
    }
    return null;
  });
  const [cashReceived, setCashReceived] = React.useState<string>(() => amount.toFixed(2));
  const [confirmChecked, setConfirmChecked] = React.useState(false);
  const [showValidation, setShowValidation] = React.useState(false);
  const { toast } = useToast();

  const busy = processing || isSubmitting;
  useEscapeToClose(isOpen, onClose);

  const finalAmount = React.useMemo(() => {
    if (typeof discountedAmount === "number" && Number.isFinite(discountedAmount)) return Math.max(0, discountedAmount);
    return Math.max(0, amount);
  }, [amount, discountedAmount]);
  const amountLabel = formatMoney(finalAmount, currency);

  const handleQuickPay = async (method: "card" | "cash") => {
    if (busy) return;
    if (method === "cash") {
      setCashAmountLabel(formatMoney(finalAmount, currency));
      setCashReceived(finalAmount.toFixed(2));
      setView("cashReceipt");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(onPaymentComplete(method, { 
        amount: finalAmount, 
        orderId,
        buyer, // Pass the real buyer info (matched contact or new)
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigation = (route: EventCheckoutRoute) => {
    if (!busy) onNavigate(route);
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
      toast({ title: "Confirm receipt first", description: "Check the confirmation box to proceed.", variant: "destructive" });
      return;
    }
    if (cashInsufficient) {
      setShowValidation(true);
      toast({ title: "Insufficient cash", description: "Cash received must cover the total.", variant: "destructive" });
      return;
    }
    if (receiptInvalid) {
      setShowValidation(true);
      toast({ title: "Buyer required", description: "Select a buyer to send the receipt.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const sending = receiptAction === "send";
      await Promise.resolve(
        onPaymentComplete("cash", {
          amount: finalAmount,
          orderId,
          cash: {
            received: Number.isFinite(cashNum) ? cashNum : 0,
            change: Number(changeDue.toFixed(2)),
          },
          buyer: buyer || null,
          receipt: sending ? { channel: receiptChannel } : { channel: "none" },
        }),
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const receiptInvalid = receiptAction === "send" && !buyer;
  // Button should always be clickable (except while busy). Validation is handled on click with inline highlights.
  const buttonDisabled = busy;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qp-title"
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
            <h1 id="qp-title" className="text-base font-medium">Checkout</h1>
            <button onClick={onClose} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors" aria-label="Close">
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
                {orderId && <div className="mt-2 text-[11px] text-muted-foreground">Order #{orderId}</div>}
              </div>

              {/* Quick Pay */}
              {view === "main" && (
                <div className="mb-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Pay</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionBtn onClick={() => { /* disabled for now */ }} disabled variant={boldColors ? "solid" : "outline"} className={boldColors ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"}>
                      <span>💳 Card (Coming Soon)</span>
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
                    <label className="block text-sm font-medium text-foreground mb-2">Cash Received</label>
                    <input
                      value={cashReceived}
                      readOnly
                      aria-readonly
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
                        <BuyerSelector 
                          label="Buyer" 
                          value={buyer} 
                          onChange={setBuyer} 
                          required 
                          showValidation={showValidation}
                          hideSearch={!!customerEmail} // Hide search when customer info provided from order
                        />
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
                    Confirm I received cash and finalize {amountLabel}
                  </span>
                </label>
                <Button type="button" disabled={buttonDisabled} onClick={handleCashComplete} size="lg" variant="success" className="w-full rounded-full">
                  Confirm Sale
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

export default EventCheckoutDialog;
