import re

with open('src/components/CandidatesTab.tsx', 'r') as f:
    content = f.read()

# Add state
content = content.replace(
    'const [selectedUserId, setSelectedUserId] = useState("");',
    'const [selectedUserId, setSelectedUserId] = useState("");\n  const [selectedYearLevel, setSelectedYearLevel] = useState("");'
)

# Replace nonAdmins logic
old_logic = '''  const nonAdmins = users.filter((u) => u.role === "student");

  useEffect(() => {
    if (nonAdmins.length > 0 && !selectedUserId) {
      setSelectedUserId(nonAdmins[0].id);
    }
  }, [nonAdmins, selectedUserId]);'''

new_logic = '''  const availableStudents = users.filter((u) => u.role === "student" && (selectedYearLevel ? u.yearLevel === parseInt(selectedYearLevel) : true));

  useEffect(() => {
    if (availableStudents.length > 0 && !selectedUserId) {
      setSelectedUserId(availableStudents[0].id);
    }
  }, [availableStudents, selectedUserId, selectedYearLevel]);'''

content = content.replace(old_logic, new_logic)

# Replace select mapping
content = content.replace('nonAdmins.map', 'availableStudents.map')

# Add select field to JSX
select_year = '''                {/* Target Year Level */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase">
                    Target Year Level
                  </label>
                  <div className="relative">
                    <select
                      value={selectedYearLevel}
                      onChange={(e) => {
                         setSelectedYearLevel(e.target.value);
                         setSelectedUserId("");
                      }}
                      className="w-full pl-4 pr-10 py-2.5 glass-input rounded-xl text-sm appearance-none outline-none transition-all cursor-pointer"
                    >
                      <option value="">Any Year</option>
                      {[7, 8, 9, 10, 11, 12].map(year => (
                        <option key={year} value={year}>Year {year}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-zinc-500 italic mt-1">If set, only students from this year can vote for this candidate.</p>
                </div>'''

content = content.replace(
    '{/* User Select */}',
    select_year + '\n\n                {/* User Select */}'
)

# Update submit body
content = content.replace(
    'userId: selectedUserId,',
    'userId: selectedUserId,\n          targetYearLevel: selectedYearLevel ? parseInt(selectedYearLevel) : null,'
)

with open('src/components/CandidatesTab.tsx', 'w') as f:
    f.write(content)
