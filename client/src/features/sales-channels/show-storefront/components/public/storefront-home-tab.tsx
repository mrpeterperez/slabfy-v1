// 🤖 INTERNAL NOTE:
// Purpose: Reusable Home tab component for storefront (preview + public page)
// Exports: StorefrontHomeTab component
// Feature: sales-channels/show-storefront
// Dependencies: QRCodeSVG, Lucide icons, color utils

import { useRef, useEffect, useState } from "react";
import { Phone, Mail, CreditCard, Search, Package } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getContrastColor } from "../../utils/color-utils";
import { getActiveColors } from "../../utils/theme-utils";
import { StorefrontLogo } from "./storefront-logo";
import type { StorefrontSettings } from "@shared/schema";

export type ThemeMode = "light" | "dark" | "auto";

interface StorefrontHomeTabProps {
  settings: Partial<StorefrontSettings> | null;
  userId?: string;
  themeMode?: ThemeMode;
  event?: any; // Event data for placeholder replacement
  onNavigateToInventory?: () => void;
}

export function StorefrontHomeTab({ 
  settings, 
  userId, 
  themeMode = "light",
  event,
  onNavigateToInventory 
}: StorefrontHomeTabProps) {
  const storeNameRef = useRef<HTMLHeadingElement>(null);
  const [storeNameFontSize, setStoreNameFontSize] = useState("text-6xl");
  
  const welcomeMessageRef = useRef<HTMLHeadingElement>(null);
  const [welcomeMessageFontSize, setWelcomeMessageFontSize] = useState("text-5xl");
  
  // Force re-render when theme changes via floating toggle
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleThemeChange = () => forceUpdate({});
    window.addEventListener('storage', handleThemeChange);
    return () => window.removeEventListener('storage', handleThemeChange);
  }, []);
  
  // Get active colors based on theme mode
  const colors = getActiveColors(settings);

  // Replace dynamic placeholders in text with event data
  const replacePlaceholders = (text: string): string => {
    if (!text) return text;
    
    // Use actual event data if available, otherwise fallback to defaults
    const eventData = {
      name: event?.name || "First Row Sports Show",
      dates: event?.dateStart && event?.dateEnd 
        ? `${new Date(event.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(event.dateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : event?.dateStart
        ? new Date(event.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : "Aug 16 - Aug 21, 2025",
      location: event?.location || "Cleveland, OH"
    };
    
    return text
      .replace(/<show-title>/g, eventData.name)
      .replace(/<show-date>/g, eventData.dates)
      .replace(/<show-location>/g, eventData.location);
  };

  // Format event date and location for display
  const getEventDateLocation = () => {
    if (!event) {
      return {
        dates: "Aug 16 - Aug 21, 2025",
        location: "Huntington Convention Center, Cleveland, OH"
      };
    }
    
    const dates = event.dateStart && event.dateEnd 
      ? `${new Date(event.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(event.dateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : event.dateStart
      ? new Date(event.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : "Aug 16 - Aug 21, 2025";
    
    const location = event.location || "Cleveland, OH";
    
    return { dates, location };
  };

  const eventInfo = getEventDateLocation();

  // Dynamic font sizing for store name - check if text overflows and shrink if needed
  useEffect(() => {
    const element = storeNameRef.current;
    if (!element) return;
    
    // Reset to largest size first
    setStoreNameFontSize("text-6xl");
    
    // Check if overflowing after render
    setTimeout(() => {
      const isOverflowing = element.scrollHeight > element.clientHeight;
      
      if (isOverflowing) {
        // Try text-5xl
        setStoreNameFontSize("text-5xl");
        
        setTimeout(() => {
          const stillOverflowing = element.scrollHeight > element.clientHeight;
          if (stillOverflowing) {
            // Fallback to text-4xl
            setStoreNameFontSize("text-4xl");
          }
        }, 50);
      }
    }, 50);
  }, [settings?.storeName, settings?.headingFont]);
  
  // Dynamic font sizing for welcome message - check if text overflows and shrink if needed
  useEffect(() => {
    const element = welcomeMessageRef.current;
    if (!element) return;
    
    // Reset to largest size first
    setWelcomeMessageFontSize("text-5xl");
    
    // Check if overflowing after render
    setTimeout(() => {
      const isOverflowing = element.scrollHeight > element.clientHeight;
      
      if (isOverflowing) {
        // Try text-4xl
        setWelcomeMessageFontSize("text-4xl");
        
        setTimeout(() => {
          const stillOverflowing = element.scrollHeight > element.clientHeight;
          if (stillOverflowing) {
            // Fallback to text-3xl
            setWelcomeMessageFontSize("text-3xl");
          }
        }, 50);
      }
    }, 50);
  }, [settings?.welcomeMessage, settings?.headingFont]);

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left Panel - Gradient Background */}
      <div 
        className="w-full lg:w-1/2 flex-shrink-0 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-10 relative overflow-hidden min-h-[50vh] lg:min-h-0"
        style={{
          background: `linear-gradient(135deg, ${colors.primaryColor} 0%, ${colors.accentColor} 100%)`,
          color: colors.textColor,
        }}
      >
        {/* Store Logo Circle */}
        {settings?.storeLogo ? (
          <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full border-4 border-white shadow-2xl mb-4 sm:mb-6 overflow-hidden flex items-center justify-center bg-white">
            <img 
              src={settings.storeLogo}
              alt="Store Logo"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-white flex items-center justify-center shadow-2xl mb-4 sm:mb-6">
            <div className="text-center text-xs font-bold break-words" style={{ color: colors.primaryColor }}>
              {settings?.storeName?.split(' ').slice(0, 2).join('\n').toUpperCase() || 'STORE\nLOGO'}
            </div>
          </div>
        )}
        
        {/* Store Name */}
        {settings?.storeName && (
          <h1 
            ref={storeNameRef}
            className={`text-2xl sm:text-3xl lg:${storeNameFontSize} font-extrabold mb-3 sm:mb-4 text-center break-words w-full px-4`}
            style={{
              fontFamily: settings?.headingFont || "Bebas Neue",
              color: "#ffffff", // Pure white for gradient background overlay
              overflowWrap: "break-word",
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {replacePlaceholders(settings.storeName)}
          </h1>
        )}
        
        {/* Description */}
        {settings?.description && (
          <p 
            className="text-sm sm:text-base lg:text-lg text-center mb-6 sm:mb-8 max-w-md leading-relaxed opacity-90 break-words px-4" 
            style={{ 
              overflowWrap: "break-word", 
              wordBreak: "break-word",
              fontFamily: settings?.fontStyle || "Inter",
              color: "#f0f0f0", // Almost white for gradient background overlay
            }}
          >
            {replacePlaceholders(settings.description)}
          </p>
        )}
        
        {/* Info Items */}
        {(settings?.contactPhone || settings?.contactEmail) && (
          <div className="space-y-3 sm:space-y-4 w-full max-w-md text-center px-4">
            {settings?.contactPhone && (
              <div 
                className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg break-words" 
                style={{ 
                  overflowWrap: "break-word", 
                  wordBreak: "break-word",
                  color: getContrastColor(colors.primaryColor),
                }}
              >
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span>Text: {settings.contactPhone}</span>
              </div>
            )}
            {settings?.contactEmail && (
              <div 
                className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg break-words" 
                style={{ 
                  overflowWrap: "break-word", 
                  wordBreak: "break-word",
                  color: getContrastColor(colors.primaryColor),
                }}
              >
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span>{settings.contactEmail}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Background Color Section */}
      <div 
        className="w-full lg:w-1/2 flex-shrink-0 flex flex-col items-center justify-between p-6 sm:p-8 lg:p-12 min-h-[50vh] lg:min-h-0"
        style={{
          backgroundColor: colors.backgroundColor,
          color: colors.textColor,
        }}
      >
        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {settings?.welcomeMessage && (
            <h2 
              ref={welcomeMessageRef}
              className={`text-2xl sm:text-3xl lg:${welcomeMessageFontSize} font-bold text-center mb-4 sm:mb-6 leading-tight break-words w-full px-4`}
              style={{ 
                overflowWrap: "break-word", 
                wordBreak: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontFamily: settings?.headingFont || "Bebas Neue",
                color: colors.headingFontColor,
              }}
            >
              {replacePlaceholders(settings.welcomeMessage)}
            </h2>
          )}
          
          {/* Date and Location Section - ALWAYS RENDER with intelligent fallbacks */}
          <p 
            className="text-base sm:text-lg lg:text-xl mb-2 sm:mb-3 font-medium text-center px-4" 
            style={{ 
              fontFamily: settings?.fontStyle || "Inter",
              color: colors.bodyFontColor,
            }}
          >
            {replacePlaceholders(
              (settings?.eventDateText && settings.eventDateText.trim() !== "")
                ? settings.eventDateText
                : "<show-date>"
            )}
          </p>
          <p 
            className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 text-center px-4" 
            style={{ 
              fontFamily: settings?.fontStyle || "Inter",
              color: colors.bodyFontColor,
            }}
          >
            {replacePlaceholders(
              (settings?.eventLocationText && settings.eventLocationText.trim() !== "")
                ? settings.eventLocationText
                : "<show-location>"
            )}
          </p>
          
          {/* Action Buttons - Centered */}
          <div className="w-full max-w-md space-y-3 sm:space-y-4 px-4">
            {settings?.enableInventory && (
              <button
                onClick={onNavigateToInventory}
                className="w-full h-12 sm:h-[52px] text-sm sm:text-base font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primaryColor,
                  color: getContrastColor(colors.primaryColor),
                  borderRadius: `${settings?.buttonRadius ?? 12}px`,
                  fontFamily: settings?.headingFont || "Bebas Neue",
                }}
              >
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                View My Inventory
              </button>
            )}
            
            {settings?.enableBuyingDesk && (
              <button
                className="w-full h-12 sm:h-[52px] text-sm sm:text-base font-semibold border-2 transition-all flex items-center justify-center gap-2"
                style={{
                  borderColor: colors.textColor,
                  backgroundColor: colors.backgroundColor,
                  color: colors.textColor,
                  borderRadius: `${settings?.buttonRadius ?? 12}px`,
                  fontFamily: settings?.headingFont || "Bebas Neue",
                }}
              >
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                Sell Your Cards
              </button>
            )}
            
            {settings?.enablePriceChecker && (
              <button
                className="w-full h-12 sm:h-[52px] text-sm sm:text-base font-semibold border-2 transition-all flex items-center justify-center gap-2"
                style={{
                  borderColor: colors.textColor,
                  backgroundColor: colors.backgroundColor,
                  color: colors.textColor,
                  borderRadius: `${settings?.buttonRadius ?? 12}px`,
                  fontFamily: settings?.headingFont || "Bebas Neue",
                }}
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                Price Checker
              </button>
            )}
          </div>
        </div>
        
        {/* QR Code - Bottom with padding */}
        <div className="flex flex-col items-center px-4 pb-6 sm:pb-8">
          <QRCodeSVG
            value={`${window.location.origin}/storefront/${userId || 'preview'}`}
            size={100}
            level="H"
            includeMargin={true}
            fgColor={settings?.qrCodeColor || "#000000"}
            imageSettings={settings?.qrCodeLogoOverlay && settings?.storeLogo ? {
              src: settings.storeLogo,
              height: 25,
              width: 25,
              excavate: true,
            } : undefined}
            className="sm:w-[120px] sm:h-[120px]"
          />
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 mb-4 sm:mb-6 text-center" style={{ color: colors.textColor }}>
            Scan To View On Your Phone
          </p>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs" style={{ color: colors.textColor }}>
            <span>Powered by</span>
            <StorefrontLogo primaryColor={colors.primaryColor} textColor={colors.textColor} />
          </div>
        </div>
      </div>
    </div>
  );
}
