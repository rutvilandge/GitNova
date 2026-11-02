import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./styles/app.css";

const Landing = lazy(() => import("./pages/landing/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));

function PageLoading() {
  return (
    <main className="page-loading" role="status">
      Opening GITNOVA…
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="*"
            element={
              <main className="not-found">
                <p>That page drifted beyond the repository.</p>
                <Link to="/">Back to GITNOVA</Link>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
