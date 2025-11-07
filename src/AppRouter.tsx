import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ScrollToTop } from "./components/ScrollToTop";
import { GlobalIncomingCallHandler } from "./components/GlobalIncomingCallHandler";
import { Skeleton } from "./components/ui/skeleton";

// Lazy load page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const CallScreen = lazy(() => import("./pages/CallScreen"));
const NIP19Page = lazy(() => import("./pages/NIP19Page").then(module => ({ default: module.NIP19Page })));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-32 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-4 w-36 mx-auto" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-8">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter basename="/nostr-call">
      <ScrollToTop />
      <GlobalIncomingCallHandler />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/call" element={<CallScreen />} />
          {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
          <Route path="/:nip19" element={<NIP19Page />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
export default AppRouter;