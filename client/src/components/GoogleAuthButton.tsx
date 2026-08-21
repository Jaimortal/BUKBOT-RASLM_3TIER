import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface GoogleAuthButtonProps {
  onGoogleLogin?: (token: string, user: GoogleUser) => void;
  isLoading?: boolean;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

function decodeJwtPayload<T = any>(token: string): T {
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    throw new Error("Invalid token format");
  }

  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

export default function GoogleAuthButton({ onGoogleLogin, isLoading = false }: GoogleAuthButtonProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const hasHandledCallbackRef = useRef(false);

  // Handle the OAuth callback when the component mounts
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we're in the OAuth callback with a token in the hash or search params
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash
      );
      const searchParams = new URLSearchParams(
        window.location.search.startsWith('?')
          ? window.location.search.substring(1)
          : window.location.search
      );

      const oauthError = hashParams.get('error') || searchParams.get('error');
      const oauthErrorDescription =
        hashParams.get('error_description') || searchParams.get('error_description');

      if (oauthError) {
        if (hasHandledCallbackRef.current) return;
        hasHandledCallbackRef.current = true;
        toast({
          title: 'Google Login Failed',
          description: oauthErrorDescription || oauthError,
          variant: 'destructive',
        });

        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      const idToken = hashParams.get('id_token') || searchParams.get('id_token');
      
      if (!idToken) {
        return; // Don't throw error, just exit if no token
      }

      if (hasHandledCallbackRef.current) return;
      hasHandledCallbackRef.current = true;

      try {
        setIsGoogleLoading(true);

        // Clear the hash from the URL ASAP so the token is not left visible
        window.history.replaceState({}, document.title, window.location.pathname);

        // Decode the ID token to get user info
        const tokenPayload = decodeJwtPayload<any>(idToken);
        const user = {
          id: tokenPayload.sub,
          email: tokenPayload.email,
          name: tokenPayload.name,
          picture: tokenPayload.picture
        };

        // Send to backend for verification
        const requestPayload = {
          token: idToken,
          user,
        };

        const response = await fetch('/api/admin/google-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        let responseData: any = null;
        try {
          responseData = await response.json();
        } catch (jsonErr) {
          responseData = null;
        }

        if (response.ok) {
          const data = responseData;
          if (!data?.token) {
            throw new Error('Authentication failed: missing token from server');
          }
          
          // Store auth data
          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("adminAuthenticated", "true");
          localStorage.setItem("googleUser", JSON.stringify(user));
          if (data.user) {
            localStorage.setItem("adminUserData", JSON.stringify(data.user));
          } else {
            localStorage.setItem("adminUserData", JSON.stringify(user));
          }
          
          toast({
            title: "Login Successful",
            description: `Welcome, ${user.name}!`,
          });

          // Call the onGoogleLogin callback if provided
          if (onGoogleLogin) {
            onGoogleLogin(data.token, user);
          }

          // Redirect to AdminDashboard (actual route is /admin)
          window.location.href = '/admin';
        } else {
          const message =
            responseData?.message ||
            (response.status === 403
              ? 'User not authorized as admin'
              : response.status === 401
                ? 'Invalid or expired Google token'
                : `Authentication failed (HTTP ${response.status})`);
          throw new Error(message);
        }
      } catch (error) {
        console.error('Google auth error:', error);

        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("googleUser");

        toast({
          title: "Google Login Failed",
          description: error instanceof Error ? error.message : 'Authentication failed',
          variant: "destructive"
        });
        
        // Ensure hash is cleared even on error
        window.history.replaceState({}, document.title, window.location.pathname);
      } finally {
        setIsGoogleLoading(false);
      }
    };

    handleOAuthCallback();
  }, [onGoogleLogin]);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        toast({
          title: "Google Auth Error",
          description: "Google Client ID not configured",
          variant: "destructive"
        });
        return;
      }

      // Use admin login page as redirect so the component can capture the token
      const redirectUri = `${window.location.origin}/admin/login`;

      // Create OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=id_token&` +
        `scope=openid%20email%20profile&` +
        `prompt=select_account&` +
        `nonce=${Date.now()}`;

      // Redirect to Google OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Google Login Error",
        description: error instanceof Error ? error.message : 'Failed to initiate Google login',
        variant: "destructive"
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={isLoading || isGoogleLoading}
    >
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isGoogleLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}

// Simplified auth loading - no external scripts needed
export const loadGoogleAuth = () => {
  // Google Auth ready
};
