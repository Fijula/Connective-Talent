import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Users, Zap, Brain, Shield, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    await signIn(data.email, data.password);
    setIsLoading(false);
  };

  const onSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    await signUp(data.email, data.password, data.firstName, data.lastName);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Matching',
      description: 'Advanced semantic search and intelligent talent-to-opportunity matching with 95% accuracy',
      color: 'from-purple-500/20 to-blue-500/20',
      iconColor: 'text-purple-500'
    },
    {
      icon: Users,
      title: 'Multi-Role Excellence',
      description: 'Comprehensive support for Engineers, Designers, PMs, QA, and Data Scientists with role-specific KPIs',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500'
    },
    {
      icon: Zap,
      title: 'Real-Time Intelligence',
      description: 'Live utilization dashboards, predictive roll-off alerts, and automated bench management',
      color: 'from-cyan-500/20 to-green-500/20',
      iconColor: 'text-cyan-500'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Domain-restricted access, role-based permissions, and SOC2 compliant data protection',
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500'
    },
    {
      icon: Sparkles,
      title: 'AI Voice Assistant',
      description: 'Natural language queries, voice commands, and intelligent guided walkthroughs',
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-500'
    }
  ];

  const benefits = [
    "95% faster talent matching",
    "60% reduction in bench time",
    "Real-time utilization tracking",
    "Automated skill taxonomy",
    "Predictive analytics dashboard"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Enhanced background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-accent/5 to-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen">
          {/* Left Side - Enhanced Branding */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-6xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent leading-tight tracking-tight">
                    TalentFlow
                  </h1>
                </div>
                <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed font-medium">
                  The breakthrough platform for <span className="text-primary font-semibold">AI-powered talent matching</span> and next-generation workforce optimization
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-card/60 backdrop-blur-sm border border-border/40"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-card-foreground">{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  className={`group relative p-6 rounded-xl bg-gradient-to-br ${feature.color} backdrop-blur-sm border border-border/40 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/20`}>
                      <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-card-foreground mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Enhanced Auth Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <Card className="w-full max-w-md backdrop-blur-xl bg-card/90 border border-border/60 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500">
              <CardHeader className="space-y-2 text-center pb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {isSignUp ? 'Join TalentFlow' : 'Welcome Back'}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {isSignUp
                      ? 'Start optimizing your talent management with AI-powered insights'
                      : 'Sign in to access your intelligent talent dashboard'
                    }
                  </CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 group"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                    )}
                    Continue with Google
                  </Button>
                </motion.div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with email</span>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  {isSignUp ? (
                    <Form {...signUpForm}>
                      <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={signUpForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={signUpForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={signUpForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@company.com" type="email" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signUpForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Password</FormLabel>
                              <FormControl>
                                <Input placeholder="••••••••" type="password" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Create Account
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...signInForm}>
                      <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                        <FormField
                          control={signInForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@company.com" type="email" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signInForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Password</FormLabel>
                              <FormControl>
                                <Input placeholder="••••••••" type="password" className="h-11 border-border/60 focus:border-primary/60 transition-colors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="text-center text-sm"
                >
                  <span className="text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </span>{' '}
                  <button
                    type="button"
                    className="text-primary hover:text-secondary font-medium transition-colors duration-200 hover:underline"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;