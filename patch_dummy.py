import re

with open('server.ts', 'r') as f:
    content = f.read()

old_student_code = '''      // Generate 35 student records
      const studentNames = [
        "Alex Rivera", "Jordan Patel", "Emma Watson", "Liam Neeson", "Chloe Bennett",
        "Daniel Kim", "Sophia Martinez", "Ryan Gallagher", "Ava Dubois", "Noah Jenkins",
        "Olivia Wright", "Ethan Hunt", "Isabella Cruz", "Mason Mount", "Sophia Loren",
        "Lucas Silva", "Charlotte Horn", "Oliver Twist", "Mia Wallace", "Henry Ford",
        "Harper Lee", "Sebastian Bach", "Evelyn Waugh", "Jack Reacher", "Lily Potter",
        "Henry Cavill", "Grace Kelly", "Wyatt Earp", "Zoe Saldana", "Carter Page",
        "Penelope Cruz", "Gabriel Garcia", "Madison Beer", "Dylan O'Brien", "Stella McCartney"
      ];

      studentNames.forEach((name, i) => {
        const id = `u-s${i + 1}`;
        mockUsers.push({
          id,
          username: `student${i + 1}`,
          password: "password123",
          fullName: name,
          role: "student",
          yearLevel: (i % 4) + 9, // Randomly year 9 to 12
          photoUrl: `https://i.pravatar.cc/150?u=${id}`
        });
      });'''

new_student_code = '''      // Generate 100 student records
      const firstNames = ["Alex", "Jordan", "Emma", "Liam", "Chloe", "Daniel", "Sophia", "Ryan", "Ava", "Noah", "Olivia", "Ethan", "Isabella", "Mason", "Lucas", "Charlotte", "Oliver", "Mia", "Henry", "Harper", "Sebastian", "Evelyn", "Jack", "Lily", "Grace", "Wyatt", "Zoe", "Carter", "Penelope", "Gabriel", "Madison", "Dylan", "Stella", "Leo", "Aria", "Julian", "Violet", "Mateo", "Hazel", "Elias"];
      const lastNames = ["Rivera", "Patel", "Watson", "Neeson", "Bennett", "Kim", "Martinez", "Gallagher", "Dubois", "Jenkins", "Wright", "Hunt", "Cruz", "Mount", "Loren", "Silva", "Horn", "Twist", "Wallace", "Ford", "Lee", "Bach", "Waugh", "Reacher", "Potter", "Cavill", "Kelly", "Earp", "Saldana", "Page", "Garcia", "Beer", "O'Brien", "McCartney", "Gomez", "Russo", "Chang", "Abbott", "Baker", "Clarke"];
      
      const studentNames = [];
      for(let i = 0; i < 100; i++) {
        studentNames.push(`${firstNames[i % firstNames.length]} ${lastNames[(i + 13) % lastNames.length]}`);
      }

      studentNames.forEach((name, i) => {
        const id = `u-s${i + 1}`;
        mockUsers.push({
          id,
          username: `student${i + 1}`,
          password: "password123",
          fullName: name,
          role: "student",
          yearLevel: (i % 6) + 7, // Year 7 to 12
          photoUrl: `https://i.pravatar.cc/150?u=${id}`
        });
      });'''

content = content.replace(old_student_code, new_student_code)

with open('server.ts', 'w') as f:
    f.write(content)
