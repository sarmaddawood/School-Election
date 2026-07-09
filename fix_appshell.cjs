const fs = require('fs');

const content = fs.readFileSync('src/components/AppShell.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(line => line.includes('  return ('));

const before = lines.slice(0, startIndex).join('\n');

// the before part has the useEffect issue. Let's fix that.
// The before currently ends at line 59: window.addEventListener("resize", handleResize);
// We need to close the useEffect and add navItems.

const newBefore = `import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Vote,
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Award,
  Users,
  BarChart3,
  LogOut,
  User,
  Key,
  ChevronDown,
} from "lucide-react";
import { User as UserType } from "../types";
import ConfirmModal from "./ConfirmModal";
// @ts-ignore
import schoolElectionLogo from "../assets/images/school_election_logo_1783276555365.jpg";

interface AppShellProps {
  user: UserType;
  onLogout: () => void;
  token: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
}

export default function AppShell({
  user,
  onLogout,
  token,
  activeTab,
  onTabChange,
  children,
  setErrorNotification,
  setSuccessNotification,
}: AppShellProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 880);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const isThemeLight = false;

  useEffect(() => {
    document.body.className = "theme-light";
    localStorage.setItem("ui-theme", "light");
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 880);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems =
    user.role === "admin"
      ? [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "elections", label: "Elections", icon: Calendar },
          { id: "positions", label: "Positions", icon: Award },
          { id: "candidates", label: "Candidates", icon: Users },
          { id: "users", label: "Users Registry", icon: User },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ]
      : user.role === "teacher"
      ? [
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ]
      : [
          { id: "vote", label: "Cast Ballot", icon: Vote },
          { id: "results", label: "Results Board", icon: BarChart3 },
          { id: "calendar", label: "Election Calendar", icon: CalendarDays },
        ];
`;

const renderContent = lines.slice(startIndex).join('\n');

fs.writeFileSync('src/components/AppShell.tsx', newBefore + '\n' + renderContent);
