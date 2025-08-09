"use client"
import { motion } from "framer-motion"
import { Brain, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle" // Import the ThemeToggle component
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function MainNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const handleDashboardRedirect = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${backendUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const dbUser = await res.json();
    if (dbUser.role === "CANDIDATE") {
      router.push("/candidate/dashboard");
    } else if (dbUser.role === "RECRUITER") {
      router.push("/dashboard");
    } else {
      router.push("/role-selection");
    }
  };

  const navItems = [
    { name: "Features", href: "/#features" },
    { name: "How it Works", href: "/#how-it-works" },
    { name: "Testimonials", href: "/#testimonials" },
    { name: "Pricing", href: "/pricing" },
  ]

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b z-50 dark:bg-gray-950/95 dark:border-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center dark:bg-white">
                <Brain className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Aptiview</span>{" "}
              {/* Updated name */}
            </Link>
          </motion.div>

          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item, index) => (
              <motion.a
                key={item.name}
                href={item.href}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm dark:text-gray-400 dark:hover:text-gray-50"
                whileHover={{ y: -1 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                {item.name}
              </motion.a>
            ))}
            <SignedIn>
              <motion.a
                href="#"
                onClick={handleDashboardRedirect}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm dark:text-gray-400 dark:hover:text-gray-50"
                whileHover={{ y: -1 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (navItems.length + 1) }}
              >
                Dashboard
              </motion.a>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-medium bg-transparent border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  size="sm"
                  className="bg-black hover:bg-gray-800 font-medium dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200 ml-2"
                >
                  Get Started
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <ThemeToggle />
          </div>

          <div className="flex items-center lg:hidden">
            <ThemeToggle /> {/* Add the ThemeToggle for mobile */}
            <button
              className="p-2 rounded-md hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 ml-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              ) : (
                <Menu className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-white border-t dark:bg-gray-950 dark:border-gray-800"
        >
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm dark:text-gray-400 dark:hover:text-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <SignedIn>
              <Link
                href="#"
                onClick={(e) => { handleDashboardRedirect(e); setMobileMenuOpen(false); }}
                className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm dark:text-gray-400 dark:hover:text-gray-50"
              >
                Dashboard
              </Link>
            </SignedIn>
            <Separator className="my-3 bg-gray-200 dark:bg-gray-700" />
            <div className="flex flex-col space-y-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button
                    size="sm"
                    className="bg-black hover:bg-gray-800 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
                  >
                    Get Started
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
