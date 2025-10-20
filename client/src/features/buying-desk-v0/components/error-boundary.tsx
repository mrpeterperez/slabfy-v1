// 🤖 INTERNAL NOTE:
// Purpose: Error boundary for buying desk table to handle component crashes gracefully
// Exports: BuyingDeskErrorBoundary component
// Feature: buying-desk-v0
// Dependencies: React error boundary, UI components

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BuyingDeskErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Buying desk table error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Something went wrong</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The buying desk table encountered an error. This could be due to network issues 
              or invalid data. Try refreshing or contact support if the problem persists.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}