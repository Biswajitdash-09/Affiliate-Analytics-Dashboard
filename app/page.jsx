"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

export default function Home() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="navbar bg-base-100/80 backdrop-blur-md border-b border-base-200 fixed top-0 z-50 px-4 lg:px-8">
        <div className="flex-1">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <Icon name="BarChart2" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-base-content">
              Affiliate<span className="text-primary">Pro</span>
            </span>
          </Link>
        </div>
        <div className="flex-none gap-3 items-center">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm" className="font-bold shadow-lg shadow-primary/20">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero min-h-screen relative overflow-hidden pt-16">
        {/* Decorative Background Blobs */}
        <div className="absolute top-20 right-[-10%] w-150 h-150 bg-primary/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-150 h-150 bg-secondary/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }}></div>
        
        <div className="hero-content text-center z-10 px-4 max-w-5xl flex-col">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-base-200/60 border border-base-300 text-sm font-medium text-base-content/70 mb-8 hover:bg-base-200 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            v2.0 Platform Live
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-base-content mb-6 leading-tight">
            <span className="text-primary">Affiliate Marketing Dashboard</span>
          </h1>
          
          {/* Description */}
          <p className="py-6 text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto leading-relaxed">
            Track, manage, and optimize your affiliate marketing performance with real-time analytics. 
            Scale your growth with precision data and powerful insights.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 min-w-40 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                Sign In
              </Button>
            </Link>
            
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 min-w-40 text-lg font-bold hover:bg-base-200 hover:-translate-y-1 transition-all duration-300 bg-base-100"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Trust/Features Grid (Visual Enhancement) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Icon name="BarChart2" size={24} />
                </div>
                <h3 className="text-lg font-bold text-base-content">Real-time Analytics</h3>
                <p className="text-base-content/60 text-sm">Monitor clicks, conversions, and revenue as they happen with zero latency.</p>
              </div>
            </div>
            
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-2">
                  <Icon name="Users" size={24} />
                </div>
                <h3 className="text-lg font-bold text-base-content">Affiliate Management</h3>
                <p className="text-base-content/60 text-sm">Onboard partners, set commission rates, and track individual performance.</p>
              </div>
            </div>
            
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <Icon name="ShieldCheck" size={24} />
                </div>
                <h3 className="text-lg font-bold text-base-content">Secure Tracking</h3>
                <p className="text-base-content/60 text-sm">Advanced fraud detection and secure attribution for every click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer Simple */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content rounded-t-3xl mt-auto">
        <aside>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="BarChart2" size={24} className="text-primary" />
            <span className="font-bold text-xl">Affiliate Pro</span>
          </div>
          <p className="font-medium text-base-content/60">
            Empowering affiliate marketers since 2024.
          </p>
          <p className="text-xs text-base-content/40 mt-2">
            Copyright © {new Date().getFullYear()} - All right reserved
          </p>
        </aside>
      </footer>
    </div>
  );
}