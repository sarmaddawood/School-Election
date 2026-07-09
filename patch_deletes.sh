#!/bin/bash
sed -i 's/await userRef.delete();/await deleteDoc(userRef);/g' server.ts
sed -i 's/await electionRef.delete();/await deleteDoc(electionRef);/g' server.ts
sed -i 's/await positionRef.delete();/await deleteDoc(positionRef);/g' server.ts
sed -i 's/await candidateRef.delete();/await deleteDoc(candidateRef);/g' server.ts
