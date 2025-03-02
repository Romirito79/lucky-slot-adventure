
export interface SlotSymbol {
  id: number;
  imageUrl: string;
  isJackpot: boolean;
  name: string;
  multiplier: number;
}

export const SYMBOLS: SlotSymbol[] = [
  { id: 0, imageUrl: "", isJackpot: false, name: "RGCV", multiplier: 5 }, // Position 0 in slot.jpg, wins 5x
  { id: 1, imageUrl: "", isJackpot: true, name: "π", multiplier: 2 }, // Position 1 in slot.jpg, Jackpot + wins 2x
  { id: 2, imageUrl: "", isJackpot: false, name: "3.14", multiplier: 2 }, // Position 2 in slot.jpg, wins 2x
  { id: 3, imageUrl: "", isJackpot: false, name: "GCV", multiplier: 10 }, // Position 3 in slot.jpg, wins 10x
  { id: 4, imageUrl: "", isJackpot: true, name: "Jackpot", multiplier: 0 }, // Position 4 in slot.jpg, Jackpot
  { id: 5, imageUrl: "", isJackpot: false, name: "3.14", multiplier: 2 }, // Position 5 in slot.jpg, wins 2x
  { id: 6, imageUrl: "", isJackpot: true, name: "π", multiplier: 2 }, // Position 6 in slot.jpg, Jackpot + wins 2x
  { id: 7, imageUrl: "", isJackpot: false, name: "Pi", multiplier: 3 }, // Position 7 in slot.jpg, wins 3x (Pi Network symbol)
  { id: 8, imageUrl: "", isJackpot: true, name: "π", multiplier: 2 }, // Position 8 in slot.jpg, Jackpot + wins 2x
];

export const FALLBACK_SYMBOL: SlotSymbol = { 
  id: 0, 
  name: "?", 
  imageUrl: "/placeholder.svg",
  isJackpot: false,
  multiplier: 0
};

export const INITIAL_CREDIT = 100;
export const MIN_BET = 0.5;
export const MAX_BET = 10;
export const HOUSE_EDGE = 0.05; // 5% to house
export const JACKPOT_POOL = 0.05; // 5% to jackpot
export const INITIAL_JACKPOT = 50;

export const ICON_HEIGHT = 79; // Height of one icon in pixels
export const NUM_ICONS = 9; // Number of icons in the strip
export const TIME_PER_ICON = 100; // Max speed in ms for animating one icon
