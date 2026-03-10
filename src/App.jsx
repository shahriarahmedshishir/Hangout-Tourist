import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Flights from "./pages/Flights";
import Hotels from "./pages/Hotels";
import Holidays from "./pages/Holidays";
import Visa from "./pages/Visa";
import Cars from "./pages/Cars";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />}/>
          <Route path="/flights" element={<Flights />}/>
          <Route path="/hotels" element={<Hotels />}/>
          <Route path="/holidays" element={<Holidays />}/>
          <Route path="/visa" element={<Visa />}/>
          <Route path="/cars" element={<Cars />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/admin" element={<Admin />}/>
          <Route path="*" element={<NotFound />}/>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
