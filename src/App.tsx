import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Public pages
import PublicDashboard from "./pages/public/PublicDashboard";
import PublicVenueDetail from "./pages/public/PublicVenueDetail";

// Artist pages
import ArtistDashboard from "./pages/artist/ArtistDashboard";
import ArtistMessages from "./pages/artist/ArtistMessages";
import ArtistApplications from "./pages/artist/ArtistApplications";
import ArtistProfile from "./pages/artist/ArtistProfile";
import ArtistCalendar from "./pages/artist/ArtistCalendar";
import ArtistGigDetail from "./pages/artist/ArtistGigDetail";
import ArtistFavorites from "./pages/artist/ArtistFavorites";
import FindVenues from "./pages/artist/FindVenues";
import VenueListingDetail from "./pages/artist/VenueListingDetail";
import ApplicationDetail from "./pages/artist/ApplicationDetail";

// Venue pages
import VenueDashboard from "./pages/venue/VenueDashboard";
import VenueMessages from "./pages/venue/VenueMessages";

import VenueApplications from "./pages/venue/VenueApplications";
import VenueApplicationDetail from "./pages/venue/VenueApplicationDetail";
import VenueCalendar from "./pages/venue/VenueCalendar";
import GigDetail from "./pages/venue/GigDetail";
import VenueProfile from "./pages/venue/VenueProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - accessible to everyone */}
            <Route path="/" element={<PublicDashboard />}>
              <Route path="venues/:id" element={<PublicVenueDetail />} />
            </Route>
            <Route path="/auth" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
