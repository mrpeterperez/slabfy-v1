// 🤖 INTERNAL NOTE:
// Purpose: Customer checkout page - clean form for customer info
// Exports: CheckoutPage component
// Feature: sales-channels/show-storefront

import { useState } from "react";
import { ArrowLeft, ShoppingBag, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getContrastColor } from "../../../utils/color-utils";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/constants";
import type { StorefrontSettings } from "@shared/schema";
import type { StorefrontCartItem } from "../storefront-cart-panel";

interface CheckoutPageProps {
  settings: Partial<StorefrontSettings> | null;
  cartItems: StorefrontCartItem[];
  onBack: () => void;
  userId?: string;
}

export function CheckoutPage({ 
  settings, 
  cartItems, 
  onBack,
  userId 
}: CheckoutPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const { toast } = useToast();

  const primaryColor = settings?.primaryColor || '#0d9488';
  const contrastColor = getContrastColor(primaryColor);
  const headingFont = settings?.headingFont || 'Inter';
  const fontStyle = settings?.fontStyle || 'Inter';
  const buttonRadius = settings?.buttonRadius || 16;

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get eventId from first cart item
    const eventId = cartItems[0]?.eventId || null;
    
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and email address.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Check if cart is empty
    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before checking out.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setInlineError(null);

    try {
      const eventId = cartItems[0]?.eventId || null;
      
      const payload = {
        userId,
        eventId,
        customerName: formData.name.trim(),
        customerEmail: formData.email.trim(),
        customerPhone: formData.phone.trim() || null,
        cartItems: cartItems.map(item => ({
          id: item.id,
          price: item.price || 0,
          eventInventoryId: item.eventInventoryId || null
        }))
      };
      
      const response = await fetch('/api/storefront/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Checkout submission failed:', response.status, errorText);
        throw new Error(errorText || 'Failed to submit order');
      }

      const result = await response.json();

      setOrderId(result.orderId);
      setSubmitted(true);

      toast({
        title: "Order submitted!",
        description: "The dealer will contact you shortly.",
      });

    } catch (error) {
      console.error('Checkout error:', error);
      setInlineError(error instanceof Error ? error.message : "Failed to submit order");
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    // Confirmation Screen
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div 
          className="flex-shrink-0 h-16"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.accentColor || primaryColor} 100%)`,
          }}
        >
          <div className="h-full px-4 flex items-center justify-center">
            <h2 
              className="text-lg font-bold"
              style={{ 
                fontFamily: headingFont,
                color: contrastColor
              }}
            >
              Order Submitted
            </h2>
          </div>
        </div>

        {/* Confirmation Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-8">
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <CheckCircle2 
                  className="w-12 h-12" 
                  style={{ color: primaryColor }}
                />
              </div>
              
              <h1 
                className="text-3xl font-bold mb-3"
                style={{ fontFamily: headingFont }}
              >
                Thank You!
              </h1>
              
              <p 
                className="text-lg text-gray-600 mb-2"
                style={{ fontFamily: fontStyle }}
              >
                Your order request has been sent to the dealer.
              </p>
              
              <p 
                className="text-base text-gray-500"
                style={{ fontFamily: fontStyle }}
              >
                We'll contact you shortly at <strong>{formData.email}</strong> to complete your purchase.
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: headingFont }}
              >
                Order Summary
              </h3>
              
              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-20 bg-gray-100 rounded border flex-shrink-0">
                      {item.asset.psaImageFrontUrl ? (
                        <img
                          src={item.asset.psaImageFrontUrl}
                          alt="Card"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={PLACEHOLDER_IMAGE_URL}
                          alt="Card"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p 
                        className="font-medium text-sm"
                        style={{ fontFamily: fontStyle }}
                      >
                        {item.asset.playerName}
                      </p>
                      <p 
                        className="text-xs text-gray-500"
                        style={{ fontFamily: fontStyle }}
                      >
                        {item.asset.year} {item.asset.setName} #{item.asset.cardNumber}
                      </p>
                    </div>
                    <div 
                      className="font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span 
                    className="text-lg font-semibold"
                    style={{ fontFamily: headingFont }}
                  >
                    Total
                  </span>
                  <span 
                    className="text-2xl font-bold"
                    style={{ 
                      fontFamily: headingFont,
                      color: primaryColor
                    }}
                  >
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg border p-6 mb-6">
              <h3 
                className="text-base font-semibold mb-3"
                style={{ fontFamily: headingFont }}
              >
                Your Contact Information
              </h3>
              <div className="space-y-2 text-sm" style={{ fontFamily: fontStyle }}>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
              </div>
            </div>

            {/* Next Steps */}
            <div 
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm"
              style={{ fontFamily: fontStyle }}
            >
              <p className="font-semibold mb-2">What happens next?</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>The dealer will review your order</li>
                <li>You'll receive an email or phone call to finalize details</li>
                <li>Complete payment and arrange pickup/shipping</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Checkout Form
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div 
        className="flex-shrink-0 h-16"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.accentColor || primaryColor} 100%)`,
        }}
      >
        <div className="h-full px-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
            style={{ color: contrastColor }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h2 
            className="text-lg font-bold"
            style={{ 
              fontFamily: headingFont,
              color: contrastColor
            }}
          >
            Checkout
          </h2>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <ShoppingBag 
                className="w-8 h-8" 
                style={{ color: primaryColor }}
              />
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: headingFont }}
            >
              Almost There!
            </h1>
            <p 
              className="text-gray-600"
              style={{ fontFamily: fontStyle }}
            >
              Enter your details and we'll contact you to complete the purchase
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {inlineError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                {inlineError}
              </div>
            )}
            {/* Customer Info Form */}
            <div className="bg-white rounded-lg border p-6">
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: headingFont }}
              >
                Contact Information
              </h3>

              <div className="space-y-4">
                <div>
                  <Label 
                    htmlFor="name" 
                    className="text-sm font-medium mb-2 block"
                    style={{ fontFamily: fontStyle }}
                  >
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full"
                    style={{ 
                      fontFamily: fontStyle,
                      borderRadius: `${buttonRadius}px`
                    }}
                  />
                </div>

                <div>
                  <Label 
                    htmlFor="email" 
                    className="text-sm font-medium mb-2 block"
                    style={{ fontFamily: fontStyle }}
                  >
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full"
                    style={{ 
                      fontFamily: fontStyle,
                      borderRadius: `${buttonRadius}px`
                    }}
                  />
                </div>

                <div>
                  <Label 
                    htmlFor="phone" 
                    className="text-sm font-medium mb-2 block"
                    style={{ fontFamily: fontStyle }}
                  >
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full"
                    style={{ 
                      fontFamily: fontStyle,
                      borderRadius: `${buttonRadius}px`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg border p-6">
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: headingFont }}
              >
                Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </h3>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-20 bg-gray-100 rounded border flex-shrink-0">
                      {item.asset.psaImageFrontUrl ? (
                        <img
                          src={item.asset.psaImageFrontUrl}
                          alt="Card"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={PLACEHOLDER_IMAGE_URL}
                          alt="Card"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p 
                        className="font-medium text-sm"
                        style={{ fontFamily: fontStyle }}
                      >
                        {item.asset.playerName}
                      </p>
                      <p 
                        className="text-xs text-gray-500"
                        style={{ fontFamily: fontStyle }}
                      >
                        {item.asset.year} {item.asset.setName} #{item.asset.cardNumber}
                      </p>
                      <p 
                        className="text-xs text-gray-400"
                        style={{ fontFamily: fontStyle }}
                      >
                        {item.asset.grade}
                      </p>
                    </div>
                    <div 
                      className="font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span 
                    className="text-lg font-semibold"
                    style={{ fontFamily: headingFont }}
                  >
                    Total
                  </span>
                  <span 
                    className="text-2xl font-bold"
                    style={{ 
                      fontFamily: headingFont,
                      color: primaryColor
                    }}
                  >
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-semibold disabled:opacity-50"
              style={{
                backgroundColor: primaryColor,
                color: contrastColor,
                fontFamily: headingFont,
                borderRadius: `${buttonRadius}px`
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Order Request'
              )}
            </Button>            <p 
              className="text-center text-sm text-gray-500"
              style={{ fontFamily: fontStyle }}
            >
              By submitting, you agree that the dealer will contact you to finalize your purchase.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
