import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Index from "@/pages/Index";
import BrowseServices from "@/pages/BrowseServices";
import ServiceDetails from "@/pages/ServiceDetails";
import HowItWorks from "@/pages/HowItWorks";
import BecomeTasker from "@/pages/BecomeTasker";
import BookTask from "@/pages/BookTask";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<BrowseServices />} />
            <Route path="/services/:categoryId" element={<ServiceDetails />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/become-tasker" element={<BecomeTasker />} />
            <Route path="/book/:serviceId" element={<BookTask />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
