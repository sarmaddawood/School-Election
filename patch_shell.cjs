const fs = require('fs');

const content = fs.readFileSync('src/components/AppShell.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(line => line.includes('return ('));

const before = lines.slice(0, startIndex).join('\n');

const newRender = `  return (
    <div className="min-h-[100dvh] flex flex-col text-zinc-900 relative bg-white">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 md:px-8 py-3 flex justify-between items-center z-40 shadow-sm shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="h-10 w-10 bg-indigo-500/10 rounded-lg border border-indigo-200 overflow-hidden shadow-sm"
          >
            <img
              src={schoolElectionLogo}
              alt="School Election Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <span className="font-display font-semibold text-lg tracking-tight text-indigo-900 hidden sm:block">
            School Election
          </span>
        </div>

        {/* Desktop Navbar */}
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={\`relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer \${
                  isActive ? "text-indigo-600 bg-indigo-50" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }\`}
              >
                <span className="flex items-center gap-2">
                  <item.icon size={16} />
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-sm uppercase shadow-sm cursor-pointer"
            >
              {user.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl p-2 space-y-1 z-50 backdrop-blur-xl"
                >
                  <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{user.fullName}</p>
                    <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider mt-0.5">{user.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      onTabChange("password");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Key size={14} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ConfirmModal
            isOpen={showConfirmLogout}
            onClose={() => setShowConfirmLogout(false)}
            onConfirm={onLogout}
          />
        </div>
      </motion.header>

      <main className="flex-grow w-full mx-auto p-4 md:p-8">
        {children}
      </main>

      <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500 bg-zinc-50 mt-auto">
        © 2026 E-Voting Inc. All rights reserved.
      </footer>

      {/* Mobile Bottom Nav */}
      <AnimatePresence>
        {!isMobile && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-zinc-200 flex flex-wrap justify-center gap-1 p-2 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={\`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer \${
                    isActive ? "text-indigo-600 bg-indigo-50" : "text-zinc-600"
                  }\`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

fs.writeFileSync('src/components/AppShell.tsx', before + '\n' + newRender);
