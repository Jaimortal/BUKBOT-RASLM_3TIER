import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Lock,
  Mail,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  SlidersHorizontal,
  Activity,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GoogleAuthButton, { loadGoogleAuth } from "@/components/GoogleAuthButton";
import {
  fetchSignupSettingsApi,
  sendSignupOtpApi,
  registerPendingAdminApi,
} from "@/lib/adminApi";

export default function Login() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Sign-up form state
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [signupStep, setSignupStep] = useState<"details" | "otp" | "success">("details");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadGoogleAuth();
    fetchSignupSettingsApi().then((res) => {
      setSignupEnabled(res.signupEnabled);
    });
  }, []);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleKeyModifiers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  // Password strength calculation
  const passwordChecks = {
    minLength: signupPassword.length >= 8,
    hasUpperAndLower: /[a-z]/.test(signupPassword) && /[A-Z]/.test(signupPassword),
    hasNumber: /\d/.test(signupPassword),
    hasSymbol: /[^A-Za-z0-9]/.test(signupPassword),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrengthLabel =
    signupPassword.length === 0
      ? "Enter a password"
      : passwordScore <= 1
      ? "Weak"
      : passwordScore <= 2
      ? "Fair"
      : passwordScore === 3
      ? "Good"
      : "Strong";

  const handleGoogleLogin = (_token: string, _user: any) => {
    // Handled inside GoogleAuthButton
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
        if (data.user) {
          localStorage.setItem("adminUserData", JSON.stringify(data.user));
        }

        toast({
          title: "Login Successful",
          description: "Welcome to the BukSU AI Admin Portal",
        });

        window.location.href = "/admin";
      } else {
        const errorData = await response.json();
        if (errorData.locked && errorData.remainingTime) {
          toast({
            title: "Account Locked",
            description: `Too many failed attempts. Please try again in ${errorData.remainingTime} minutes.`,
            variant: "destructive",
          });
        } else {
          const msg = errorData.message || "Invalid credentials";
          toast({
            title: msg.toLowerCase().includes("disabled by the main-admin")
              ? "Account Disabled"
              : msg.includes("Wait for the main admin")
              ? "Pending Main-Admin Approval"
              : "Login Failed",
            description: msg,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Please check your network connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      toast({
        title: "Missing Information",
        description: "Please complete all fields.",
        variant: "destructive",
      });
      return;
    }
    if (signupPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res: any = await sendSignupOtpApi(signupEmail.trim());
      if (res.success) {
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(res.resendAvailableInSeconds || 30);
        setSignupStep("otp");
        toast({
          title: "Verification Code Sent",
          description:
            res.message || "Please check your email inbox for the 6-digit verification code.",
        });
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        if (typeof res.retryAfterSeconds === "number" && res.retryAfterSeconds > 0) {
          setResendCooldown(res.retryAfterSeconds);
        }
        toast({
          title: "Sign-Up Error",
          description: res.message || "Failed to send verification code.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Sign-Up Error",
        description: err?.message || "Failed to send verification code.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Handle multi-digit input or autofill inside a single box
    if (cleaned.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 && index + i < 6 && i < cleaned.length; i++) {
        next[index + i] = cleaned[i];
      }
      setOtpDigits(next);
      const focusTarget = Math.min(5, index + cleaned.length);
      otpInputRefs.current[focusTarget]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = "";
      setOtpDigits(next);
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    const focusIndex = Math.min(5, pasted.length);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const fullOtpCode = otpDigits.join("");

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullOtpCode.length < 6) {
      toast({
        title: "Incomplete Verification Code",
        description: "Please enter all 6 digits of your verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const res: any = await registerPendingAdminApi({
        name: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        code: fullOtpCode,
      });

      if (res.success) {
        setSignupStep("success");
        toast({
          title: "Registration Submitted",
          description:
            res.message ||
            "Wait for the main admin to allow your sign in, as of now always check your email",
        });
      } else {
        const msg = res.message || "Invalid verification code or registration error.";
        toast({
          title: "Verification Failed",
          description: msg,
          variant: "destructive",
        });
        if (res.attemptsRemaining === 0 || msg.toLowerCase().includes("request a new code")) {
          setOtpDigits(["", "", "", "", "", ""]);
          otpInputRefs.current[0]?.focus();
        }
      }
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err?.message || "Registration failed.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const resetSignupForm = () => {
    setAuthMode("login");
    setSignupStep("details");
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupConfirmPassword("");
    setOtpDigits(["", "", "", "", "", ""]);
  };

  const currentStepNumber = signupStep === "details" ? 1 : signupStep === "otp" ? 2 : 3;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Subtle BukSU Navy & Amber Ambient Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-36 -left-36 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #001C38 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-36 -right-36 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #0356a9 0%, transparent 70%)" }}
        />
      </div>

      {/* Main Split Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl ring-1 ring-[#001C38]/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        {/* LEFT COLUMN: BukSU Brand & Security Overview Panel */}
        <div
          className="lg:col-span-5 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #001C38 0%, #022b54 55%, #0356a9 100%)" }}
        >
          {/* Decorative geometric rings */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full border border-amber-400/15 pointer-events-none" />

          <div className="relative z-10">
            {/* Top Brand Header */}
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs ring-1 ring-white/20 shrink-0 shadow-md">
                <img
                  src="/LOGO.png"
                  alt="BukSU Logo"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Admin Portal
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-1">
                  BukSU AI Assistant
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  Bukidnon State University
                </p>
              </div>
            </div>

            {/* Hero Copy (hidden on very small mobile to keep form prominent, visible on sm+) */}
            <div className="mt-6 lg:mt-10 space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold leading-snug text-white">
                {authMode === "login"
                  ? "Unified Knowledge & Access Control Center"
                  : "Request Administrator Portal Credentials"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                {authMode === "login"
                  ? "Manage multi-language campus responses, campus location pins & directional route maps, and granular role-based rules with full audit traceability."
                  : "All new registrations undergo email OTP verification and Main Administrator rule assignment before sign-in access is activated."}
              </p>
            </div>

            {/* Feature Pillars */}
            <div className="hidden sm:grid grid-cols-1 gap-3 mt-7">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/6 border border-white/10 backdrop-blur-2xs">
                <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 shrink-0 mt-0.5">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Granular RBAC & Rule Filters
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    Fine-grained navigation, sub-tab, and modal permissions tailored per administrator.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/6 border border-white/10 backdrop-blur-2xs">
                <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 shrink-0 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Multi-Step Account Verification
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    Protected by email OTP verification, Main-Admin approval, and instant session revocation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/6 border border-white/10 backdrop-blur-2xs">
                <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 shrink-0 mt-0.5">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Complete Security Audit Trail
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    Every rule change, sign-up approval, and login event is recorded for accountability.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="hidden lg:flex items-center justify-end pt-6 mt-8 border-t border-white/15 text-[11px] text-slate-300 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Protected Admin Portal
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication / Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto space-y-6">
            {/* Top Mode Header & Switcher */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#001C38] tracking-tight">
                    {authMode === "login"
                      ? "Administrator Sign In"
                      : signupStep === "success"
                      ? "Registration Submitted"
                      : "Request Admin Access"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {authMode === "login"
                      ? "Enter your authorized credentials to access the dashboard"
                      : "New accounts are assigned the Admin role upon Main-Admin approval"}
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs (Sign In vs Request Access) */}
              {signupStep !== "success" && (
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                    }}
                    className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMode === "login"
                        ? "bg-[#001C38] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Lock className={`h-3.5 w-3.5 ${authMode === "login" ? "text-amber-400" : "text-slate-400"}`} />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!signupEnabled) return;
                      setAuthMode("signup");
                    }}
                    disabled={!signupEnabled}
                    title={
                      !signupEnabled
                        ? "Sign-up is currently disabled by the Main Administrator"
                        : "Request a new administrator account"
                    }
                    className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      !signupEnabled
                        ? "text-slate-400 cursor-not-allowed opacity-60"
                        : authMode === "signup"
                        ? "bg-[#001C38] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <User className={`h-3.5 w-3.5 ${authMode === "signup" ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{signupEnabled ? "Request Access" : "Sign-Up Closed"}</span>
                  </button>
                </div>
              )}

              {/* Closed Sign-Up Notice */}
              {!signupEnabled && authMode === "login" && (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[#001C38] shrink-0" />
                  <span>
                    New administrator sign-up requests are currently disabled by the Main Administrator.
                  </span>
                </div>
              )}
            </div>

            {/* ==================== SIGN-IN MODE ==================== */}
            {authMode === "login" && (
              <div className="space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs font-bold text-slate-700">
                      Administrator Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin@buksu.edu.ph"
                        required
                        disabled={isLoading}
                        autoComplete="username"
                        className="h-11 pl-10 pr-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] focus:ring-2 focus:ring-[#001C38]/15 text-sm transition-all"
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                        Password
                      </Label>
                      {capsLockOn && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Caps Lock is ON
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={handleKeyModifiers}
                        onKeyDown={handleKeyModifiers}
                        placeholder="••••••••••••"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                        className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] focus:ring-2 focus:ring-[#001C38]/15 text-sm transition-all"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001C38] transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-white mt-1"
                    style={{ background: "linear-gradient(135deg, #001C38 0%, #0356a9 100%)" }}
                    disabled={isLoading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/80 border-t-white rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-amber-400" />
                          <span>Sign In to Admin Portal</span>
                        </>
                      )}
                    </span>
                  </Button>
                </form>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-slate-400 font-semibold">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div>
                  <GoogleAuthButton
                    onGoogleLogin={handleGoogleLogin}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {/* ==================== SIGN-UP MODE ==================== */}
            {authMode === "signup" && (
              <div className="space-y-5">
                {/* 3-Step Progress Indicator */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { step: 1, label: "1. Details" },
                    { step: 2, label: "2. Verify Email" },
                    { step: 3, label: "3. Approval" },
                  ].map((item) => {
                    const isActive = currentStepNumber === item.step;
                    const isCompleted = currentStepNumber > item.step;
                    return (
                      <div key={item.step} className="space-y-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCompleted
                              ? "bg-emerald-500"
                              : isActive
                              ? "bg-[#001C38]"
                              : "bg-slate-200"
                          }`}
                        />
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          {isCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span
                              className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                                isActive
                                  ? "bg-[#001C38] text-amber-400"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {item.step}
                            </span>
                          )}
                          <span
                            className={
                              isActive
                                ? "text-[#001C38]"
                                : isCompleted
                                ? "text-emerald-700"
                                : "text-slate-400"
                            }
                          >
                            {item.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* STEP 1: ACCOUNT DETAILS */}
                {signupStep === "details" && (
                  <form onSubmit={handleSendSignupOtp} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="signupName" className="text-xs font-bold text-slate-700">
                        Full Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="signupName"
                          type="text"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          required
                          disabled={isSendingOtp}
                          className="h-10 pl-9 pr-3 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] text-sm"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signupEmail" className="text-xs font-bold text-slate-700">
                        Email Address <span className="text-slate-400 font-normal">(for OTP & notifications)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="signupEmail"
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="admin.user@buksu.edu.ph"
                          required
                          disabled={isSendingOtp}
                          className="h-10 pl-9 pr-3 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] text-sm"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="signupPassword" className="text-xs font-bold text-slate-700">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signupPassword"
                            type={showSignupPassword ? "text" : "password"}
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="Min. 8 chars"
                            required
                            disabled={isSendingOtp}
                            className="h-10 pl-9 pr-9 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] text-sm"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword((prev) => !prev)}
                            tabIndex={-1}
                            aria-label={showSignupPassword ? "Hide password" : "Show password"}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001C38]"
                          >
                            {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="signupConfirmPassword" className="text-xs font-bold text-slate-700">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signupConfirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            required
                            disabled={isSendingOtp}
                            className="h-10 pl-9 pr-9 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#001C38] text-sm"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            tabIndex={-1}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001C38]"
                          >
                            {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Indicator & Checklist */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">Password Strength</span>
                        <span
                          className={`font-bold ${
                            passwordScore <= 1
                              ? "text-red-600"
                              : passwordScore === 2
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {passwordStrengthLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 rounded-full transition-all ${
                              passwordScore >= level
                                ? passwordScore <= 1
                                  ? "bg-red-500"
                                  : passwordScore === 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
                        {[
                          { ok: passwordChecks.minLength, text: "8+ characters" },
                          { ok: passwordChecks.hasUpperAndLower, text: "Upper & lowercase" },
                          { ok: passwordChecks.hasNumber, text: "At least 1 number" },
                          {
                            ok:
                              signupConfirmPassword.length > 0 &&
                              signupPassword === signupConfirmPassword,
                            text: "Passwords match",
                          },
                        ].map((rule) => (
                          <div
                            key={rule.text}
                            className={`flex items-center gap-1 ${
                              rule.ok ? "text-emerald-700 font-semibold" : "text-slate-400"
                            }`}
                          >
                            <Check className={`h-3 w-3 shrink-0 ${rule.ok ? "text-emerald-600" : "text-slate-300"}`} />
                            <span>{rule.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-[#001C38] leading-relaxed">
                      <strong className="font-bold">Role Assignment Policy:</strong> New sign-ups are registered strictly as <strong>Admin</strong> accounts (never Main-Admin) and require Main Administrator rule confirmation before sign-in.
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-bold rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                      style={{ background: "linear-gradient(135deg, #001C38 0%, #0356a9 100%)" }}
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/80 border-t-white rounded-full animate-spin" />
                          <span>Sending Verification Code...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-amber-400" />
                          <span>Send 6-Digit Verification Code</span>
                        </span>
                      )}
                    </Button>
                  </form>
                )}

                {/* STEP 2: 6-BOX SEGMENTED OTP VERIFICATION */}
                {signupStep === "otp" && (
                  <form onSubmit={handleCompleteRegistration} className="space-y-4">
                    <div className="text-center space-y-1.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#001C38] text-amber-400 mx-auto flex items-center justify-center shadow-sm">
                        <KeyRound className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-[#001C38] text-base">
                        Verify Your Email Address
                      </h3>
                      <p className="text-xs text-slate-500">
                        Enter the 6-digit code sent to{" "}
                        <strong className="text-slate-800 font-semibold">{signupEmail}</strong>
                      </p>
                    </div>

                    {/* Email Inbox Reminder */}
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[#001C38] text-xs flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-[#001C38] shrink-0" />
                      <span>
                        Please check your email inbox (and Spam/Promotions folder) for the 6-digit verification code.
                      </span>
                    </div>

                    {/* 6-Box OTP Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 block text-center">
                        6-Digit Verification Code
                      </Label>
                      <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={idx === 0 ? "one-time-code" : "off"}
                            maxLength={6}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            disabled={isRegistering}
                            aria-label={`Verification code digit ${idx + 1}`}
                            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-extrabold font-mono rounded-xl border-2 transition-all outline-hidden ${
                              digit
                                ? "border-[#001C38] bg-blue-50/30 text-[#001C38] ring-2 ring-[#001C38]/10"
                                : "border-slate-200 bg-slate-50 text-slate-900 focus:border-[#001C38] focus:bg-white focus:ring-2 focus:ring-[#001C38]/15"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep("details");
                        }}
                        className="text-slate-600 hover:text-[#001C38] flex items-center gap-1 font-semibold"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Change Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendSignupOtp()}
                        disabled={isSendingOtp || resendCooldown > 0}
                        className={`font-bold flex items-center gap-1 ${
                          resendCooldown > 0 || isSendingOtp
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-[#001C38] hover:underline"
                        }`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSendingOtp ? "animate-spin" : ""}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend Code"}
                        </span>
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-bold rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                      style={{ background: "linear-gradient(135deg, #001C38 0%, #0356a9 100%)" }}
                      disabled={isRegistering || fullOtpCode.length < 6}
                    >
                      {isRegistering ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/80 border-t-white rounded-full animate-spin" />
                          <span>Completing Registration...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-amber-400" />
                          <span>Verify & Submit Registration</span>
                        </span>
                      )}
                    </Button>
                  </form>
                )}

                {/* STEP 3: PENDING MAIN-ADMIN APPROVAL */}
                {signupStep === "success" && (
                  <div className="text-center py-2 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#001C38] text-amber-400 mx-auto flex items-center justify-center shadow-md">
                      <Shield className="h-8 w-8" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#001C38] tracking-tight">
                        Email Verified • Awaiting Approval
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Admin request submitted for{" "}
                        <strong className="text-slate-800">{signupEmail}</strong>
                      </p>
                    </div>

                    {/* Verbatim required message */}
                    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs text-left leading-relaxed shadow-2xs">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-1">
                            Status Notification
                          </p>
                          <p className="font-bold text-sm text-amber-950">
                            "Wait for the main admin to allow your sign in, as of now always check your email"
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      A confirmation email has also been sent to your inbox. Once the Main Administrator configures your permissions and approves your account, you will receive an acceptance email.
                    </p>

                    <Button
                      type="button"
                      onClick={resetSignupForm}
                      className="w-full h-11 text-xs font-bold rounded-xl text-white shadow-sm"
                      style={{ background: "linear-gradient(135deg, #001C38 0%, #0356a9 100%)" }}
                    >
                      Return to Sign In
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}