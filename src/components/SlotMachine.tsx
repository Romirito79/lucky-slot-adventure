
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Cherry, Grape, Apple, Trophy } from 'lucide-react';

// Custom symbol images for the slot machine (using Lucide icons as fallbacks)
const SYMBOLS = [
  { 
    id: 1, 
    component: Cherry,
    color: "#FF4136",
    isJackpot: false, 
    name: "Pi", 
    multiplier: 2 
  },
  { 
    id: 2, 
    component: Grape,
    color: "#B10DC9",
    isJackpot: false, 
    name: "3.14", 
    multiplier: 1 
  },
  { 
    id: 3, 
    component: Cherry,
    color: "#FF7F50",
    isJackpot: false, 
    name: "GCV", 
    multiplier: 10 
  },
  { 
    id: 4, 
    component: Apple,
    color: "#FF4136",
    isJackpot: false, 
    name: "RGCV", 
    multiplier: 5 
  },
  { 
    id: 5, 
    component: Trophy,
    color: "#FFD700",
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
  const [credit, setCredit] = useState(INITIAL_CREDIT);
  const [bet, setBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(INITIAL_JACKPOT); // Starting jackpot amount
  const [reels, setReels] = useState([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[1], SYMBOLS[2], SYMBOLS[3]],
    [SYMBOLS[2], SYMBOLS[3], SYMBOLS[0]],
  ]);
  const [reelStates, setReelStates] = useState([true, true, true]); // All reels initially stopped
  const [seed, setSeed] = useState("");
  const [message, setMessage] = useState("");
  const [lastJackpotWin, setLastJackpotWin] = useState(null); // Track last jackpot win

  useEffect(() => {
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
    // Generate a random seed for provably fair spins
    const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString();
    setSeed(randomSeed);
    console.log("New seed generated:", randomSeed);
  };

  const generateOutcomes = () => {
    // Use seed + timestamp to generate outcomes (simplified version of provably fair)
    const timestamp = new Date().getTime();
    const combinedSeed = seed + timestamp.toString();
    
    // Hash the combined seed (simple version using string operations)
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      hash = ((hash << 5) - hash) + combinedSeed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Generate 3 reels with 3 symbols each
    const results = [];
    
    for (let reel = 0; reel < 3; reel++) {
      const reelResult = [];
      for (let pos = 0; pos < 3; pos++) {
        // Use different parts of the hash for each position
        const shiftedHash = (hash >> (reel * 3 + pos)) & 0xFF;
        const symbolIndex = shiftedHash % SYMBOLS.length;
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
    setJackpotAmount(prev => prev + jackpotContribution);
    
    // 3. Start spinning animation
    setIsSpinning(true);
    setReelStates([false, false, false]); // All reels spinning
    
    // 4. Generate provably fair outcomes
    const outcomes = generateOutcomes();
    
    // 5. Stop all reels at once after delay (simplified animation)
    setTimeout(() => {
      // Apply outcomes to all reels
      setReels(prev => {
        const updatedReels = [...prev];
        updatedReels[0] = outcomes[0].map(idx => SYMBOLS[idx]);
        updatedReels[1] = outcomes[1].map(idx => SYMBOLS[idx]);
        updatedReels[2] = outcomes[2].map(idx => SYMBOLS[idx]);
        return updatedReels;
      });
      
      // Stop all reels
      setReelStates([true, true, true]);
      
      // End spinning state and check for wins
      setIsSpinning(false);
      checkWin();
      
      // Generate new seed for next spin
      generateNewSeed();
    }, 1000); // All reels stop after 1 second
  };

  const checkWin = () => {
    // Check if all three middle tiles match
    const middleRow = [reels[0][1], reels[1][1], reels[2][1]];
    const allMatch = middleRow.every(symbol => symbol.id === middleRow[0].id);

    if (allMatch) {
      const winningSymbol = middleRow[0];
      
      if (winningSymbol.isJackpot) {
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
        const multiplier = winningSymbol.multiplier;
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
      setMessage("Try again!");
    }
  };

  const adjustBet = (amount) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
  };

  // Helper function to render the symbol
  const renderSymbol = (symbol) => {
    const Symbol = symbol.component;
    return <Symbol size={48} color={symbol.color} />;
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
                  className={`p-4 bg-white rounded-lg shadow ${
                    !reelStates[reelIndex] ? "animate-pulse" : ""
                  } ${symbol.isJackpot ? "bg-yellow-100" : ""} ${
                    symbolIndex === 1 ? "border-4 border-yellow-500" : "" // Golden box for middle row
                  }`}
                >
                  {renderSymbol(symbol)}
                  <div className="text-center mt-1 font-bold">{symbol.name}</div>
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
