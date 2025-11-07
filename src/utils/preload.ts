/**
 * Route Preloading Utilities
 * Preload critical routes and components for better performance
 */

// Preload functions for route components
export const preloadIndex = () => import('../pages/Index');
export const preloadCallScreen = () => import('../pages/CallScreen');
export const preloadNIP19Page = () => import('../pages/NIP19Page');

// Preload functions for heavy components
export const preloadZapDialog = () => import('../components/ZapDialog');
export const preloadWalletModal = () => import('../components/WalletModal');
export const preloadEditProfileForm = () => import('../components/EditProfileForm');
export const preloadCallHistory = () => import('../components/CallHistory');

// Critical component preloader
export function preloadCriticalComponents() {
  // Preload components likely to be used soon
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for non-critical preloading
    const preload = () => {
      // Preload call-related components since this is a calling app
      preloadCallScreen();
      preloadCallHistory();
      
      // Preload wallet components for zap functionality
      preloadZapDialog();
      preloadWalletModal();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preload);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preload, 2000);
    }
  }
}

// Preload on user interaction (hover, focus)
export function preloadOnInteraction(componentName: string) {
  return {
    onMouseEnter: () => {
      switch (componentName) {
        case 'call':
          preloadCallScreen();
          break;
        case 'profile':
          preloadEditProfileForm();
          break;
        case 'wallet':
          preloadWalletModal();
          preloadZapDialog();
          break;
        case 'history':
          preloadCallHistory();
          break;
        default:
          break;
      }
    },
    onFocus: () => {
      // Same preloading logic for keyboard users
      preloadOnInteraction(componentName).onMouseEnter();
    }
  };
}