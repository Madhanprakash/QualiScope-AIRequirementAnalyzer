import React from "react";
import { AppProvider } from "./hooks/useApp";
import { ThemeProvider } from "./hooks/useTheme";
import { useHashRoute } from "./hooks/useHashRoute";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AnalyzerPage from "./pages/AnalyzerPage";
import TestPackPage from "./pages/TestPackPage";
import RisksPage from "./pages/RisksPage";
import TraceabilityPage from "./pages/TraceabilityPage";
import ExecutionPage from "./pages/ExecutionPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const PAGES = {
  dashboard: DashboardPage, analyzer: AnalyzerPage, testpack: TestPackPage, risks: RisksPage,
  traceability: TraceabilityPage, execution: ExecutionPage, reports: ReportsPage, settings: SettingsPage
};

export default function App() {
  const [route, go] = useHashRoute();
  const Page = PAGES[route];
  return (
    <ThemeProvider>
      <AppProvider>
        <AppLayout route={route} go={go}><Page go={go} /></AppLayout>
      </AppProvider>
    </ThemeProvider>
  );
}
