# 🛒 POS & Checkout System - Complete Documentation

*Square/Toast-style checkout for storefront sales*

**Status:** Planning → Implementation  
**Feature Owner:** Sales Channels + Events  
**Integration:** Storefront, EventCheckoutDialog  
**Last Updated:** October 5, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tablet Spin UX](#tablet-spin-ux)
3. [Contact Creation Flow](#contact-creation-flow)
4. [Payment Methods](#payment-methods)
5. [Receipt Generation](#receipt-generation)
6. [Shopping Cart System](#shopping-cart-system)
7. [Component Architecture](#component-architecture)
8. [Integration with EventCheckoutDialog](#integration-with-eventcheckoutdialog)

---

## 🎯 Overview

### What Is the POS System?

The POS (Point of Sale) system provides a **familiar checkout experience** modeled after Square and Toast. It allows:

- **Customers** to browse inventory and add items to cart
- **Dealers** to process sales with multiple payment methods
- **Automatic contact creation** with event tagging
- **Receipt delivery** via email and SMS
- **Tablet-friendly UX** with spin interaction

### Design Philosophy

**Familiar = Fast**
- Mirrors Square/Toast flows users already know
- Minimal clicks to complete purchase
- Clear visual feedback at each step
- Mobile-optimized for tablet kiosks

---

## 🔄 Tablet Spin UX

### The Flow

**Visual Concept:**
```
Customer View (0°)          Dealer View (180°)
┌─────────────┐            ┌─────────────┐
│  Shopping   │   SPIN →   │   Payment   │
│    Cart     │            │  Confirm    │
│             │            │             │
│  Total:$145 │            │  Approve?   │
│             │            │             │
│  [Checkout] │            │  [Confirm]  │
└─────────────┘            └─────────────┘
```

**Step-by-Step:**
1. **Customer adds items to cart** (facing them)
2. **Customer clicks "Checkout"**
3. **Screen prompts:** "Please spin tablet to dealer"
4. **Dealer sees:**
   - Cart summary
   - Customer contact form (if new)
   - Payment method selector
5. **Dealer confirms payment received**
6. **Screen prompts:** "Spin tablet back to customer"
7. **Customer sees:**
   - Receipt with QR code
   - Email/SMS confirmation sent
   - "Thank you" message

### UI States

```typescript
type CheckoutView = 'customer_cart' | 'spin_to_dealer' | 'dealer_confirm' | 'spin_to_customer' | 'receipt';

interface CheckoutState {
  view: CheckoutView;
  cart: CartItem[];
  contact: Contact | null;
  paymentMethod: PaymentMethod | null;
}
```

**Animation:**
```css
.tablet-spin-transition {
  animation: rotate180 0.8s ease-in-out;
}

@keyframes rotate180 {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(180deg); }
}
```

---

## 📇 Contact Creation Flow

### Required Fields

**Minimum (one of):**
- Email **OR** Phone (at least one required)

**Always Collected:**
- Name (first + last or full name)

**Optional:**
- Mailing Address (street, city, state, zip)
- Company name
- Notes

### Auto-Tagging System

**Contact Source Tags:**
```typescript
type ContactSource = 
  | 'manual'              // Added via Contacts page
  | 'storefront_customer' // Purchased from storefront
  | 'event_customer'      // Purchased at event (via storefront or event checkout)
  | 'buying_desk';        // Seller via buying desk

interface ContactWithMetadata {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: ContactSource;
  source_event_id?: string; // Event where contact was created
  created_at: Date;
}
```

**Tagging Rules:**
```typescript
// When creating contact from storefront checkout
function createStorefrontContact(data, eventId) {
  return {
    ...data,
    source: 'event_customer', // Since they're at an event
    source_event_id: eventId,
    tags: ['storefront_purchase', eventId]
  };
}

// When creating contact from buying desk
function createBuyingDeskContact(data, eventId) {
  return {
    ...data,
    source: 'buying_desk',
    source_event_id: eventId,
    tags: ['card_seller', eventId]
  };
}
```

### Smart Contact Matching

**Prevent duplicates:**
```typescript
async function findOrCreateContact(data: ContactFormData, eventId: string) {
  // Try to match by email first
  if (data.email) {
    const existing = await findContactByEmail(data.email);
    if (existing) {
      // Update source_event_id if different
      if (existing.source_event_id !== eventId) {
        await addEventAssociation(existing.id, eventId);
      }
      return existing;
    }
  }
  
  // Try to match by phone
  if (data.phone) {
    const existing = await findContactByPhone(data.phone);
    if (existing) return existing;
  }
  
  // Create new contact
  return await createContact({
    ...data,
    source: 'event_customer',
    source_event_id: eventId
  });
}
```

### Contact Form UI

**Component Structure:**
```tsx
<ContactForm>
  <FormSection label="Contact Information">
    <Input 
      name="name" 
      placeholder="Full Name" 
      required 
    />
    <Input 
      name="email" 
      type="email" 
      placeholder="Email Address" 
    />
    <Input 
      name="phone" 
      type="tel" 
      placeholder="Phone Number" 
    />
    <Checkbox 
      label="Add shipping address?" 
      onCheck={setShowAddress} 
    />
  </FormSection>
  
  {showAddress && (
    <FormSection label="Mailing Address (Optional)">
      <Input name="street" placeholder="Street Address" />
      <div className="grid grid-cols-2 gap-4">
        <Input name="city" placeholder="City" />
        <Input name="state" placeholder="State" />
      </div>
      <Input name="zip" placeholder="Zip Code" />
    </FormSection>
  )}
</ContactForm>
```

---

## 💳 Payment Methods

### Supported Methods

**Current (MVP):**
- Cash
- Credit Card (manual entry, Square integration future)
- Zelle
- Venmo
- Check
- Other (custom)

**Future:**
- Square Terminal integration (tap to pay)
- Stripe integration
- Apple Pay / Google Pay
- Crypto (maybe?)

### Payment Selector UI

```tsx
<PaymentSelector>
  <PaymentOption 
    icon={<DollarSign />}
    label="Cash"
    onClick={() => selectPayment('cash')}
  />
  <PaymentOption 
    icon={<CreditCard />}
    label="Credit Card"
    onClick={() => selectPayment('credit')}
  />
  <PaymentOption 
    icon={<Smartphone />}
    label="Zelle"
    onClick={() => selectPayment('zelle')}
  />
  <PaymentOption 
    icon={<Smartphone />}
    label="Venmo"
    onClick={() => selectPayment('venmo')}
  />
  <PaymentOption 
    icon={<FileText />}
    label="Check"
    onClick={() => selectPayment('check')}
  />
</PaymentSelector>
```

### Payment-Specific Flows

**Cash:**
```tsx
<CashPayment total={145.00}>
  <Input label="Amount Received" type="number" />
  <ChangeCalculator 
    total={145.00} 
    received={150.00} 
    change={5.00} 
  />
</CashPayment>
```

**Credit Card (Manual):**
```tsx
<CreditCardPayment>
  <Input label="Last 4 Digits" maxLength={4} />
  <Select label="Card Type">
    <option>Visa</option>
    <option>Mastercard</option>
    <option>Amex</option>
    <option>Discover</option>
  </Select>
  <Input label="Transaction ID" />
</CreditCardPayment>
```

**Zelle/Venmo:**
```tsx
<DigitalPayment method="zelle">
  <QRCode value={dealerZelleHandle} />
  <Input label="Transaction ID (optional)" />
  <Checkbox label="Payment received" required />
</DigitalPayment>
```

**Check:**
```tsx
<CheckPayment>
  <Input label="Check Number" />
  <Input label="Bank Name" />
  <Checkbox label="Check received" required />
</CheckPayment>
```

---

## 🧾 Receipt Generation

### Receipt Components

**Receipt includes:**
- Dealer logo + name
- Event name + date
- Purchase date/time
- Itemized list of cards
- Subtotal
- Tax (if applicable)
- Total
- Payment method
- Customer name
- QR code (link to receipt online)

**Receipt Delivery:**
- **Email:** HTML formatted, PDF attachment
- **SMS:** Text with link to view receipt online
- **Print:** Future (thermal printer integration)

### Receipt Template

```tsx
<Receipt>
  <Header>
    <Logo src={storefrontSettings.logo} />
    <StoreName>{storefrontSettings.name}</StoreName>
    <EventInfo>
      <EventName>{event.name}</EventName>
      <EventDate>{event.dateStart} - {event.dateEnd}</EventDate>
      <TableNumber>Table #{event.tableNumber}</TableNumber>
    </EventInfo>
  </Header>
  
  <CustomerInfo>
    <Label>Sold To:</Label>
    <Name>{contact.name}</Name>
    <Email>{contact.email}</Email>
    <Phone>{contact.phone}</Phone>
  </CustomerInfo>
  
  <LineItems>
    {cart.items.map(item => (
      <LineItem key={item.id}>
        <ItemName>{item.title}</ItemName>
        <ItemPrice>${item.price}</ItemPrice>
      </LineItem>
    ))}
  </LineItems>
  
  <Totals>
    <Subtotal>Subtotal: ${subtotal}</Subtotal>
    {tax > 0 && <Tax>Tax: ${tax}</Tax>}
    <Total>Total: ${total}</Total>
  </Totals>
  
  <PaymentInfo>
    <PaymentMethod>Paid via {paymentMethod}</PaymentMethod>
    <TransactionDate>{new Date().toLocaleString()}</TransactionDate>
  </PaymentInfo>
  
  <Footer>
    <QRCode value={receiptUrl} />
    <ThankYou>Thank you for your purchase!</ThankYou>
    <PoweredBy>Powered by Slabfy</PoweredBy>
  </Footer>
</Receipt>
```

### Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Receipt from {{storeName}}</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <img src="{{logoUrl}}" alt="{{storeName}}" />
    <h1>Thank you for your purchase!</h1>
    
    <p>Hi {{customerName}},</p>
    <p>Here's your receipt from {{storeName}} at {{eventName}}.</p>
    
    <table>
      <!-- Line items -->
    </table>
    
    <p><strong>Total: ${{total}}</strong></p>
    
    <p>Questions? Reply to this email or call {{contactPhone}}.</p>
    
    <a href="{{receiptUrl}}">View Receipt Online</a>
  </div>
</body>
</html>
```

### SMS Template

```
{{storeName}}: Thanks for your purchase at {{eventName}}! 

Total: ${{total}}
Paid via {{paymentMethod}}

View receipt: {{receiptUrl}}
```

---

## 🛒 Shopping Cart System

### Cart Features

**Core Functionality:**
- Add/remove items
- Quantity adjustment (for multi-asset purchases)
- Real-time total calculation
- Cart persistence (session-based)
- Hold requests

### Cart State Management

```typescript
interface CartItem {
  id: string;
  asset: GlobalAsset;
  price: number;
  quantity: number; // Usually 1 for unique cards
  hold_requested: boolean;
  hold_expires_at?: Date;
}

interface ShoppingCart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  session_id: string; // Anonymous session ID
}
```

### Cart Hooks

```typescript
// useShoppingCart.ts
function useShoppingCart(eventId: string) {
  const [cart, setCart] = useState<ShoppingCart>({
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    session_id: generateSessionId()
  });
  
  const addItem = (asset: GlobalAsset, price: number) => {
    // Check if already in cart
    const existing = cart.items.find(item => item.asset.id === asset.id);
    if (existing) {
      toast.error('Item already in cart');
      return;
    }
    
    // Add new item
    const newItem: CartItem = {
      id: generateId(),
      asset,
      price,
      quantity: 1,
      hold_requested: false
    };
    
    setCart(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      subtotal: prev.subtotal + price,
      total: prev.total + price
    }));
  };
  
  const removeItem = (itemId: string) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;
    
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
      subtotal: prev.subtotal - item.price,
      total: prev.total - item.price
    }));
  };
  
  const requestHold = async (itemId: string, minutes: number) => {
    // API call to create cart hold
    await apiRequest('POST', '/api/storefront/cart-holds', {
      event_id: eventId,
      asset_id: item.asset.id,
      session_id: cart.session_id,
      hold_minutes: minutes
    });
    
    // Update local state
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.id === itemId 
          ? { ...i, hold_requested: true, hold_expires_at: addMinutes(new Date(), minutes) }
          : i
      )
    }));
  };
  
  return { cart, addItem, removeItem, requestHold };
}
```

### Cart Hold System

**Hold Request Flow:**
```
1. Customer adds item to cart
2. Customer requests hold (10min, 40min, custom)
3. System creates cart_hold record
4. Asset temporarily reserved
5. Hold expires → asset released
6. OR customer completes checkout → asset sold
```

**Hold Expiry:**
```typescript
// Background job or on-demand check
async function checkExpiredHolds() {
  const expiredHolds = await db.query.storefrontCartHolds.findMany({
    where: and(
      eq(storefrontCartHolds.status, 'active'),
      lt(storefrontCartHolds.expires_at, new Date())
    )
  });
  
  for (const hold of expiredHolds) {
    await db.update(storefrontCartHolds)
      .set({ status: 'expired', updated_at: new Date() })
      .where(eq(storefrontCartHolds.id, hold.id));
  }
}
```

---

## 🧩 Component Architecture

### File Structure

```
features/sales-channels/public-storefront/
  components/
    cart/
      shopping-cart.tsx            # Main cart display
      cart-item.tsx                # Individual cart item
      cart-summary.tsx             # Subtotal, tax, total
      cart-hold-button.tsx         # Request hold
      empty-cart.tsx               # No items state
    checkout/
      storefront-checkout-dialog.tsx  # Main checkout flow
      checkout-steps.tsx              # Step indicator
      contact-form-step.tsx           # Contact info
      payment-method-step.tsx         # Payment selection
      confirmation-step.tsx           # Final confirmation
      receipt-step.tsx                # Receipt display
      tablet-spin-prompt.tsx          # "Spin tablet" UI
    receipt/
      receipt-template.tsx         # HTML receipt
      receipt-email.tsx            # Email version
      receipt-sms.tsx              # SMS version
      receipt-qr-code.tsx          # QR for online receipt
  hooks/
    use-shopping-cart.ts           # Cart state
    use-cart-holds.ts              # Hold management
    use-checkout.ts                # Checkout flow
    use-receipt.ts                 # Receipt generation
  utils/
    payment-helpers.ts             # Payment calculations
    contact-matcher.ts             # Duplicate detection
    receipt-generator.ts           # PDF/HTML/SMS templates
```

### Key Components

**ShoppingCart.tsx:**
```tsx
export function ShoppingCart({ eventId }: { eventId: string }) {
  const { cart, removeItem, requestHold } = useShoppingCart(eventId);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  if (cart.items.length === 0) {
    return <EmptyCart />;
  }
  
  return (
    <div className="shopping-cart">
      <CartHeader itemCount={cart.items.length} />
      
      <CartItems>
        {cart.items.map(item => (
          <CartItem 
            key={item.id}
            item={item}
            onRemove={() => removeItem(item.id)}
            onHold={(minutes) => requestHold(item.id, minutes)}
          />
        ))}
      </CartItems>
      
      <CartSummary 
        subtotal={cart.subtotal}
        tax={cart.tax}
        total={cart.total}
      />
      
      <Button 
        onClick={() => setCheckoutOpen(true)}
        size="lg"
        className="w-full"
      >
        Checkout (${cart.total})
      </Button>
      
      <StorefrontCheckoutDialog 
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        eventId={eventId}
      />
    </div>
  );
}
```

**StorefrontCheckoutDialog.tsx:**
```tsx
export function StorefrontCheckoutDialog({ 
  open, 
  onOpenChange, 
  cart, 
  eventId 
}: CheckoutDialogProps) {
  const [step, setStep] = useState<CheckoutStep>('contact');
  const [contact, setContact] = useState<Contact | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const steps = ['contact', 'payment', 'spin', 'confirm', 'receipt'];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <CheckoutSteps current={step} steps={steps} />
        
        {step === 'contact' && (
          <ContactFormStep 
            onSubmit={(data) => {
              setContact(data);
              setStep('payment');
            }}
          />
        )}
        
        {step === 'payment' && (
          <PaymentMethodStep 
            total={cart.total}
            onSelect={(method) => {
              setPaymentMethod(method);
              setStep('spin');
            }}
          />
        )}
        
        {step === 'spin' && (
          <TabletSpinPrompt 
            direction="to_dealer"
            onComplete={() => setStep('confirm')}
          />
        )}
        
        {step === 'confirm' && (
          <ConfirmationStep 
            cart={cart}
            contact={contact}
            paymentMethod={paymentMethod}
            onConfirm={async () => {
              await processCheckout({
                cart,
                contact,
                paymentMethod,
                eventId
              });
              setStep('receipt');
            }}
          />
        )}
        
        {step === 'receipt' && (
          <ReceiptStep 
            cart={cart}
            contact={contact}
            paymentMethod={paymentMethod}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔗 Integration with EventCheckoutDialog

### Reusing Existing Patterns

**EventCheckoutDialog location:**
```
client/src/features/events/components/checkout/EventCheckoutDialog.tsx
```

**What to reuse:**
- Payment method selection UI
- Receipt generation logic
- Contact form patterns
- Email/SMS delivery

**Differences:**
- Storefront version has tablet spin UX
- Storefront auto-tags contacts with event
- Storefront updates asset status to "sold"
- Storefront has cart hold system

### Shared Components

**Create shared checkout utilities:**
```
client/src/shared/checkout/
  components/
    payment-selector.tsx      # Shared payment UI
    receipt-template.tsx      # Shared receipt
  hooks/
    use-receipt-delivery.ts   # Email + SMS logic
  utils/
    payment-types.ts          # TypeScript types
```

---

## 📊 Analytics

### Track checkout funnel:
- Cart views
- Checkout started
- Payment method selected
- Checkout completed
- Checkout abandoned

### Metrics:
- Avg cart value
- Conversion rate (cart → checkout)
- Most popular payment methods
- Avg time to complete checkout

---

**Last Updated:** October 5, 2025  
**Next Review:** October 12, 2025  
**Owner:** @peterperez
