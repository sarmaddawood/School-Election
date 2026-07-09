#!/bin/bash
sed -i 's/await userRef.update({ password: newPassword });/await updateDoc(userRef, { password: newPassword });/g' server.ts
