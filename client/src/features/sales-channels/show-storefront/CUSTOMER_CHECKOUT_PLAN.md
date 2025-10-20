# Customer Checkout Flow - Architecture & Implementation Plan

## 🎯 Overview
Complete customer-facing checkout system for storefront where customers submit order requests that dealers process through their dashboard.

---

## 📋 User Flow

### Customer Side (Public Storefront)
1. **Browse & Add to Cart** → Customer adds items from inventory
2. **Click "Checkout"** → Navigates to checkout form
3. **Enter Info** → Name, Email, Phone (optional)
4. **Submit Order** → "Request Checkout" button
5. **Confirmation** → See order summary with "Dealer will contact you" message

### Dealer Side (Dashboard)
1. **Notification** → See badge on Events > **Orders** tab
2. **Review Order** → View customer info + items requested
3. **Contact Customer** → Reach out via email/phone
4. **Process Payment** → Use existing POS checkout (cash only v1)
5. **Mark Complete** → Order moves to **Sold** tab (grouped by transaction)

---

## 🗂️ Database Schema

### New Table: `storefront_orders`
```sql
CREATE TABLE storefront_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "ORD-20250107-001"
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id), -- which show/event this is for
  
  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Order status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, contacted, completed, cancelled
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  total_amount DECIMAL(10,2) NOT NULL,
  total_items INTEGER NOT NULL,
  notes TEXT
);

CREATE INDEX idx_storefront_orders_user_id ON storefront_orders(user_id);
CREATE INDEX idx_storefront_orders_event_id ON storefront_orders(event_id);
CREATE INDEX idx_storefront_orders_status ON storefront_orders(status);
CREATE INDEX idx_storefront_orders_created_at ON storefront_orders(created_at DESC);
```

### New Table: `storefront_order_items`
```sql
CREATE TABLE storefront_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES storefront_orders(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES global_assets(id),
  
  -- Pricing at time of order
  price_at_order DECIMAL(10,2) NOT NULL,
  
  -- Asset snapshot (in case dealer updates/deletes asset later)
  asset_snapshot JSONB NOT NULL, -- full asset data at time of order
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storefront_order_items_order_id ON storefront_order_items(order_id);
CREATE INDEX idx_storefront_order_items_asset_id ON storefront_order_items(asset_id);
```

---

## 🎨 UI Components Structure

### Customer Checkout Page
```
client/src/features/sales-channels/show-storefront/components/public/checkout/
├── checkout-page.tsx              # Main checkout page container
├── checkout-form.tsx              # Customer info form (name/email/phone)
├── checkout-summary.tsx           # Order items + total display
├── checkout-confirmation.tsx      # Success screen after submission
└── use-checkout-submission.ts     # React Query mutation hook
```

### Dealer Orders Management
```
client/src/features/events/components/event-detail/tabs/
├── orders-tab.tsx                 # Main orders list view
├── order-card.tsx                 # Individual order display card
├── order-detail-dialog.tsx        # Full order details modal
└── order-actions.tsx              # Contact/Complete/Cancel buttons
```

### Sold Items (Grouped Table)
```
client/src/features/events/components/event-detail/tabs/
├── sold-tab.tsx                   # Main sold items view
├── sold-group-row.tsx            # Reuses portfolio grouped-group-row pattern
└── sold-transaction-details.tsx   # Expandable transaction details
```

---

## 🔌 API Endpoints

### Customer Checkout APIs
```typescript
// Create order
POST /api/storefront/:userId/checkout
Body: {
  eventId?: string,
  customerName: string,
  customerEmail: string,
  customerPhone?: string,
  items: Array<{ assetId: string, price: number }>
}
Response: { orderId: string, orderNumber: string }

// Get order confirmation
GET /api/storefront/orders/:orderId/confirmation
Response: { order: Order, items: OrderItem[] }
```

### Dealer Order Management APIs
```typescript
// Get all orders for dealer's events
GET /api/events/:eventId/orders
Query: { status?: 'pending' | 'contacted' | 'completed' }
Response: { orders: Order[] }

// Get order details
GET /api/events/orders/:orderId
Response: { order: Order, items: OrderItem[], customer: CustomerInfo }

// Update order status
PATCH /api/events/orders/:orderId/status
Body: { status: 'contacted' | 'completed' | 'cancelled' }

// Process payment (integrates with existing POS)
POST /api/events/orders/:orderId/process-payment
Body: { paymentMethod: 'cash', amountPaid: number }
Response: { transaction: Transaction }
```

### Sold Items APIs
```typescript
// Get sold items grouped by transaction
GET /api/events/:eventId/sold
Response: { 
  transactions: Array<{
    id: string,
    orderNumber: string,
    customerName: string,
    totalAmount: number,
    completedAt: string,
    items: Asset[]
  }>
}
```

---

## 🏗️ Implementation Phases

### Phase 1: Customer Checkout (Week 1)
- [ ] Create database tables (`storefront_orders`, `storefront_order_items`)
- [ ] Build checkout page UI with form
- [ ] Implement order submission API
- [ ] Add confirmation screen
- [ ] Email notification to dealer (simple version)

### Phase 2: Dealer Orders Tab (Week 2)
- [ ] Add "Orders" tab to Events detail page
- [ ] Build orders list view with badges
- [ ] Create order detail dialog
- [ ] Implement status updates (pending → contacted → completed)
- [ ] Add customer contact info display

### Phase 3: Payment Integration (Week 3)
- [ ] Integrate existing POS checkout flow
- [ ] Connect order to payment processing
- [ ] Auto-update order status on payment complete
- [ ] Generate receipt with order number

### Phase 4: Sold Items (Week 4)
- [ ] Add "Sold" tab to Events
- [ ] Implement grouped table (reuse portfolio pattern)
- [ ] Show transactions by order number
- [ ] Expandable view with all items in transaction
- [ ] Filter by date range

---

## 🔔 Notifications System (Future)

### V1 (Simple)
- Email to dealer when new order created
- Order badge count in Events navigation

### V2 (Advanced)
- Push notifications
- SMS alerts for high-value orders
- Customer order status updates via email

---

## 🎨 UI/UX Patterns to Reuse

### From Events/Buy Mode
- ✅ Hamburger navigation with "< Back To Events"
- ✅ Tab interface structure
- ✅ Empty states with icons + messages
- ✅ Action buttons (primary color)

### From Portfolio
- ✅ Grouped table row component (`grouped-group-row.tsx`)
- ✅ Expandable/collapsible sections
- ✅ Asset thumbnail display

### From Dashboard Checkout
- ✅ POS system integration
- ✅ Cash payment processing
- ✅ Receipt generation
- ✅ Order summary display

---

## 📊 Tab Structure - Events Detail Page

### Updated Tab Order:
1. **Inventory** - What you're selling (existing: Available)
2. **Orders** - Customer requests (NEW! 🔥)
3. **In Cart** - Your buy-mode cart (existing)
4. **Sold** - Completed transactions (existing + enhanced 🔥)
5. **Reserved** - Items on hold (existing)
6. **All** - Everything (existing)

### Orders Tab Features:
- Badge showing pending order count
- Filter by status (All/Pending/Contacted/Completed)
- Sort by date (newest first)
- Quick actions (Contact/Complete/Cancel)
- Shows customer name, email, phone
- Total order amount
- Item count

### Sold Tab Features (Enhanced):
- Grouped by transaction/order number
- Shows customer name + date (for storefront orders)
- Regular sales (POS/manual) grouped separately
- Total amount per transaction
- Expandable to see all items
- Export to CSV functionality (future)

---

## 🚀 Success Metrics

### Customer Experience
- [ ] <5 seconds to complete checkout form
- [ ] Clear confirmation message
- [ ] Email confirmation received within 1 minute

### Dealer Experience
- [ ] Instant order notification
- [ ] <3 clicks to view full order details
- [ ] Seamless POS integration
- [ ] Automatic sold items tracking

---

## 🔒 Security Considerations

### Customer Data
- Validate email format
- Sanitize all inputs
- Rate limit order submissions (prevent spam)
- Store customer data encrypted at rest

### Dealer Access
- Ensure dealers only see orders for THEIR events
- Validate event ownership before showing orders
- Audit log for status changes

---

## 📝 Notes & Decisions

### Why "Orders" Tab Name?
- More familiar to e-commerce users
- Clearer intent (customer placing order)
- Aligns with industry standard terminology
- Better than "Requests" (too vague)

### Why Cash Only V1?
- Simplifies initial implementation
- Matches existing POS capabilities
- Most card shows operate on cash basis
- Credit card processing adds complexity (Stripe/Square integration for V2)

### Why Separate from Buy Mode Cart?
- Different user types (customers vs dealers)
- Different workflows (checkout vs offer management)
- Prevents confusion between buying inventory vs selling to customers

### Event ID Association
- Orders can be tied to specific events (shows)
- Allows filtering orders by event
- Enables show-specific analytics
- Optional field (online sales won't have event)

---

## 🎯 Future Enhancements

### V2 Features
- [ ] Credit card processing (Stripe integration)
- [ ] Digital payment methods (Venmo/CashApp)
- [ ] Customer accounts (save info, order history)
- [ ] Shipping integration
- [ ] Inventory sync (auto-remove sold items)
- [ ] Automated email updates to customers

### V3 Features  
- [ ] Pre-orders for upcoming shows
- [ ] Layaway/payment plans
- [ ] Trade-in system integration
- [ ] Customer loyalty rewards
- [ ] Gift cards/store credit
- [ ] Bulk discounts

---

## 🔄 Integration Points

### Existing Systems to Connect:
1. **Events System** - Orders tied to specific shows
2. **POS Checkout** - Payment processing for orders
3. **Portfolio/Inventory** - Asset availability tracking
4. **Email System** - Customer/dealer notifications
5. **Analytics** - Sales tracking and reporting

---

## 📱 Mobile Considerations

### Customer Mobile Experience:
- Responsive checkout form
- Touch-friendly buttons
- Auto-complete for email/phone
- Mobile-optimized confirmation screen

### Dealer Mobile Experience:
- Swipeable order cards
- Quick contact buttons (tap to call/email)
- Mobile POS integration
- Push notifications for new orders

---

## 🧪 Testing Strategy

### Unit Tests:
- Order creation validation
- Email format validation
- Price calculations
- Status transitions

### Integration Tests:
- Complete checkout flow
- Order to payment processing
- Order to sold items migration
- Email delivery

### E2E Tests:
- Customer checkout journey
- Dealer order management
- Payment processing
- Order completion

---

**Created:** January 7, 2025  
**Last Updated:** January 7, 2025  
**Status:** 📋 Planning Phase  
**Next Step:** Phase 1 - Database Schema & Customer Checkout UI

---

## 🚀 Ready to Build!

This plan covers the complete customer checkout system from initial cart to final sale. All components are designed to reuse existing patterns and integrate seamlessly with current features.

**Let's ship this! 🔥**
