import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import Flights from "./pages/Flights";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import HotelBooking from "./pages/HotelBooking";
import Holidays from "./pages/Holidays";
import Visa from "./pages/Visa";
import Cars from "./pages/Cars";
import CarBooking from "./pages/CarBooking";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import UserDashboard from "./pages/UserDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import NotFound from "./pages/NotFound";
import PaymentResult from "./pages/PaymentResult";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FloatingPrivacyButton from "@/components/FloatingPrivacyButton";

const queryClient = new QueryClient();

// Redirects unauthenticated users to /login.
// Redirects authenticated users with wrong role to their correct home.
// While verifying token (loading) but with a stored user, trusts the stored role.
const ProtectedRoute = ({ element, roles }) => {
  const { user, loading } = useAuth();
  if (loading && !user) return null; // No stored session yet, wait silently
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "hotel_staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return element;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/booking/hotel" element={<HotelBooking />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/visa" element={<Visa />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/booking/car" element={<CarBooking />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={["user"]} element={<Profile />} />
              }
            />
            <Route
              path="/admin"
              element={<ProtectedRoute roles={["admin"]} element={<Admin />} />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["user"]} element={<UserDashboard />} />
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute
                  roles={["hotel_staff"]}
                  element={<StaffDashboard />}
                />
              }
            />
            <Route path="/payment/result" element={<PaymentResult />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingPrivacyButton />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
