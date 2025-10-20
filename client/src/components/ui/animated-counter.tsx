import { useEffect, useState } from 'react';
import { motion, useAnimation, useMotionValue, useSpring } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
  decimals?: number;
  showToggle?: boolean;
  hiddenText?: string;
  animateOnMount?: boolean; // Controls whether to animate on initial mount only
}

export function AnimatedCounter({
  value,
  duration = 2000,
  formatter,
  className = '',
  decimals = 2,
  showToggle = false,
  hiddenText = '••••••',
  animateOnMount = false,
}: AnimatedCounterProps) {
  // Check if this is a genuine page load/refresh vs SPA navigation
  const isPageLoad = () => {
    try {
      // Check if we have a navigation timing entry indicating a fresh page load
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation?.type === 'navigate' || navigation?.type === 'reload';
    } catch {
      // Fallback: check if sessionStorage has our flag
      return !sessionStorage.getItem('spa-navigated');
    }
  };

  const shouldAnimate = animateOnMount && isPageLoad();
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? 0 : value);
  
  // Mark that SPA navigation has occurred
  useEffect(() => {
    sessionStorage.setItem('spa-navigated', 'true');
  }, []);
  
  // Load visibility state from localStorage on mount
  const [isVisible, setIsVisible] = useState(() => {
    if (!showToggle) return true;
    try {
      const saved = localStorage.getItem('portfolio-value-visible');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  
  // If we're not animating, seed the motion value with the final number so spring doesn't interpolate from 0.
  const motionValue = useMotionValue(shouldAnimate ? 0 : value);
  const springValue = useSpring(motionValue, { 
    damping: 25, 
    stiffness: 100,
    duration: duration 
  });

  useEffect(() => {
    if (shouldAnimate) {
      // Animate from 0 to value on genuine page load only
      motionValue.set(value);
    } else {
      // Update immediately without animation for SPA navigation
      motionValue.set(value);
      setDisplayValue(value);
    }
  }, [motionValue, value, shouldAnimate]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [springValue]);

  const formatValue = (val: number) => {
    if (formatter) {
      return formatter(val);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    // Save to localStorage
    try {
      localStorage.setItem('portfolio-value-visible', JSON.stringify(newVisibility));
    } catch (error) {
      console.warn('Failed to save portfolio visibility preference:', error);
    }
  };

  // Choose element: no motion wrapper if we're not animating entrance
  const AnimatedWrapper: any = shouldAnimate ? motion.span : 'span';
  const entranceProps = shouldAnimate
    ? { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.3, ease: 'easeOut' } }
    : {};

  if (showToggle) {
    return (
      <div className="flex items-center gap-2">
        <AnimatedWrapper
          className={`tabular-nums ${className}`}
          {...entranceProps}
        >
          {isVisible ? formatValue(displayValue) : hiddenText}
        </AnimatedWrapper>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVisibility}
          className="h-6 w-6 p-0 hover:bg-muted"
          aria-label={isVisible ? 'Hide value' : 'Show value'}
        >
          {isVisible ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <AnimatedWrapper
      className={`tabular-nums ${className}`}
      {...entranceProps}
    >
      {formatValue(displayValue)}
    </AnimatedWrapper>
  );
}