import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLoginMutation } from "@/store/authApi";
import logoImg from "@assets/HIgher_taste_logo_1771483400145.png";

import { toast } from "sonner";

const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error("Please fill in both email and password");
    }

    try {
      await login({ email, password }).unwrap();
      toast.success("Welcome back! Redirecting...");
      setLocation("/");
    } catch (err: any) {
      const message = err.data?.message || err.error || "Invalid username or password";
      toast.error(message);
    }
  };



  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-[1000px] px-4 md:px-6 py-8"
      >
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row min-h-[600px]">
              
              {/* Left Side - Illustration/Gradient Panel */}
              <div className="hidden md:flex md:w-[45%] bg-primary relative p-12 flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
                
                {/* Decorative circles */}
                <div className="absolute top-[20%] right-[-20%] w-[300px] h-[300px] rounded-full border border-white/10" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] rounded-full bg-white/5" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <img src={logoImg} alt="Satvata Foods" className="h-10 w-auto bg-white rounded p-1" />
                    <div className="text-white">
                      <p className="font-bold text-xl leading-tight">Satvata</p>
                      <p className="font-medium text-white/70">Foods</p>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                    Internal Catering Operations Hub
                  </h2>
                  <p className="text-white/80 text-lg leading-relaxed">
                    Streamline your catering processes, manage orders, and deliver exceptional service with our centralized management system.
                  </p>
                </div>

                <div className="relative z-10">
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                    <p className="text-white/90 text-sm italic">
                      "Excellence in every serving, precision in every order."
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                <div className="mb-10 block md:hidden">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={logoImg} alt="Satvata Foods" className="h-8 w-auto bg-primary rounded p-1" />
                    <h1 className="text-2xl font-bold text-primary">The Satvata Foods</h1>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h3>
                  <p className="text-muted-foreground">Please enter your credentials to access your account.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email Address</Label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
                        <Mail size={18} />
                      </div>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="arjun@satvatafoods.com" 
                        className="pl-10 h-12 bg-white border-muted focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
                        <Lock size={18} />
                      </div>
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="pl-10 pr-10 h-12 bg-white border-muted focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                      disabled={isLoginLoading}
                    >
                      {isLoginLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          Login to Dashboard
                          <ArrowRight size={18} />
                        </div>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-muted text-center">
                  <p className="text-muted-foreground text-sm">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary font-bold hover:underline inline-flex items-center gap-1 group">
                      Sign up now
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 flex justify-center gap-6 text-muted-foreground/60 text-xs font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Support</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
