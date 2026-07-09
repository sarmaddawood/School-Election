import re

with open('src/components/AppShell.tsx', 'r') as f:
    content = f.read()

# I need to rewrite the `return (...)` of AppShell.

replacement = """
  return (
    <div className="h-screen w-screen overflow-hidden grid md:grid-cols-[280px_1fr] md:grid-rows-[1fr_auto] bg-[var(--bg)] text-[var(--ink)] font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex justify-between items-center p-4 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <img src={bolinaoLogo} alt="Logo" className="w-8 h-8 rounded bg-white object-contain" />
          <div className="font-display text-sm font-bold uppercase">BSF E-Voting</div>
        </div>
        <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-8 h-8 rounded bg-[rgba(255,255,255,0.05)] text-xs border border-[var(--border)]">
          {user.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
        </button>
      </div>

      <aside className="hidden md:flex row-span-2 bg-[var(--surface)] border-r border-[var(--border)] flex-col p-8">
        <div className="mb-12">
            <div className="w-[50px] h-[50px] bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img src={bolinaoLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="font-display text-base uppercase leading-none tracking-tight">
                Bolinao School<br/>of Fisheries
            </div>
            <span className="font-mono text-[0.6rem] text-[var(--accent)] uppercase tracking-widest mt-2 block">
                E-Voting Portal
            </span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-4 py-3 text-[0.7rem] font-mono uppercase tracking-wider rounded transition-all cursor-pointer border-none text-left ${
                  isActive ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                }`}
              >
                <item.icon size={16} className={isActive ? "opacity-100" : "opacity-60"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 bg-black/20 rounded relative">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="w-8 h-8 bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-bold text-[0.7rem]">
                    {user.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
                </div>
                <div className="text-[0.7rem]">
                    <p className="font-semibold uppercase truncate max-w-[120px]">{user.fullName}</p>
                    <p className="opacity-40 uppercase">{user.role}</p>
                </div>
            </div>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded p-2 z-50 shadow-2xl"
                >
                  <button
                    onClick={() => {
                      onTabChange("password");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Key size={13} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </aside>

      <main className="p-4 md:p-10 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(0,255,170,0.03),transparent)] relative">
        <header className="hidden md:flex justify-between items-end mb-12">
            <div>
                <span className="font-mono text-[0.65rem] text-[var(--accent)] opacity-80 mb-2 block">TELEMETRY_MAIN_00</span>
                <h2 className="font-display text-4xl uppercase leading-none tracking-tight">ADMINISTRATION<br/>TELEMETRY</h2>
                <p className="text-sm opacity-50 max-w-[400px] mt-4">Real-time status updates, polling metrics, and registry logs across the centralized BSF system.</p>
            </div>
            <div className="font-mono text-[0.7rem] text-[var(--accent)]">
                SYSTEM_STABLE // 2.4 MS
            </div>
        </header>

        {children}
      </main>

      <footer className="hidden md:flex md:col-start-2 px-10 py-4 border-t border-[var(--border)] font-mono text-[0.6rem] opacity-40 justify-between">
        <span>© 2026 BOLINAO SCHOOL OF FISHERIES</span>
        <span>SECURITY PROTOCOL: v4.1.2_SECURE</span>
      </footer>

      {/* Mobile Bottom Nav */}
      <AnimatePresence>
        {isMobile && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border)] flex flex-wrap justify-center gap-1 p-2 z-40">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 text-[8px] font-mono uppercase tracking-widest cursor-pointer transition-all ${
                    isActive ? "text-[var(--accent)] bg-[var(--accent-soft)] rounded" : "text-[rgba(255,255,255,0.45)] hover:text-white"
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={onLogout}
      />
    </div>
  );
}
"""

content = re.sub(r'return \(\s*<div className="min-h-\[100dvh\].*?\);\s*}', replacement, content, flags=re.DOTALL)

with open('src/components/AppShell.tsx', 'w') as f:
    f.write(content)

print("Done")
