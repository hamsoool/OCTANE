import { Router, Route } from "@solidjs/router";
import type { Component } from "solid-js";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Watchlist from "./pages/Watchlist";
import MapPage from "./pages/MapPage";
import Stations from "./pages/Stations";

const App: Component = () => {
  return (
    <Router>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={AppLayout}>
        <Route path="/" component={Dashboard} />
      </Route>
      <Route path="/admin" component={AppLayout}>
        <Route path="/" component={AdminDashboard} />
      </Route>
      <Route path="/watchlist" component={AppLayout}>
        <Route path="/" component={Watchlist} />
      </Route>
      <Route path="/map" component={AppLayout}>
        <Route path="/" component={MapPage} />
      </Route>
      <Route path="/stations" component={AppLayout}>
        <Route path="/" component={Stations} />
      </Route>
    </Router>
  );
};

export default App;
