import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import NotFound from "./pages/NotFound";
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AccountDeleted = lazy(() => import("./pages/AccountDeleted"));

// Public pages
import PublicDashboard from "./pages/public/PublicDashboard";
const PublicVenueDetail = lazy(() => import("./pages/public/PublicVenueDetail"));
const PublicRoomDetail = lazy(() => import("./pages/public/PublicRoomDetail"));

// Legal pages
const FAQ = lazy(() => import("./pages/legal/FAQ"));
const Contact = lazy(() => import("./pages/legal/Contact"));
const About = lazy(() => import("./pages/legal/About"));
const Legal = lazy(() => import("./pages/legal/Legal"));

// Artist pages
const ArtistDashboard = lazy(() => import("./pages/artist/ArtistDashboard"));
const ArtistMessages = lazy(() => import("./pages/artist/ArtistMessages"));
const ArtistApplications = lazy(() => import("./pages/artist/ArtistApplications"));
const ArtistProfile = lazy(() => import("./pages/artist/ArtistProfile"));
const ArtistCalendar = lazy(() => import("./pages/artist/ArtistCalendar"));
const ArtistGigDetail = lazy(() => import("./pages/artist/ArtistGigDetail"));
const ArtistFavorites = lazy(() => import("./pages/artist/ArtistFavorites"));
const FindVenues = lazy(() => import("./pages/artist/FindVenues"));
const VenueListingDetail = lazy(() => import("./pages/artist/VenueListingDetail"));
const VenueDetail = lazy(() => import("./pages/artist/VenueDetail"));
const ApplicationDetail = lazy(() => import("./pages/artist/ApplicationDetail"));

// Venue pages
const VenueDashboard = lazy(() => import("./pages/venue/VenueDashboard"));
const VenueMessages = lazy(() => import("./pages/venue/VenueMessages"));

const VenueApplications = lazy(() => import("./pages/venue/VenueApplications"));
const VenueApplicationDetail = lazy(() => import("./pages/venue/VenueApplicationDetail"));
const VenueCalendar = lazy(() => import("./pages/venue/VenueCalendar"));
const GigDetail = lazy(() => import("./pages/venue/GigDetail"));
const VenueProfile = lazy(() => import("./pages/venue/VenueProfile"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
          <Routes>
            {/* Public routes - accessible to everyone */}
            <Route path="/" element={<PublicDashboard />}>
              <Route path="venues/:id" element={<PublicVenueDetail />} />
              <Route path="rooms/:id" element={<PublicRoomDetail />} />
              <Route path="booked-venues/:listingId" element={<PublicVenueDetail />} />
            </Route>
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account-deleted" element={<AccountDeleted />} />
            <Route path="/demo-venue" element={<Navigate to="/?auth=login" replace />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/legal" element={<Legal />} />

            {/* Artist routes */}
            <Route
              path="/artist"
              element={
                <ProtectedRoute requiredRole="artist">
                  <ArtistDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<FindVenues />} />
              <Route path="messages" element={<ArtistMessages />} />
              <Route path="applications" element={<ArtistApplications />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />
              <Route path="calendar" element={<ArtistCalendar />} />
              <Route path="calendar/:id" element={<ArtistGigDetail />} />
              <Route path="venues/:id" element={<VenueListingDetail />} />
              <Route path="venue/:venueProfileId" element={<VenueDetail />} />
              <Route path="booked-venues/:listingId" element={<VenueDetail />} />
            </Route>
            <Route
              path="/artist/profile"
              element={
                <ProtectedRoute requiredRole="artist">
                  <ArtistDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<ArtistProfile />} />
            </Route>
            <Route
              path="/artist/favorites"
              element={
                <ProtectedRoute requiredRole="artist">
                  <ArtistDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<ArtistFavorites />} />
            </Route>

            {/* Venue routes */}
            <Route
              path="/venue"
              element={
                <ProtectedRoute requiredRole="venue">
                  <VenueDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<VenueApplications />} />
              <Route path="applications/:id" element={<VenueApplicationDetail />} />
              <Route path="messages" element={<VenueMessages />} />
              
              <Route path="calendar" element={<VenueCalendar />} />
              <Route path="calendar/:id" element={<GigDetail />} />
            </Route>
            <Route
              path="/venue/profile"
              element={
                <ProtectedRoute requiredRole="venue">
                  <VenueDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<VenueProfile />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
