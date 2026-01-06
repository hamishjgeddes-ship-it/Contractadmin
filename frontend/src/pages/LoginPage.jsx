import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import axios from "axios";
import { API } from "../App";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        navigate("/dashboard", { replace: true });
      } catch {
        // Not authenticated, stay on login
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1645434926657-6b03be95310d')" }}
        role="img"
        aria-label="Construction site aerial view"
      >
        <div className="absolute inset-0 bg-slate-900/85"></div>
      </div>

      {/* Blueprint grid overlay */}
      <div className="absolute inset-0 blueprint-grid opacity-20"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
          <div className="max-w-lg">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 flex items-center justify-center">
                  <span className="font-heading font-bold text-white text-lg">M</span>
                </div>
                <span className="font-heading font-bold text-white text-xl tracking-tight">
                  Morrissey Law + Advisory
                </span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-4">
                Contract<br />Compliance<br />Portal
              </h1>
              <p className="text-slate-300 text-lg max-w-md">
                Secure client portal for construction contract administration. 
                Clear visibility. Defensible outputs. Controlled risks.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-orange-500"></div>
                <span>Project visibility & status tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-orange-500"></div>
                <span>Automated deadline management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-orange-500"></div>
                <span>Notice & document workflow</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-orange-500"></div>
                <span>Digital contract questionnaires</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full max-w-md flex items-center justify-center px-8 lg:px-16">
          <div className="w-full bg-white p-8 border border-slate-200">
            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-2">
              Sign In
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              Access your contract compliance portal
            </p>

            <Button
              data-testid="google-login-btn"
              onClick={handleLogin}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium tracking-wide uppercase text-xs rounded-sm transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <p className="mt-6 text-xs text-slate-400 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
