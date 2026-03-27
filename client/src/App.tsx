import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import { useTheme } from "./hooks/useTheme";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAlertStore } from "./store/alertStore";

import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { AlertBanner } from "./components/layout/AlertBanner";

import HomePage from "./pages/HomePage";
import EarthquakesPage from "./pages/EarthquakesPage";
import AlertsPage from "./pages/AlertsPage";
import SafetyPage from "./pages/SafetyPage";
import AboutPage from "./pages/AboutPage";
import LabPage from "./pages/LabPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function AppShell() {
  const { theme } = useTheme();
  const { activeAlert, dismissAlert } = useAlertStore();

  // WebSocket ulanishini ishga tushirish
  const { connected } = useWebSocket();

  // dark/light klassini <html> ga qo'llash
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <Navbar connected={connected} />
      <AlertBanner alert={activeAlert} onDismiss={dismissAlert} />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/earthquakes" element={<EarthquakesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/lab" element={<LabPage />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
