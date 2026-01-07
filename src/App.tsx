import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Artist pages
import ArtistDashboard from "./pages/artist/ArtistDashboard";
import ArtistMessages from "./pages/artist/ArtistMessages";
import ArtistApplications from "./pages/artist/ArtistApplications";
import ArtistProfile from "./pages/artist/ArtistProfile";
import FindVenues from "./pages/artist/FindVenues";
import VenueListingDetail from "./pages/artist/VenueListingDetail";
import ApplicationDetail from "./pages/artist/ApplicationDetail";

// Venue pages
import VenueDashboard from "./pages/venue/VenueDashboard";
import VenueMessages from "./pages/venue/VenueMessages";
import VenueListings from "./pages/venue/VenueListings";
import VenueApplications from "./pages/venue/VenueApplications";
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
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

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
              <Route path="messages" element={<VenueMessages />} />
              <Route path="listings" element={<VenueListings />} />
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
