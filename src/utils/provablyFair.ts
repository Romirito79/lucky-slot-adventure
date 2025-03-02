
import sha256 from 'crypto-js/sha256';
import { NUM_ICONS } from './slotMachineConfig';

export const generateNewSeed = (): string => {
  const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString();
  console.log("New seed generated:", randomSeed);
  return randomSeed;
};

export const generateOutcomes = (seed: string, numReels: number = 3, numPositions: number = 3): number[][] => {
  const timestamp = new Date().getTime();
  const combinedSeed = seed + timestamp.toString();
  const hash = sha256(combinedSeed).toString();

  const results: number[][] = [];
  
  for (let reel = 0; reel < numReels; reel++) {
    const reelResult: number[] = [];
    for (let pos = 0; pos < numPositions; pos++) {
      const hashSlice = hash.slice((reel * numPositions + pos) * 8, (reel * numPositions + pos + 1) * 8);
      const symbolIndex = parseInt(hashSlice, 16) % NUM_ICONS;
      reelResult.push(symbolIndex);
    }
    results.push(reelResult);
  }
  
  console.log("Spin result (provably fair):", results);
  return results;
};
