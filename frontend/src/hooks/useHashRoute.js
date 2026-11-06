import { useEffect, useState } from "react";

export const ROUTES = ["dashboard", "analyzer", "testpack", "risks", "traceability", "execution", "reports", "settings"];

const read = () => {
  const h = window.location.hash.replace("#/", "");
  return ROUTES.includes(h) ? h : "dashboard";
};

export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [route, r => { window.location.hash = `#/${r}`; }];
}
