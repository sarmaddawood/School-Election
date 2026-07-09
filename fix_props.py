with open("src/components/DashboardTab.tsx", "r") as f:
    content = f.read()

replacement = """export default function DashboardTab({ 
  currentUser,
  users,
  votes,
  elections,
  positions,
  candidates,
  onSelectTab,
  token,
  onRefreshData
}: any) {"""

content = content.replace("export default function DashboardTab({ currentUser }: { currentUser: User | null }) {", replacement)

with open("src/components/DashboardTab.tsx", "w") as f:
    f.write(content)
