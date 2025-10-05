'use client';

import { useEffect } from 'react';

export default function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigation = entry as PerformanceNavigationTiming;
          console.log('📊 Page Load Performance:', {
            'DNS Lookup': `${navigation.domainLookupEnd - navigation.domainLookupStart}ms`,
            'Connection': `${navigation.connectEnd - navigation.connectStart}ms`,
            'Server Response': `${navigation.responseEnd - navigation.requestStart}ms`,
            'DOM Content Loaded': `${navigation.domContentLoadedEventEnd - navigation.fetchStart}ms`,
            'Page Load Complete': `${navigation.loadEventEnd - navigation.fetchStart}ms`,
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('🎨 Largest Contentful Paint (LCP):', `${entry.startTime}ms`);
        }
        
        if (entry.entryType === 'first-input') {
          console.log('👆 First Input Delay (FID):', `${(entry as any).processingStart - entry.startTime}ms`);
        }
      }
    });

    // Observe different performance metrics
    if ('observe' in observer) {
      observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });
    }

    // Cleanup observer
    return () => observer.disconnect();
  }, []);

  // Render nothing - this is just for monitoring
  return null;
}