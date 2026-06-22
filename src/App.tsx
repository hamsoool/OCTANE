import { createSignal, type Component } from "solid-js";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Watchlist from "./pages/Watchlist";
import MapPage from "./pages/MapPage";
import Stations from "./pages/Stations";
import { getRole } from "./api";

type Page = "landing" | "auth" | "dashboard" | "admin-dashboard" | "watchlist" | "map" | "stations";

const App: Component = () => {
  const [currentPage, setCurrentPage] = createSignal<Page>("landing");

  const handleSignIn = () => {
    setCurrentPage(getRole() === "admin" ? "admin-dashboard" : "dashboard");
  };

  const handleLogout = () => {
    setCurrentPage("landing");
  };

  const isAppPage = () =>
    currentPage() === "dashboard" ||
    currentPage() === "admin-dashboard" ||
    currentPage() === "watchlist" ||
    currentPage() === "map" ||
    currentPage() === "stations";

  return (
    <div class="bg-surface text-on-surface min-h-screen font-body-md">
      {isAppPage() && <TopNav current={currentPage() as any} onNavigate={setCurrentPage as any} onLogout={handleLogout} />}
      <main classList={{ "pb-xl md:pb-0": isAppPage() }}>
        {currentPage() === "landing" && <Landing onEnter={() => setCurrentPage("auth")} />}
        {currentPage() === "auth" && (
          <AuthPage
            onBack={() => setCurrentPage("landing")}
            onSignIn={handleSignIn}
          />
        )}
        {currentPage() === "dashboard" && <Dashboard />}
        {currentPage() === "admin-dashboard" && <AdminDashboard />}
        {currentPage() === "watchlist" && <Watchlist />}
        {currentPage() === "map" && <MapPage />}
        {currentPage() === "stations" && <Stations />}
      </main>
      {isAppPage() && <BottomNav current={currentPage() as any} onNavigate={setCurrentPage as any} />}
    </div>
  );
};

export default App;
