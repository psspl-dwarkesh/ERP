import { Suspense, lazy } from "react";
import { ToastProvider, TooltipProvider } from "./ds/components";
import { useRoute } from "./app/router";
import { Shell } from "./app/Shell";

const Showcase = lazy(() => import("./showcase/Showcase"));

export default function App() {
  const route = useRoute();
  return (
    <TooltipProvider>
      <ToastProvider>
        {route.area === "showcase" ? (
          <Suspense fallback={<div className="boot" aria-busy="true" />}>
            <Showcase />
          </Suspense>
        ) : (
          <Shell />
        )}
      </ToastProvider>
    </TooltipProvider>
  );
}
