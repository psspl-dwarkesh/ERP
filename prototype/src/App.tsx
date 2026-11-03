import { Suspense, lazy, useEffect } from "react";
import { restoreSession, useSession } from "./api/session";
import { API_MODE } from "./api/store";
import { LoginPage } from "./app/LoginPage";
import { navigate, useRoute } from "./app/router";
import { Shell } from "./app/Shell";
import { ToastProvider, TooltipProvider } from "./ds/components";

const Showcase = lazy(() => import("./showcase/Showcase"));

export default function App() {
  const route = useRoute();
  const session = useSession();

  useEffect(() => {
    void restoreSession();
  }, []);

  // In API mode the workspace needs a session; send signed-out visitors to sign-in, remembering where they were going.
  const needsSignIn = API_MODE === "remote" && route.area === "app" && session.status === "signed-out";
  useEffect(() => {
    if (needsSignIn) navigate(`/login?next=${encodeURIComponent(`/${route.path.join("/")}${route.tab ? `?tab=${route.tab}` : ""}`)}`, { replace: true });
  }, [needsSignIn, route.path, route.tab]);

  // Already signed in and on the sign-in page: go to the workspace.
  useEffect(() => {
    if (route.path[0] === "login" && session.status === "signed-in") navigate("/app/dashboard", { replace: true });
  }, [route.path, session.status]);

  let body;
  if (route.path[0] === "login") body = API_MODE === "remote" ? <LoginPage /> : <Redirect to="/app/dashboard" />;
  else if (route.area === "showcase")
    body = (
      <Suspense fallback={<div className="boot" aria-busy="true" />}>
        <Showcase />
      </Suspense>
    );
  else if (session.status !== "signed-in") body = <div className="boot boot-light" aria-busy="true" aria-label="Checking your session" />;
  else body = <Shell />;

  return (
    <TooltipProvider>
      <ToastProvider>{body}</ToastProvider>
    </TooltipProvider>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}
