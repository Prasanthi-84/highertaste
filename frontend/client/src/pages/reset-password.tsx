import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, KeyRound, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useResetPasswordMutation } from "@/store/authApi";
import logoImg from "@assets/HIgher_taste_logo_1771483400145.png";
import { toast } from "sonner";

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [done, setDone]                       = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return toast.error("Invalid reset link — token missing");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    try {
      // token is read from URL, sent in request BODY (not URL param)
      const res = await resetPassword({ token, password: newPassword }).unwrap();
      toast.success(res.message || "Password reset successfully!");
      setDone(true);
    } catch (err: any) {
      toast.error(
        err.data?.message || "Failed to reset password. The link may have expired."
      );
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground text-sm mb-6">This reset link is malformed or missing a token.</p>
          <Button onClick={() => setLocation("/forgot-password")} className="bg-primary text-white rounded-xl">
            Request New Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-4"
      >
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-10">

            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <img src={logoImg} alt="Satvata Foods" className="h-9 w-auto bg-primary rounded p-1" />
              <div>
                <p className="font-bold text-primary text-base leading-tight">The Satvata Foods</p>
                <p className="text-muted-foreground text-xs">Catering Ops Hub</p>
              </div>
            </div>

            {!done ? (
              <>
                {/* Heading */}
                <div className="mb-7">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Set New Password</h2>
                  <p className="text-muted-foreground text-sm">
                    Choose a strong password for the admin account.
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-semibold text-foreground/70 tracking-wider uppercase">
                      New Password
                    </Label>
                    <div className="relative group">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="new-password"
                        type={showNew ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9 pr-10 h-11 bg-white border-muted focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl text-sm"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground/70 tracking-wider uppercase">
                      Confirm Password
                    </Label>
                    <div className="relative group">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-9 pr-10 h-11 bg-white border-muted focus-visible:ring-primary/20 transition-all rounded-xl text-sm ${
                          passwordsMismatch ? "border-red-400 focus-visible:border-red-400" :
                          passwordsMatch    ? "border-emerald-400 focus-visible:border-emerald-400" : ""
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Inline match indicator */}
                    {confirmPassword.length > 0 && (
                      <p className={`text-xs font-semibold ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                        {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2"
                    disabled={isLoading || passwordsMismatch}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Reset Password
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              /* ── Success State ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-4"
              >
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Password Updated!
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  Your admin password has been reset successfully.
                  You can now log in with your new credentials.
                </p>
                <Button
                  onClick={() => setLocation("/auth")}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                >
                  Go to Login
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </motion.div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
