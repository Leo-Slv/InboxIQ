'use client'
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { NavMenu } from "@/components/nav-menu";
import { NavigationSheet } from "@/components/navigation-sheet";
import { ArrowUpRight, Mail } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="h-16 bg-background border-b">
      <div className="h-full flex items-center justify-between max-w-(--breakpoint-lg) mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">InboxIQ</h1>
          </div>

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              document
                .getElementById("get-started")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Get Started <ArrowUpRight />
          </Button>


          {/* Mobile Menu */}
          <div className="md:hidden">
            <NavigationSheet />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
