/**
 * useCall Hook
 * Provides access to call context and functionality
 */

import { useContext } from 'react';
import { CallContext, type CallContextValue } from '@/contexts/CallContext';

export function useCall(): CallContextValue {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }

  return context;
}
