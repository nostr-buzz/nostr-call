/**
 * Lazy Loading Components
 * Heavy components that are dynamically imported to reduce initial bundle size
 */

import { lazy } from 'react';

// Heavy authentication components
export const SignupDialog = lazy(() => import('./auth/SignupDialog'));
export const LoginDialog = lazy(() => import('./auth/LoginDialog'));

// Heavy wallet and payment components  
export const ZapDialog = lazy(() => import('./ZapDialog').then(module => ({ default: module.ZapDialog })));
export const WalletModal = lazy(() => import('./WalletModal').then(module => ({ default: module.WalletModal })));

// Heavy UI components
export const ChartComponent = lazy(() => import('./ui/chart').then(module => ({ default: module.ChartContainer })));
export const Sidebar = lazy(() => import('./ui/sidebar').then(module => ({ default: module.Sidebar })));
export const Carousel = lazy(() => import('./ui/carousel').then(module => ({ default: module.Carousel })));

// Profile and editing components
export const EditProfileForm = lazy(() => import('./EditProfileForm').then(module => ({ default: module.EditProfileForm })));

// Comments system (can be heavy with many comments)
export const CommentsSection = lazy(() => import('./comments/CommentsSection').then(module => ({ default: module.CommentsSection })));

// Call history (can be heavy with large call logs)
export const CallHistory = lazy(() => import('./CallHistory').then(module => ({ default: module.CallHistory })));

export default {
  SignupDialog,
  LoginDialog,
  ZapDialog,
  WalletModal,
  ChartComponent,
  Sidebar,
  Carousel,
  EditProfileForm,
  CommentsSection,
  CallHistory,
};