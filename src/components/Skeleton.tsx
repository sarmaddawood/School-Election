import React from "react";
import { motion } from "motion/react";

// Generic Pulse Wrapper
interface SkeletonPulseProps {
  className?: string;
  children?: React.ReactNode;
}

export function SkeletonPulse({ className = "", children }: SkeletonPulseProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children || <div className="w-full h-full bg-white/8 rounded-xl" />}
    </div>
  );
}

// Single Card Skeleton
export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <SkeletonPulse className="h-4 w-1/2 rounded-md" />
          <SkeletonPulse className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <SkeletonPulse className="h-3 w-full rounded-md" />
        <SkeletonPulse className="h-3 w-5/6 rounded-md" />
      </div>
    </div>
  );
}

// Stats Skeleton (for dashboard number cards)
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <SkeletonPulse className="h-8 w-8 rounded-lg" />
            <SkeletonPulse className="h-4 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <SkeletonPulse className="h-7 w-2/3 rounded-lg" />
            <SkeletonPulse className="h-3.5 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table / Directory Skeleton
export function TableSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-5">
      <div className="flex justify-between items-center pb-3 border-b border-white/5">
        <SkeletonPulse className="h-5 w-32 rounded-lg" />
        <SkeletonPulse className="h-8 w-48 rounded-xl" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3 flex-1">
              <SkeletonPulse className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1 max-w-[150px]">
                <SkeletonPulse className="h-3 w-full rounded-md" />
                <SkeletonPulse className="h-2 w-2/3 rounded-md" />
              </div>
            </div>
            <div className="flex-1 max-w-[100px] hidden sm:block">
              <SkeletonPulse className="h-3 w-20 rounded-md" />
            </div>
            <div className="flex-1 max-w-[80px] hidden sm:block">
              <SkeletonPulse className="h-4 w-14 rounded-full" />
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-end">
              <SkeletonPulse className="h-6 w-6 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Podium / Results Skeleton
export function PodiumSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="border-b border-white/5 pb-4 flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonPulse className="h-5 w-40 rounded-lg" />
          <SkeletonPulse className="h-3 w-56 rounded-md" />
        </div>
        <SkeletonPulse className="h-6 w-28 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        {/* Podium columns skeleton */}
        <div className="md:col-span-5 flex justify-center pt-8">
          <div className="flex items-end justify-center w-full max-w-xs gap-3">
            {/* 2nd place skeleton */}
            <div className="flex flex-col items-center w-1/3 space-y-2">
              <SkeletonPulse className="h-8 w-8 rounded-full" />
              <SkeletonPulse className="h-3 w-12 rounded-md" />
              <SkeletonPulse className="h-3 w-8 rounded-md" />
              <SkeletonPulse className="h-24 w-full rounded-t-xl" />
            </div>

            {/* 1st place skeleton */}
            <div className="flex flex-col items-center w-1/3 space-y-2">
              <SkeletonPulse className="h-5 w-5 rounded-md" />
              <SkeletonPulse className="h-10 w-10 rounded-full animate-bounce" />
              <SkeletonPulse className="h-3.5 w-14 rounded-md" />
              <SkeletonPulse className="h-3.5 w-10 rounded-md" />
              <SkeletonPulse className="h-36 w-full rounded-t-xl" />
            </div>

            {/* 3rd place skeleton */}
            <div className="flex flex-col items-center w-1/3 space-y-2">
              <SkeletonPulse className="h-8 w-8 rounded-full" />
              <SkeletonPulse className="h-3 w-12 rounded-md" />
              <SkeletonPulse className="h-3 w-8 rounded-md" />
              <SkeletonPulse className="h-16 w-full rounded-t-xl" />
            </div>
          </div>
        </div>

        {/* Bars list visualizer skeleton */}
        <div className="md:col-span-7 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <SkeletonPulse className="h-3 w-28 rounded-md" />
                <SkeletonPulse className="h-3 w-20 rounded-md" />
              </div>
              <SkeletonPulse className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Candidate Grid / Ballot Selection Skeleton
export function CandidateVoteGridSkeleton() {
  return (
    <div className="space-y-8">
      {/* Position Header Placeholder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-5 w-5 rounded-md" />
            <SkeletonPulse className="h-5 w-36 rounded-md" />
          </div>
          <SkeletonPulse className="h-5 w-24 rounded-full" />
        </div>

        {/* Candidate Cards Grid Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-5 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <SkeletonPulse className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonPulse className="h-4 w-1/2 rounded-md" />
                    <SkeletonPulse className="h-2.5 w-1/3 rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <SkeletonPulse className="h-3 w-full rounded-md" />
                  <SkeletonPulse className="h-3 w-5/6 rounded-md" />
                </div>
              </div>
              <SkeletonPulse className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Master Dashboard Skeleton Page
export function DashboardSkeletonPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title block skeleton */}
      <div className="space-y-2">
        <SkeletonPulse className="h-7 w-56 rounded-lg" />
        <SkeletonPulse className="h-4 w-96 rounded-md" />
      </div>

      {/* Stats row */}
      <StatsSkeleton />

      {/* Main Content Sections split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Main activity chart card */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4 h-[320px]">
            <div className="flex justify-between items-center">
              <SkeletonPulse className="h-5 w-40 rounded-lg" />
              <SkeletonPulse className="h-4 w-20 rounded-md" />
            </div>
            <div className="w-full h-[220px] flex items-end gap-3 px-2 pt-4">
              {[20, 45, 30, 80, 55, 90, 40, 75, 60, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <SkeletonPulse
                    className="w-full rounded-t-md"
                    children={
                      <div
                        className="bg-white/8 animate-pulse rounded-t-md w-full"
                        style={{ height: `${h}%` }}
                      />
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <TableSkeleton />
        </div>

        {/* Sidebar content */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4">
            <SkeletonPulse className="h-5 w-32 rounded-lg" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-center">
                  <SkeletonPulse className="h-8 w-8 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonPulse className="h-3 w-2/3 rounded-md" />
                    <SkeletonPulse className="h-2 w-1/2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4">
            <SkeletonPulse className="h-5 w-36 rounded-lg" />
            <SkeletonPulse className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
