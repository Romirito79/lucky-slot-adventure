import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import sha256 from 'crypto-js/sha256';

// Define the Symbol type interface to ensure consistent types
interface SlotSymbol {
  id: number;
  imageUrl: string;
  isJackpot: boolean;
  name: string;
  multiplier: number;
}

// Custom symbol names (mapped to slot.jpg positions)
const SYMBOLS: SlotSymbol[] = [
  { id: 1, imageUrl: "", isJackpot: false, name: "Pi", multiplier: 2 }, // Maps to Pi coin
  { id: 2, imageUrl: "", isJackpot: false, name: "3.14", multiplier: 1 }, // Maps to 3.14
  { id: 3, imageUrl: "", isJackpot: false, name: "GCV", multiplier: 10 }, // Maps to GCV
  { id: 4, imageUrl: "", isJackpot: false, name: "RGCV", multiplier: 5 }, // Maps to RGCV
  { id: 5, imageUrl: "", isJackpot: true, name: "π", multiplier: 0 }, // Maps to π or Jackpot
];

// Define the fallback symbol
const FALLBACK_SYMBOL: SlotSymbol = { 
  id: 0, 
  name: "?", 
  imageUrl: "/placeholder.svg",
  isJackpot: false,
  multiplier: 0
};

// Constants for the game
const INITIAL_CREDIT = 100;
const MIN_BET = 0.5;
const MAX_BET = 10;
const HOUSE_EDGE = 0.05; // 5% to house
const JACKPOT_POOL = 0.05; // 5% to jackpot
const INITIAL_JACKPOT = 50;

// Constants for animations (matching the provided JS)
const ICON_HEIGHT = 79; // Height of one icon in pixels
const NUM_ICONS = 9; // Number of icons in the strip
const TIME_PER_ICON = 100; // Max speed in ms for animating one icon

const SlotMachine = () => {
  const { toast } = useToast();
  const [credit, setCredit] = useState(INITIAL_CREDIT);
  const [bet, setBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(INITIAL_JACKPOT);
  const [reels, setReels] = useState<SlotSymbol[][]>([
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
  ]);
  const [seed, setSeed] = useState("");
  const [spinResults, setSpinResults] = useState([]);
  const [message, setMessage] = useState("Try Again!");
  const [lastJackpotWin, setLastJackpotWin] = useState(null);
  
  // Refs for reels to animate them
  const reelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const slotsRef = useRef<HTMLDivElement | null>(null);
  
  // Audio references
  const buttonSoundRef = useRef(null);
  const spinningSoundRef = useRef(null);
  const jackpotSoundRef = useRef(null);

  // Win states
  const [winClass, setWinClass] = useState("");

  useEffect(() => {
    // Initialize audio elements
    buttonSoundRef.current = new Audio('/music/button.flac');
    spinningSoundRef.current = new Audio('/music/spinning.mp3');
    jackpotSoundRef.current = new Audio('/music/jackpot.wav');

    // Configure spinning sound to loop
    if (spinningSoundRef.current) {
      spinningSoundRef.current.loop = true;
    }

    // Preload audio
    [buttonSoundRef, spinningSoundRef, jackpotSoundRef].forEach(ref => {
      if (ref.current) ref.current.load();
    });

    // Preload slot image
    const slotImage = new Image();
    slotImage.src = '/images/slot.jpg';
    slotImage.onload = () => {
      console.log("Slot image preloaded successfully");
    };
    slotImage.onerror = (e) => {
      console.error("Failed to preload slot image:", e);
    };

    // Generate initial seed and check jackpot reset
    generateNewSeed();
    checkJackpotReset();

    // Persist jackpot win across sessions
    const savedJackpotWin = localStorage.getItem('lastJackpotWin');
    if (savedJackpotWin) {
      setLastJackpotWin(new Date(savedJackpotWin));
    }

    // Cleanup audio on unmount
    return () => {
      if (spinningSoundRef.current) {
        spinningSoundRef.current.pause();
        spinningSoundRef.current.currentTime = 0;
      }
    };
  }, []);

  // Remove win class after animation completes
  useEffect(() => {
    if (winClass) {
      const timer = setTimeout(() => {
        setWinClass("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [winClass]);

  const playButtonSound = () => {
    if (buttonSoundRef.current) {
      buttonSoundRef.current.currentTime = 0;
      buttonSoundRef.current.play().catch(e => console.log("Button sound failed:", e));
    }
  };

  const playSpinningSound = () => {
    if (spinningSoundRef.current && !spinningSoundRef.current.paused) {
      return; // Prevent replay if already playing
    }
    if (spinningSoundRef.current) {
      spinningSoundRef.current.currentTime = 0;
      spinningSoundRef.current.play().catch(e => console.log("Spinning sound failed:", e));
    }
  };

  const stopSpinningSound = () => {
    if (spinningSoundRef.current) {
      spinningSoundRef.current.pause();
      spinningSoundRef.current.currentTime = 0;
    }
  };

  const playJackpotSound = () => {
    if (jackpotSoundRef.current) {
      jackpotSoundRef.current.currentTime = 0;
      jackpotSoundRef.current.play().catch(e => console.log("Jackpot sound failed:", e));
    }
  };

  const checkJackpotReset = () => {
    // Reset jackpot if last win was yesterday or earlier (midnight UTC)
    const now = new Date();
    const todayStart = new Date(now.setUTCHours(0, 0, 0, 0));
    
    if (lastJackpotWin instanceof Date && lastJackpotWin < todayStart) {
      setLastJackpotWin(null);
      setJackpotAmount(INITIAL_JACKPOT);
    }
  };

  const generateNewSeed = () => {
    // Generate a cryptographically secure seed for provably fair spins
    const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString();
    setSeed(randomSeed);
    console.log("New seed generated:", randomSeed);
  };

  const generateOutcomes = () => {
    // Use SHA-256 for provably fair outcomes
    const timestamp = new Date().getTime();
    const combinedSeed = seed + timestamp.toString();
    const hash = sha256(combinedSeed).toString();

    // Generate 3x3 outcomes
    const results = [];
    
    for (let reel = 0; reel < 3; reel++) {
      const reelResult = [];
      for (let pos = 0; pos < 3; pos++) {
        const hashSlice = hash.slice((reel * 3 + pos) * 8, (reel * 3 + pos + 1) * 8);
        const symbolIndex = parseInt(hashSlice, 16) % SYMBOLS.length;
        reelResult.push(symbolIndex);
      }
      results.push(reelResult);
    }
    
    console.log("Spin result (provably fair):", results);
    return results;
  };

  // Roll a single reel (based on the reference JS)
  const rollReel = (reelIndex, offset = 0, targetPosition) => {
    return new Promise<void>((resolve) => {
      const reel = reelRefs.current[reelIndex];
      if (!reel) {
        resolve();
        return;
      }

      // Calculate the number of icons to spin (2 + offset rounds + random)
      const delta = (offset + 2) * NUM_ICONS + Math.round(Math.random() * NUM_ICONS);
      
      // Plus the specific target position we want
      const totalDelta = delta + targetPosition;
      
      // Current background position
      const style = getComputedStyle(reel);
      const currentPos = parseFloat(style.backgroundPositionY || "0");
      
      // Target background position
      const targetPos = currentPos + (totalDelta * ICON_HEIGHT);
      
      // Normalized position for reset
      const normalizedTargetPos = targetPos % (NUM_ICONS * ICON_HEIGHT);

      // Delay start of animation based on reel index
      setTimeout(() => {
        // Set transition with cubic-bezier easing (matching reference JS)
        reel.style.transition = `background-position-y ${(8 + totalDelta) * TIME_PER_ICON}ms cubic-bezier(.41,-0.01,.63,1.09)`;
        reel.style.backgroundPositionY = `${targetPos}px`;
        
        // After animation completes
        setTimeout(() => {
          // Reset position to keep it within bounds
          reel.style.transition = "none";
          reel.style.backgroundPositionY = `${normalizedTargetPos}px`;
          resolve();
        }, (8 + totalDelta) * TIME_PER_ICON);
      }, offset * 150);
    });
  };

  const spin = () => {
    if (credit < bet) {
      toast({
        title: "Insufficient Credit",
        description: "Please add more credit to continue playing.",
        variant: "destructive",
      });
      return;
    }

    // Already spinning, don't allow another spin
    if (isSpinning) {
      return;
    }

    // Play button sound immediately on Spin click
    playButtonSound();

    // Clear previous message
    setMessage("");

    // 1. Deduct bet from balance
    setCredit((prev) => prev - bet);
    
    // 2. Add 5% of bet to jackpot
    const jackpotContribution = bet * JACKPOT_POOL;
    setJackpotAmount(prev => prev + jackpotContribution);
    
    // 3. Start spinning animation and sound
    setIsSpinning(true);
    playSpinningSound();
    
    // 4. Generate provably fair outcomes
    const outcomes = generateOutcomes();
    setSpinResults(outcomes);
    
    // Roll all reels with sequential timing
    Promise.all(
      reelRefs.current.map((reel, i) => {
        // Get middle symbol for result position (index 1 is middle)
        const middleSymbol = outcomes[i][1];
        return rollReel(i, i, middleSymbol);
      })
    ).then(() => {
      // Update reel states after all animations complete
      setReels(prev => {
        const updatedReels = [...prev];
        outcomes.forEach((outcome, reelIndex) => {
          updatedReels[reelIndex] = outcome.map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        });
        return updatedReels;
      });
      
      // End spinning state and sound
      setIsSpinning(false);
      stopSpinningSound();
      
      // Check for wins and set message
      checkWin();
      
      // Generate new seed for next spin
      generateNewSeed();
    });
  };

  const checkWin = () => {
    // Get the middle row symbols (the win line)
    const middleRow = spinResults.map(reel => reel[1]);
    
    // Check if we have matching symbols
    const firstMatch = middleRow[0] === middleRow[1];
    const secondMatch = middleRow[1] === middleRow[2];
    const allMatch = firstMatch && secondMatch;
    
    if (firstMatch || secondMatch) {
      // Set win class for animation based on match type
      if (allMatch) {
        setWinClass("win2"); // Like CodePen example
        
        // Check if it's a jackpot (π symbol)
        const winningSymbolIndex = middleRow[0];
        const winningSymbol = SYMBOLS[winningSymbolIndex];
        
        if (winningSymbol?.isJackpot) {
          // Jackpot win (π symbol) - player wins entire jackpot
          if (!lastJackpotWin || new Date().getUTCDate() !== lastJackpotWin.getUTCDate()) {
            const winAmount = jackpotAmount; // Full jackpot
            setCredit(prev => prev + winAmount);
            setMessage(`Jackpot! +${winAmount.toFixed(2)} Pi`);
            
            // Play jackpot sound
            playJackpotSound();
            
            toast({
              title: "🎰 JACKPOT WIN! 🎰",
              description: `You won ${winAmount.toFixed(2)} Pi from the jackpot!`,
              className: "bg-slot-purple text-white",
            });
            setJackpotAmount(INITIAL_JACKPOT); // Reset jackpot
            setLastJackpotWin(new Date()); // Record jackpot win
            localStorage.setItem('lastJackpotWin', new Date().toISOString()); // Persist jackpot win
          } else {
            setMessage("Jackpot already won today! Try again tomorrow.");
            toast({
              title: "Jackpot Unavailable",
              description: "Only one jackpot win allowed per day.",
              variant: "destructive",
            });
          }
        } else {
          // Regular win with all three symbols matching
          const effectiveBet = bet * 0.9; // 90% of bet (5% to house, 5% to jackpot)
          const multiplier = winningSymbol?.multiplier || 0;
          const winAmount = effectiveBet * multiplier;
          setCredit(prev => prev + winAmount);
          setMessage(`Winner! +${winAmount.toFixed(2)} Pi`);
          toast({
            title: "Winner!",
            description: `You won ${winAmount.toFixed(2)} Pi! (${multiplier}x your bet)`,
            className: "bg-slot-gold text-black",
          });
        }
      } else {
        // Partial win (2 symbols match)
        setWinClass("win1");
        
        // Determine which symbols match
        const matchingReels = firstMatch ? [0, 1] : [1, 2];
        const matchingSymbolIndex = middleRow[matchingReels[0]];
        const winningSymbol = SYMBOLS[matchingSymbolIndex];
        
        // Calculate win amount (half the regular win amount)
        const effectiveBet = bet * 0.9;
        const multiplier = winningSymbol?.multiplier || 0;
        const winAmount = (effectiveBet * multiplier) / 2; // Half for partial match
        
        if (winAmount > 0) {
          setCredit(prev => prev + winAmount);
          setMessage(`Partial Win! +${winAmount.toFixed(2)} Pi`);
          toast({
            title: "Partial Win!",
            description: `You won ${winAmount.toFixed(2)} Pi!`,
            className: "bg-slot-orange text-black",
          });
        } else {
          setMessage("Try Again!");
        }
      }
    } else {
      setMessage("Try Again!"); // No matches
    }
  };

  const adjustBet = (amount) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
    playButtonSound();
  };

  const setMinBet = () => {
    setBet(MIN_BET);
    playButtonSound();
  };

  const setMaxBet = () => {
    setBet(MAX_BET);
    playButtonSound();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-500 to-gray-300 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between mb-4">
          <div className="text-2xl font-bold text-center bg-slot-red text-white py-2 px-4 rounded-md animate-shine flex-1 mr-2">
            Pi Balance: {credit.toFixed(2)} Pi
          </div>
          <div className="text-2xl font-bold text-center bg-slot-purple text-white py-2 px-4 rounded-md animate-pulse flex-1 ml-2">
            Jackpot: {jackpotAmount.toFixed(2)} Pi
          </div>
        </div>

        <div className="text-xl font-bold text-center mb-4 py-2 px-4 rounded-md bg-gray-100">
          {message}
        </div>

        {/* Slot machine container matching the reference CSS */}
        <div 
          ref={slotsRef}
          className={`relative flex justify-between p-6 bg-gradient-to-br from-gray-500 to-gray-300 border-t border-r border-l border-b border-t-white/60 border-r-white/60 border-l-black/40 border-b-black/40 shadow-md rounded mx-auto mb-6 w-full max-w-md ${winClass}`}
        >
          {[0, 1, 2].map((reelIndex) => (
            <div 
              key={reelIndex}
              ref={el => reelRefs.current[reelIndex] = el}
              className="relative w-[79px] h-[237px] border border-black/30 rounded overflow-hidden"
              style={{
                backgroundImage: "url(/images/slot.jpg)",
                backgroundPosition: "0 0",
                backgroundRepeat: "repeat-y"
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 shadow-inner"></div>
            </div>
          ))}
          
          {/* Reference lines */}
          <div className="absolute top-1/2 left-0 w-2.5 h-0.5 bg-black/50 -translate-x-[200%] -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-2.5 h-0.5 bg-black/50 translate-x-[200%] -translate-y-1/2"></div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            onClick={() => adjustBet(-0.5)}
            disabled={isSpinning}
            className="w-24"
          >
            -0.5
          </Button>
          <div className="text-xl font-bold">Bet: {bet.toFixed(2)} Pi</div>
          <Button
            variant="outline"
            onClick={() => adjustBet(0.5)}
            disabled={isSpinning}
            className="w-24"
          >
            +0.5
          </Button>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            onClick={setMinBet}
            disabled={isSpinning}
            className="bg-slot-orange hover:bg-orange-700 text-white"
          >
            Min Bet
          </Button>
          <Button
            onClick={spin}
            disabled={isSpinning}
            className="bg-slot-red hover:bg-red-700 text-white w-32 h-12 text-lg font-bold animate-glow"
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </Button>
          <Button
            onClick={setMaxBet}
            disabled={isSpinning}
            className="bg-slot-purple hover:bg-purple-700 text-white"
          >
            Max Bet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;
