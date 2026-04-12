import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GoogleAuthButton, { loadGoogleAuth } from "@/components/GoogleAuthButton";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGoogleAuth();
  }, []);

  const handleGoogleLogin = (token: string, user: any) => {
    // no-op: GoogleAuthButton handles redirect after successful verification
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminAuthenticated", "true");
        
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard",
        });
        
        window.location.href = "/admin";
      } else {
        const errorData = await response.json();
        
        if (errorData.locked) {
          toast({
            title: "Account Locked",
            description: `Too many failed attempts. Please try again in ${errorData.remainingTime} minutes.`,
          });
        } else {
          toast({
            title: "Login Failed",
            description: errorData.message || "Invalid credentials",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background animation */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/50 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/50 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        {/* Enhanced header with gradient and glow */}
        <CardHeader className="text-center pb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 -m-4 rounded-2xl" />
          
          {/* Logo with hover animation */}
          <div className="mx-auto mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl group hover:scale-105 transition-all duration-300">
            <img 
              src="/LOGO.png" 
              alt="Logo" 
              className="w-24 h-24 mx-auto drop-shadow-lg group-hover:-translate-y-1 transition-transform duration-300"
            />
          </div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
            Admin Login
          </CardTitle>
          <CardDescription className="text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
            Securely access your admin dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username field */}
            <div className="space-y-2">
              <Label 
                htmlFor="username" 
                className="text-sm font-medium text-foreground"
              >
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 pr-4 border-2 border-border focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Password field */}
            <div className="space-y-2">
              <Label 
                htmlFor="password" 
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 pr-4 border-2 border-border focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Enhanced submit button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden text-white"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9)" }}
              disabled={isLoading}
            >
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/80 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Sign In Securely
                  </>
                )}
              </span>
            </Button>
          </form>
          
          {/* Enhanced divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-4 py-2 text-muted-foreground font-medium">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Google button with enhanced container */}
          <div className="pt-2">
            <GoogleAuthButton 
              onGoogleLogin={handleGoogleLogin}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}