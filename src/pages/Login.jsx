import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = (e) => {
        e.preventDefault();
        navigate("/");
    };
    return (<div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4"/> Back to Home
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <img src={logo} alt="Hangout Tourist" className="h-10 w-10"/>
            <span className="font-heading text-2xl font-bold text-foreground">
              Hangout <span className="text-gradient-primary">Tourist</span>
            </span>
          </div>

          <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {isSignUp ? "Sign up to start your journey" : "Sign in to access your bookings"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (<div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input id="name" placeholder="John Doe" className="bg-muted pl-10"/>
                </div>
              </div>)}

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input id="email" type="email" placeholder="you@email.com" className="bg-muted pl-10"/>
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="bg-muted pl-10 pr-10"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>

            {!isSignUp && (<div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-primary"/> Remember me
                </label>
                <a href="#" className="text-sm text-primary hover:underline">Forgot Password?</a>
              </div>)}

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Admin Panel →
            </Link>
          </div>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-primary p-12">
        <div className="text-center text-primary-foreground">
          <h2 className="mb-4 font-heading text-4xl font-bold">Explore the World</h2>
          <p className="text-lg opacity-80">Book flights, hotels, and holiday packages at the best prices.</p>
        </div>
      </div>
    </div>);
};
export default Login;
