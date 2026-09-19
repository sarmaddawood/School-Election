import re

with open(r'c:\Users\sarma\Documents\School Election\src\components\UsersTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace UsersTabProps
content = re.sub(
    r'interface UsersTabProps \{[\s\S]*?token: string;[\s\S]*?currentUser: UserType;\n\}',
    '''interface UsersTabProps {
  onRefreshData: () => Promise<void>;
  setErrorNotification: (msg: string) => void;
  setSuccessNotification: (msg: string) => void;
  token: string;
  currentUser: UserType;
}''',
    content
)

# 2. Component signature
content = re.sub(
    r'export default function UsersTab\(\{\s*users,\s*candidates,\s*positions,\s*elections,\s*votes,\s*onRefreshData,\s*setErrorNotification,\s*setSuccessNotification,\s*token,\s*currentUser,\s*\}\: UsersTabProps\) \{',
    '''export default function UsersTab({
  onRefreshData,
  setErrorNotification,
  setSuccessNotification,
  token,
  currentUser,
}: UsersTabProps) {''',
    content
)

# 3. Add states and useEffect
state_addition = '''
  const [users, setUsers] = useState<UserType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (cursor?: string) => {
    try {
      setLoadingUsers(true);
      const url = cursor 
        ? `/api/users?limit=50&cursor=${cursor}`
        : `/api/users?limit=50`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      if (cursor) {
        setUsers(prev => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      setErrorNotification(err.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };
'''
content = re.sub(
    r'(const \[studentNumber, setStudentNumber\] = useState\(\"\"\);)',
    state_addition.lstrip() + r'\n  \1',
    content
)

# 4. handleSubmit update
content = content.replace(
    '      await onRefreshData();\n    } catch (err: any) {',
    '      await fetchUsers();\n      await onRefreshData();\n    } catch (err: any) {'
)

# 5. handleConfirmDelete update
content = content.replace(
    '      setSuccessNotification(`User "${name}" and cascading records deleted successfully`);\n      await onRefreshData();',
    '      setSuccessNotification(`User "${name}" and cascading records deleted successfully`);\n      await fetchUsers();\n      await onRefreshData();'
)

# 6. Mobile view "Load More"
mobile_load_more = '''
            {nextCursor && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => fetchUsers(nextCursor)}
                  disabled={loadingUsers}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {loadingUsers ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
'''

desktop_load_more = '''
          {nextCursor && (
            <div className="hidden md:flex justify-center mt-4 pb-2">
              <button
                type="button"
                onClick={() => fetchUsers(nextCursor)}
                disabled={loadingUsers}
                className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                {loadingUsers ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
'''

content = content.replace(
    '          {/* Desktop Table View (>= md) */}',
    mobile_load_more + '          {/* Desktop Table View (>= md) */}'
)
content = content.replace(
    '          </div>\n        </motion.div>\n      </div>\n\n      <ConfirmModal',
    '          </div>\n' + desktop_load_more + '        </motion.div>\n      </div>\n\n      <ConfirmModal'
)

# 7. Modals update
content = re.sub(
    r'candidates=\{candidates\}\s*positions=\{positions\}\s*elections=\{elections\}\s*votes=\{votes\}',
    'candidates={[]}\n        positions={[]}\n        elections={[]}\n        votes={[]}',
    content
)

# Also need to make sure onRefreshData inside BulkImportModal also calls fetchUsers if needed
content = content.replace(
    'onSuccess={onRefreshData}',
    'onSuccess={async () => { await fetchUsers(); await onRefreshData(); }}'
)

with open(r'c:\Users\sarma\Documents\School Election\src\components\UsersTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
