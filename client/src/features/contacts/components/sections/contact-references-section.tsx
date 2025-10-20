// 🤖 INTERNAL NOTE:
// Purpose: References section for contact detail page showing buy sessions and consignments
// Exports: ContactReferencesSection component
// Feature: contacts
// Dependencies: shadcn/ui, lucide-react, wouter

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Link, 
  ShoppingCart,
  Package,
  ExternalLink,
  Calendar,
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { type Contact } from "../../api/contacts-api";
import { useContactReferences } from "../../hooks/use-contacts";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";
import { ConsignmentStatusPill, type ConsignmentStatus } from "@/components/status/consignment-status-pill";

interface ContactReferencesSectionProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContactReferencesSection({ contact }: ContactReferencesSectionProps) {
  const [, setLocation] = useLocation();
  const { data: references, isLoading, error } = useContactReferences(contact.id);

  // Navigate to the referenced entities
  const handleNavigateToBuySession = (sessionId: string) => {
    setLocation(`/buying-desk/${sessionId}`);
  };

  const handleNavigateToConsignment = (consignmentId: string) => {
    setLocation(`/consignments/${consignmentId}`);
  };

  const handleNavigateToEvent = (eventId: string) => {
    setLocation(`/events/${eventId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link className="w-5 h-5" />
              References
            </h3>
          </div>
          <Card>
            <CardContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link className="w-5 h-5" />
              References
            </h3>
          </div>
          <Card>
            <CardContent>
            <p className="text-muted-foreground text-center p-8">
              Failed to load references. Please try again.
            </p>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  const hasReferences = references && (references.buyingSessions.length > 0 || references.consignments.length > 0 || (references.sales && references.sales.length > 0));

  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      {/* Empty state when no references */}
      {!hasReferences && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link className="w-5 h-5" />
              References
            </h3>
          </div>
          <Card>
            <CardContent>
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Link className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-2">No references found</h3>
              <p className="text-muted-foreground max-w-sm">
                This contact hasn't been referenced in any buy sessions, consignments, or sales yet.
              </p>
            </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Buy Sessions */}
      {references && references.buyingSessions.length > 0 && (
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Buy Sessions ({references.buyingSessions.length})
            </h3>
          </div>
          <Card>
            <CardContent className="p-0">
            <div className="divide-y">
              {references.buyingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BuySessionStatusPill 
                      status={session.status as BuySessionStatus}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateToBuySession(session.id)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Consignments */}
      {references && references.consignments.length > 0 && (
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              Consignments ({references.consignments.length})
            </h3>
          </div>
          <Card>
            <CardContent className="p-0">
            <div className="divide-y">
              {references.consignments.map((consignment) => (
                <div
                  key={consignment.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Package className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="font-medium">{consignment.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(consignment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConsignmentStatusPill 
                      status={consignment.status as ConsignmentStatus}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateToConsignment(consignment.id)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Sales */}
      {references && references.sales && references.sales.length > 0 && (
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              Sales ({references.sales.length})
            </h3>
          </div>
          <Card>
            <CardContent className="p-0">
            <div className="divide-y">
              {references.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <DollarSign className={`w-4 h-4 ${sale.role === 'buyer' ? 'text-red-500' : 'text-green-500'}`} />
                    <div>
                      <p className="font-medium">{sale.eventName || 'Sale'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(sale.createdAt).toLocaleDateString()}
                        <span className="text-muted-foreground">•</span>
                        <span>${sale.salePrice.toFixed(2)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{sale.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sale.role === 'buyer' ? 'destructive' : 'default'}>
                      {sale.role === 'buyer' ? 'Purchased' : 'Sold'}
                    </Badge>
                    {sale.eventId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigateToEvent(sale.eventId!)}
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}