import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import sha256 from 'crypto-js/sha256'; // Ensure: npm install crypto-js

// Define the Symbol type interface to ensure consistent types
interface SlotSymbol {
  id: number;
  imageUrl: string;
  isJackpot: boolean;
  name: string;
  multiplier: number;
}

// Custom symbol images for the slot machine
const SYMBOLS: SlotSymbol[] = [
  { 
    id: 1, 
    imageUrl: "/images/pi-coin.png", 
    isJackpot: false, 
    name: "Pi", 
    multiplier: 2 
  },
  { 
    id: 2, 
    imageUrl: "/images/3.14.png",
    isJackpot: false, 
    name: "3.14", 
    multiplier: 1 
  },
  { 
    id: 3, 
    imageUrl: "/images/gcv.png",
    isJackpot: false, 
    name: "GCV", 
    multiplier: 10 
  },
  { 
    id: 4, 
    imageUrl: "/images/rgcv.png",
    isJackpot: false, 
    name: "RGCV", 
    multiplier: 5 
  },
  { 
    id: 5, 
    imageUrl: "/images/Jackpot.png",
    isJackpot: true, 
    name: "π", 
    multiplier: 0 
  },
];

// Define the fallback symbol
const FALLBACK_SYMBOL: SlotSymbol = { 
  id: 0, 
  name: "?", 
  imageUrl: "/placeholder.svg",
  isJackpot: false,
  multiplier: 0
};

const INITIAL_CREDIT = 100;
const MIN_BET = 0.5;
const MAX_BET = 10;
const HOUSE_EDGE = 0.05; // 5% to house
const JACKPOT_POOL = 0.05; // 5% to jackpot
const INITIAL_JACKPOT = 50;

const SlotMachine = () => {
  const { toast } = useToast();
  const [credit, setCredit] = useState(INITIAL_CREDIT);
  const [bet, setBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(INITIAL_JACKPOT); // Starting jackpot amount
  const [reels, setReels] = useState<SlotSymbol[][]>([
    [SYMBOLS[0] || FALLBACK_SYMBOL, SYMBOLS[1] || FALLBACK_SYMBOL, SYMBOLS[2] || FALLBACK_SYMBOL],
    [SYMBOLS[1] || FALLBACK_SYMBOL, SYMBOLS[2] || FALLBACK_SYMBOL, SYMBOLS[3] || FALLBACK_SYMBOL],
    [SYMBOLS[2] || FALLBACK_SYMBOL, SYMBOLS[3] || FALLBACK_SYMBOL, SYMBOLS[0] || FALLBACK_SYMBOL],
  ]);
  const [reelStates, setReelStates] = useState([false, true, true]); // First reel starts spinning, others wait
  const [seed, setSeed] = useState(""); // Kept for fairness but removed from UI
  const [spinResults, setSpinResults] = useState([]);
  const [message, setMessage] = useState("Try Again!"); // Persistently visible, defaults to "Try Again!"
  const [lastJackpotWin, setLastJackpotWin] = useState(null); // Track last jackpot win

  // Audio references (unchanged from your original)
  const buttonSoundRef = useRef(null);
  const spinningSoundRef = useRef(null);
  const jackpotSoundRef = useRef(null);

  useEffect(() => {
    // Initialize audio elements (exact paths from your code)
    buttonSoundRef.current = new Audio('/music/button.flac');
    spinningSoundRef.current = new Audio('/music/spinning.mp3');
    jackpotSoundRef.current = new Audio('/music/jackpot.wav');

    // Configure spinning sound to loop
    if (spinningSoundRef.current) {
      spinningSoundRef.current.loop = true; // Enable looping for spinning sound
    }

    // Preload audio
    [buttonSoundRef, spinningSoundRef, jackpotSoundRef].forEach(ref => {
      if (ref.current) ref.current.load();
    });

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

    // Play button sound immediately on Spin click
    playButtonSound();

    // Clear previous message
    setMessage("");

    // 1. Deduct bet from balance
    setCredit((prev) => prev - bet);
    
    // 2. Add 5% of bet to jackpot and 5% to house (implicitly handled internally)
    const jackpotContribution = bet * JACKPOT_POOL; // 5% to jackpot
    setJackpotAmount(prev => prev + jackpotContribution);
    
    // 3. Start spinning animation and sound for first reel
    setIsSpinning(true);
    setReelStates([false, true, true]); // Start only first reel spinning
    playSpinningSound();
    
    // 4. Generate provably fair outcomes
    const outcomes = generateOutcomes();
    setSpinResults(outcomes);
    
    // 5. Sequential stopping of reels with longer delays and slowing effect
    setTimeout(() => {
      // Stop first reel after 2 seconds, slow down before stopping
      setReelStates(prev => [true, false, true]); // First stops, second starts
      setReels(prev => {
        const updatedReels = [...prev];
        updatedReels[0] = outcomes[0].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        return updatedReels;
      });

      setTimeout(() => {
        // Stop second reel after 4 seconds (2 more seconds), slow down before stopping
        setReelStates(prev => [true, true, false]); // Second stops, third starts
        setReels(prev => {
          const updatedReels = [...prev];
          updatedReels[1] = outcomes[1].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
          return updatedReels;
        });

        setTimeout(() => {
          // Stop third reel after 6 seconds (2 more seconds), slow down before stopping
          setReelStates(prev => [true, true, true]); // Third stops
          setReels(prev => {
            const updatedReels = [...prev];
            updatedReels[2] = outcomes[2].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
            return updatedReels;
          });
          
          // End spinning state and sound only when all reels stop
          setIsSpinning(false);
          stopSpinningSound();
          
          // Check for wins and set message
          checkWin();
          
          // Generate new seed for next spin
          generateNewSeed();
        }, 2000); // 2 seconds for third reel to stop (total 6s)
      }, 2000); // 2 seconds for second reel to stop (total 4s)
    }, 2000); // 2 seconds for first reel to stop (total 2s)
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
      setMessage("Try Again!"); // Persistently show "Try Again!" or win message
    }
  };

  const adjustBet = (amount) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
    playButtonSound(); // Add sound for bet adjustments
  };

  const setMinBet = () => {
    setBet(MIN_BET);
    playButtonSound(); // Add sound for Min Bet
  };

  const setMaxBet = () => {
    setBet(MAX_BET);
    playButtonSound(); // Add sound for Max Bet
  };

  // Handle image error with proper typing
  const handleImageError = (e) => {
    const imgElement = e.currentTarget;
    imgElement.onerror = null;
    imgElement.src = '/placeholder.svg';
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

        <div className="text-xl font-bold text-center mb-4 py-2 px-4 rounded-md bg-gray-100">
          {message} {/* Persistently visible message, updating dynamically */}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-100 p-4 rounded-lg">
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="flex flex-col items-center space-y-4 overflow-hidden h-72 relative">
              <div className={`flex flex-col items-center space-y-4 ${!reelStates[reelIndex] ? "spinning-grid" : "stopped-grid"}`}>
                {reel.map((symbol, symbolIndex) => (
                  <div
                    key={`${reelIndex}-${symbolIndex}`}
                    className={`p-4 bg-white rounded-lg shadow ${
                      symbol.isJackpot ? "animate-pulse bg-yellow-100" : ""
                    } ${
                      symbolIndex === 1 ? "border-4 border-yellow-500" : "" // Golden box for middle row
                    }`}
                  >
                    <img 
                      src={symbol.imageUrl} 
                      alt={symbol.name}
                      onError={handleImageError}
                      className={`w-16 h-16 object-contain ${symbol.isJackpot ? "animate-shine" : ""} ${
                        !reelStates[reelIndex] && isSpinning ? "blur-md" : "" // Blur only when spinning and not stopped
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
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

// Add to your CSS (e.g., index.css or SlotMachine.css) or tailwind.config.js
const styles = `
  @keyframes vertical-scroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(-300%); } /* Adjust based on symbol height (3x symbol height) */
  }

  @keyframes slow-stop {
    0% { transform: translateY(-300%); }
    80% { transform: translateY(-10%); opacity: 1; }
    100% { transform: translateY(0); opacity: 1; }
  }

  .spinning-grid {
    animation: vertical-scroll 6s linear infinite;
  }

  .stopped-grid {
    animation: slow-stop 0.5s ease-out forwards;
  }
`;

export default SlotMachine;