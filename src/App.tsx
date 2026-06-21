import { createSignal, type Component } from "solid-js";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import MapPage from "./pages/MapPage";
import Stations from "./pages/Stations";

type Page = "landing" | "dashboard" | "watchlist" | "map" | "stations";

const App: Component = () => {
  const [currentPage, setCurrentPage] = createSignal<Page>("landing");

  const isAppPage = () =>
    currentPage() === "dashboard" ||
    currentPage() === "watchlist" ||
    currentPage() === "map" ||
    currentPage() === "stations";

  return (
    <div class="bg-surface text-on-surface min-h-screen font-body-md">
      {isAppPage() && <TopNav current={currentPage() as any} onNavigate={setCurrentPage as any} />}
      <main classList={{ "pt-xl pb-xl md:pb-0": isAppPage() }}>
        {currentPage() === "landing" && <Landing onEnter={() => setCurrentPage("dashboard")} />}
        {currentPage() === "dashboard" && <Dashboard />}
        {currentPage() === "watchlist" && <Watchlist />}
        {currentPage() === "map" && <MapPage />}
        {currentPage() === "stations" && <Stations />}
      </main>
      {isAppPage() && <BottomNav current={currentPage() as any} onNavigate={setCurrentPage as any} />}
    </div>
  );
};

export default App;
