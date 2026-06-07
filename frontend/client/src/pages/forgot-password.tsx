import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useForgotPasswordMutation } from "@/store/authApi";
import logoImg from "@assets/HIgher_taste_logo_1771483400145.png";
import { toast } from "sonner";

type View = "form" | "sent";

const ForgotPasswordPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const [view, setView]   = useState<View>("form");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address");

    try {
      const res = await forgotPassword({ email }).unwrap();
      // Show the success screen regardless of whether email matched
      // (server always returns generic message for security)
      toast.success(res.message || "Reset link sent!");
      setView("sent");
    } catch (err: any) {
      const msg = err.data?.message || "Something went wrong. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] relative overflow-hidden font-sans">
      {/* Background blobs */}
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

            <AnimatePresence mode="wait">

              {/* ── Form View ── */}
              {view === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Back link */}
                  <button
                    type="button"
                    onClick={() => setLocation("/auth")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-7 transition-colors"
                  >
                    <ArrowLeft size={15} />
                    Back to Login
                  </button>

                  {/* Icon + heading */}
                  <div className="mb-7">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Forgot Password?</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Enter the admin email address and we'll send a reset link to the recovery inbox.
                      The link expires in <strong>10 minutes</strong>.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email" className="text-xs font-semibold text-foreground/70 tracking-wider uppercase">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="mukunda@hkmvizag.org"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-11 bg-white border-muted focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl text-sm"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Send size={15} />
                          Send Reset Link
                        </span>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* ── Success View ── */}
              {view === "sent" && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-4"
                >
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Check Your Inbox</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                    If that email is registered, a reset link has been sent to the recovery inbox.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-8">
                    ⏰ Link expires in <strong>10 minutes</strong>. Check spam if you don't see it.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/auth")}
                    className="w-full h-11 rounded-xl border-primary/30 text-primary font-bold hover:bg-primary hover:text-white transition-all"
                  >
                    <ArrowLeft size={15} className="mr-2" />
                    Back to Login
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
