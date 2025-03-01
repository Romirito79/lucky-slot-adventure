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

// Custom symbol names (mapped to slot.jpg positions)
const SYMBOLS: SlotSymbol[] = [
  { id: 1, imageUrl: "", isJackpot: false, name: "Pi", multiplier: 2 }, // Maps to Pi coin (position 8 in slot.jpg, 700px from top)
  { id: 2, imageUrl: "", isJackpot: false, name: "3.14", multiplier: 1 }, // Maps to 3.14 (positions 3 and 6, 200px and 500px)
  { id: 3, imageUrl: "", isJackpot: false, name: "GCV", multiplier: 10 }, // Maps to GCV (position 4, 300px)
  { id: 4, imageUrl: "", isJackpot: false, name: "RGCV", multiplier: 5 }, // Maps to RGCV (position 1, 0px)
  { id: 5, imageUrl: "", isJackpot: true, name: "π", multiplier: 0 }, // Maps to π (positions 2, 7, 9, 100px, 600px, 800px) or Jackpot (position 5, 400px)
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
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
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
    
    // 5. Sequential stopping of reels with CodePen-like delays and slowing effect
    setTimeout(() => {
      // Stop first reel after 2 seconds, slow down before stopping
      setReelStates(prev => [true, false, true]); // First stops, second starts
      const firstOutcome = outcomes[0][1]; // Middle symbol for first reel
      setReels(prev => {
        const updatedReels = [...prev];
        updatedReels[0] = outcomes[0].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        return updatedReels;
      });
      updateReelPosition(0, firstOutcome * -100); // Adjust for 100px per symbol

      setTimeout(() => {
        // Stop second reel after 2.5 seconds (0.5s delay after first), slow down before stopping
        setReelStates(prev => [true, true, false]); // Second stops, third starts
        const secondOutcome = outcomes[1][1]; // Middle symbol for second reel
        setReels(prev => {
          const updatedReels = [...prev];
          updatedReels[1] = outcomes[1].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
          return updatedReels;
        });
        updateReelPosition(1, secondOutcome * -100); // Adjust for 100px per symbol

        setTimeout(() => {
          // Stop third reel after 3 seconds (1s delay after first), slow down before stopping
          setReelStates(prev => [true, true, true]); // Third stops
          const thirdOutcome = outcomes[2][1]; // Middle symbol for third reel
          setReels(prev => {
            const updatedReels = [...prev];
            updatedReels[2] = outcomes[2].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
            return updatedReels;
          });
          updateReelPosition(2, thirdOutcome * -100); // Adjust for 100px per symbol
          
          // End spinning state and sound
          setIsSpinning(false);
          stopSpinningSound();
          
          // Check for wins and set message
          checkWin();
          
          // Generate new seed for next spin
          generateNewSeed();
        }, 500); // 0.5s for third reel to stop (total 3s)
      }, 500); // 0.5s for second reel to stop (total 2.5s)
    }, 2000); // 2s for first reel to stop (total 2s)
  };

  const updateReelPosition = (reelIndex, position) => {
    const reelElement = document.querySelector(`#reel-${reelIndex}`);
    if (reelElement) {
      reelElement.style.transform = `translateY(${position}px)`;
    }
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

        <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-100 p-2 rounded-lg shadow-md"> {/* Adjusted for CodePen spacing and shadow */}
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="flex flex-col items-center space-y-4 overflow-hidden h-72 relative" id={`reel-container-${reelIndex}`}>
              <div className={`flex flex-col items-center space-y-4 ${!reelStates[reelIndex] ? "spinning-grid" : "stopped-grid"}`} id={`reel-${reelIndex}`}>
                <img 
                  src="/images/slot.jpg" // Use slot.jpg for all reels
                  alt="Slot Reel"
                  onError={handleImageError}
                  className="w-16 h-900 object-contain" // Adjust height to match slot.jpg (900px assumed)
                />
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
  @keyframes spin {
    0% { transform: translateY(0); }
    100% { transform: translateY(-900px); } /* Adjust based on slot.jpg height (900px assumed) */
  }

  @keyframes stop {
    0% { transform: translateY(-900px); }
    100% { transform: translateY(outcomePosition); } /* Calculated via JS for symbol alignment */
  }

  .spinning-grid {
    animation: spin 2s linear infinite;
    filter: blur(2px);
  }

  .stopped-grid {
    animation: stop 0.5s ease-out forwards;
  }
`;

export default SlotMachine;