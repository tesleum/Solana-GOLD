const usersData: Record<string, any> = {
  "A": { totalInvested: 1000, referrer: null },
  "B": { totalInvested: 2000, referrer: "A" },
  "C": { totalInvested: 5000, referrer: "B" }
};

const childrenMap: Record<string, string[]> = {};
Object.keys(usersData).forEach(id => {
  const ref = usersData[id].referrer;
  if (ref) {
    if (!childrenMap[ref]) childrenMap[ref] = [];
    childrenMap[ref].push(id);
  }
});

const getTeamVolume = (userId: string): number => {
  let vol = 0;
  const queue = [userId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current !== userId) {
      vol += (usersData[current]?.totalInvested || 0);
    }
    const children = childrenMap[current];
    if (children) queue.push(...children);
  }
  return vol;
};
console.log(getTeamVolume("A"));
console.log(getTeamVolume("B"));
console.log(getTeamVolume("C"));
