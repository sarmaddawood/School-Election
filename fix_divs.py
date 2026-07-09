import sys

with open('src/components/CandidatesTab.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip().startswith('<div className="flex items-center gap-3">{cand.photoUrl ?'):
        indent = line[:line.find('<')]
        new_lines.append(indent + '<div className="flex items-center gap-3">\n')
        new_lines.append(indent + '  {cand.photoUrl ? (\n')
        new_lines.append(indent + '    <img src={cand.photoUrl} alt={cand.fullName} className="w-10 h-10 rounded-full object-cover border border-zinc-200" referrerPolicy="no-referrer" />\n')
        new_lines.append(indent + '  ) : (\n')
        new_lines.append(indent + '    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-600">\n')
        new_lines.append(indent + '      {cand.fullName.split(" ").slice(0, 2).map(n => n[0]).join("")}\n')
        new_lines.append(indent + '    </div>\n')
        new_lines.append(indent + '  )}\n')
        new_lines.append(indent + '  <div>\n')
        new_lines.append(indent + '    <p className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-500 transition-colors">\n')
    elif line.strip() == '</div>' and i > 0 and lines[i-1].strip() == '</p>' and lines[i+1].strip().startswith('<motion.button'):
        new_lines.append(line)
        new_lines.append(' '*38 + '</div>\n')
        new_lines.append(' '*38 + '</div>\n')
    else:
        new_lines.append(line)

with open('src/components/CandidatesTab.tsx', 'w') as f:
    f.writelines(new_lines)
