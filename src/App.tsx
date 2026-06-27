import { lazy, type Component } from "solid-js";
import { Router, Route } from "@solidjs/router";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Stations from "./pages/Stations";
import CookieConsent from "./components/CookieConsent";

const MapPage = lazy(() => import("./pages/MapPage"));

const App: Component = () => {
  return (
    <>
      <Router>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/dashboard" component={AppLayout}>
          <Route path="/" component={Dashboard} />
        </Route>
        <Route path="/admin" component={AppLayout}>
          <Route path="/" component={AdminDashboard} />
        </Route>
        <Route path="/map" component={AppLayout}>
          <Route path="/" component={MapPage} />
        </Route>
        <Route path="/stations" component={AppLayout}>
          <Route path="/" component={Stations} />
        </Route>
      </Router>
      <CookieConsent />
    </>
  );
};

export default App;
