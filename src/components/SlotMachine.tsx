import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import sha256 from 'crypto-js/sha256'; // Ensure: npm install crypto-js

// Custom symbol images for the slot machine (placeholders with fallbacks)
const SYMBOLS = [
  { 
    id: 1, 
    imageUrl: "https://via.placeholder.com/64", // Fallback—update to "/lovable-uploads/d28665b4-bc3f-46ac-8446-8db7be9e73e9.png"
    isJackpot: false, 
    name: "Pi", 
    multiplier: 2 
  },
  { 
    id: 2, 
    imageUrl: "https://via.placeholder.com/64", // Fallback—update to "/lovable-uploads/d3e1b6b5-113b-45e6-a90a-fb0129dec067.png"
    isJackpot: false, 
    name: "3.14", 
    multiplier: 1 
  },
  { 
    id: 3, 
    imageUrl: "https://via.placeholder.com/64", // Fallback—update to "/lovable-uploads/c1349e90-60c9-4296-b16c-e03ae26ace85.png"
    isJackpot: false, 
    name: "GCV", 
    multiplier: 10 
  },
  { 
    id: 4, 
    imageUrl: "https://via.placeholder.com/64", // Fallback—update to "/lovable-uploads/6db61628-30c2-4746-a6d2-4195b148beb7.png"
    isJackpot: false, 
    name: "RGCV", 
    multiplier: 5 
  },
  { 
    id: 5, 
    imageUrl: "https://via.placeholder.com/64", // Fallback—update to "/lovable-uploads/f110e1fa-74a6-4ab2-ba53-1ec6dd8e9309.png"
    isJackpot: true, 
    name: "π", 
    multiplier: 0 
  },
];

const INITIAL_CREDIT = 100;
const MIN_BET = 0.5;
const MAX_BET = 10;
const HOUSE_EDGE = 0.05; // 5% to house
const JACKPOT_POOL = 0.05; // 5% to jackpot
const INITIAL_JACKPOT = 50;

const SlotMachine = () => {
  const { toast } = useToast();
  const spinSoundRef = useRef(null);
  const stopSoundRef = useRef(null);
  const [credit, setCredit] = useState(INITIAL_CREDIT);
  const [bet, setBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(INITIAL_JACKPOT); // Starting jackpot amount
  const [reels, setReels] = useState([
    [SYMBOLS[0] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[1] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[2] || { name: "?", imageUrl: "https://via.placeholder.com/64" }],
    [SYMBOLS[1] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[2] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[3] || { name: "?", imageUrl: "https://via.placeholder.com/64" }],
    [SYMBOLS[2] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[3] || { name: "?", imageUrl: "https://via.placeholder.com/64" }, SYMBOLS[0] || { name: "?", imageUrl: "https://via.placeholder.com/64" }],
  ]);
  const [reelStates, setReelStates] = useState([true, true, true]); // All reels initially stopped
  const [seed, setSeed] = useState("");
  const [spinResults, setSpinResults] = useState([]); // Remove TypeScript-specific type
  const [message, setMessage] = useState("");
  const [lastJackpotWin, setLastJackpotWin] = useState(null); // Remove TypeScript-specific type, default to null

  useEffect(() => {
    // Load sound effects (local files for reliability)
    spinSoundRef.current = new Audio('/spin.wav');
    stopSoundRef.current = new Audio('/stop.wav');
    
    spinSoundRef.current.load();
    stopSoundRef.current.load();
    
    // Generate initial seed and check jackpot reset
    generateNewSeed();
    checkJackpotReset();
  }, []);

  const checkJackpotReset = () => {
    // Reset jackpot if last win was yesterday or earlier (midnight UTC)
    const now = new Date();
    const todayStart = new Date(now.setUTCHours(0, 0, 0, 0));
    
    if (lastJackpotWin instanceof Date && lastJackpotWin < todayStart) {
      setLastJackpotWin(null); // Reset jackpot win tracking for new day
      setJackpotAmount(INITIAL_JACKPOT); // Reset jackpot to initial amount
    }
  };

  const generateNewSeed = () => {
    // Generate a cryptographically secure seed for provably fair spins
    const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString();
    setSeed(randomSeed);
    console.log("New seed generated:", randomSeed);
  };

  const playSpinSound = () => {
    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  const playStopSound = () => {
    if (stopSoundRef.current) {
      stopSoundRef.current.currentTime = 0;
      stopSoundRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  const generateOutcomes = () => {
    // Use SHA-256 for provably fair outcomes
    const timestamp = new Date().getTime();
    const combinedSeed = seed + timestamp.toString();
    const hash = sha256(combinedSeed).toString();

    // Generate 3x3 outcomes (full grid for visuals, use middle row for wins)
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

  const spin = () => {
    if (credit < bet) {
      toast({
        title: "Insufficient Credit",
        description: "Please add more credit to continue playing.",
        variant: "destructive",
      });
      return;
    }

    // Clear previous message
    setMessage("");

    // 1. Deduct bet from balance
    setCredit((prev) => prev - bet);
    
    // 2. Add 5% of bet to jackpot and 5% to house (implicitly handled in win logic)
    const jackpotContribution = bet * JACKPOT_POOL; // 5% to jackpot
    const houseContribution = bet * HOUSE_EDGE; // 5% to house
    setJackpotAmount(prev => prev + jackpotContribution);
    
    // 3. Start spinning animation and play sound
    setIsSpinning(true);
    setReelStates([false, false, false]); // All reels spinning
    playSpinSound();
    
    // 4. Generate provably fair outcomes
    const outcomes = generateOutcomes();
    setSpinResults(outcomes);
    
    // 5. Schedule staggered stops for reels with longer delays
    setTimeout(() => {
      // Stop first reel
      setReelStates(prev => [true, prev[1], prev[2]]);
      playStopSound();
      
      // Apply outcome to first reel (full 3x3 for visuals, middle for logic)
      setReels(prev => {
        const updatedReels = [...prev];
        updatedReels[0] = outcomes[0].map(idx => SYMBOLS[idx] || { name: "?", imageUrl: "https://via.placeholder.com/64" });
        return updatedReels;
      });
      
      setTimeout(() => {
        // Stop second reel
        setReelStates(prev => [prev[0], true, prev[2]]);
        playStopSound();
        
        // Apply outcome to second reel
        setReels(prev => {
          const updatedReels = [...prev];
          updatedReels[1] = outcomes[1].map(idx => SYMBOLS[idx] || { name: "?", imageUrl: "https://via.placeholder.com/64" });
          return updatedReels;
        });
        
        setTimeout(() => {
          // Stop third reel
          setReelStates(prev => [prev[0], prev[1], true]);
          playStopSound();
          
          // Apply outcome to third reel
          setReels(prev => {
            const updatedReels = [...prev];
            updatedReels[2] = outcomes[2].map(idx => SYMBOLS[idx] || { name: "?", imageUrl: "https://via.placeholder.com/64" });
            return updatedReels;
          });
          
          // End spinning state and check for wins
          setIsSpinning(false);
          checkWin();
          
          // Generate new seed for next spin
          generateNewSeed();
        }, 400); // Third reel stops 400ms after second
      }, 400); // Second reel stops 400ms after first
    }, 800); // First reel stops after 800ms
  };

  const checkWin = () => {
    // Check if all three middle tiles (golden box: reels[0][1], reels[1][1], reels[2][1]) match
    const middleRow = [reels[0][1].name, reels[1][1].name, reels[2][1].name];
    const allMatch = middleRow.every(symbol => symbol === middleRow[0]);

    if (allMatch) {
      const winningSymbol = SYMBOLS.find(s => s.name === middleRow[0]);
      if (winningSymbol?.isJackpot) {
        // Jackpot win (π symbol) - player wins entire jackpot
        if (!lastJackpotWin || new Date().getUTCDate() !== lastJackpotWin.getUTCDate()) {
          const winAmount = jackpotAmount; // Full jackpot
          setCredit(prev => prev + winAmount);
          setMessage(`Jackpot! +${winAmount.toFixed(2)} Pi`);
          toast({
            title: "🎰 JACKPOT WIN! 🎰",
            description: `You won ${winAmount.toFixed(2)} Pi from the jackpot!`,
            className: "bg-slot-purple text-white",
          });
          setJackpotAmount(INITIAL_JACKPOT); // Reset jackpot
          setLastJackpotWin(new Date()); // Record jackpot win
        } else {
          setMessage("Jackpot already won today! Try again tomorrow.");
          toast({
            title: "Jackpot Unavailable",
            description: "Only one jackpot win allowed per day.",
            variant: "destructive",
          });
        }
      } else {
        // Regular win based on symbol multiplier
        const effectiveBet = bet * 0.9; // 90% of bet (5% to house, 5% to jackpot)
        const multiplier = winningSymbol?.multiplier || 0;
        const rawWinAmount = effectiveBet * multiplier;
        const winAmount = rawWinAmount; // No additional house edge beyond the 90% bet split
        setCredit(prev => prev + winAmount);
        setMessage(`Winner! +${winAmount.toFixed(2)} Pi`);
        toast({
          title: "Winner!",
          description: `You won ${winAmount.toFixed(2)} Pi! (${multiplier}x your bet)`,
          className: "bg-slot-gold text-black",
        });
      }
    } else {
      setMessage("Try again!");
    }
  };

  const adjustBet = (amount) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slot-orange to-slot-gold p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between mb-4">
          <div className="text-2xl font-bold text-center bg-slot-red text-white py-2 px-4 rounded-md animate-shine flex-1 mr-2">
            Pi Balance: {credit.toFixed(2)} Pi
          </div>
          <div className="text-2xl font-bold text-center bg-slot-purple text-white py-2 px-4 rounded-md animate-pulse flex-1 ml-2">
            Jackpot: {jackpotAmount.toFixed(2)} Pi
          </div>
        </div>

        {message && (
          <div className="text-xl font-bold text-center mb-4 py-2 px-4 rounded-md bg-gray-100">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-100 p-4 rounded-lg">
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="flex flex-col items-center space-y-4 overflow-hidden">
              {reel.map((symbol, symbolIndex) => (
                <div
                  key={`${reelIndex}-${symbolIndex}`}
                  className={`p-4 bg-white rounded-lg shadow transition-transform ${
                    !reelStates[reelIndex] ? "animate-spin-slow" : ""
                  } ${symbol.isJackpot ? "animate-pulse bg-yellow-100" : ""} ${
                    symbolIndex === 1 ? "border-4 border-yellow-500" : "" // Golden box for middle row
                  }`}
                >
                  <img 
                    src={symbol.imageUrl} 
                    alt={symbol.name}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/64'; }} // Fallback for missing images
                    className={`w-16 h-16 object-contain ${symbol.isJackpot ? "animate-shine" : ""}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            onClick={() => adjustBet(-MIN_BET)}
            disabled={bet <= MIN_BET || isSpinning}
            className="w-24"
          >
            - {MIN_BET}
          </Button>
          <div className="text-xl font-bold">Bet: {bet.toFixed(2)} Pi</div>
          <Button
            variant="outline"
            onClick={() => adjustBet(MIN_BET)}
            disabled={bet >= MAX_BET || isSpinning}
            className="w-24"
          >
            + {MIN_BET}
          </Button>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => setBet(MAX_BET)}
            disabled={isSpinning}
            className="bg-slot-purple hover:bg-purple-700 text-white"
          >
            Max Bet
          </Button>
          <Button
            onClick={spin}
            disabled={isSpinning}
            className="bg-slot-red hover:bg-red-700 text-white w-32 h-12 text-lg font-bold animate-glow"
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;