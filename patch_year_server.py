import re

with open('server.ts', 'r') as f:
    content = f.read()

# find candidate POST
content = content.replace(
    'const { electionId, positionId, userId, manifesto, party, photoUrl } = req.body;',
    'const { electionId, positionId, userId, manifesto, party, photoUrl, targetYearLevel } = req.body;'
)

content = content.replace(
    'yearLevel: user.yearLevel || null,',
    'yearLevel: targetYearLevel !== undefined ? targetYearLevel : (user.yearLevel || null),'
)

with open('server.ts', 'w') as f:
    f.write(content)
