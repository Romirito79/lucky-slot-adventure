import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Custom symbol images for the slot machine
const SYMBOLS = [
  { 
    id: 1, 
    imageUrl: "/lovable-uploads/d28665b4-bc3f-46ac-8446-8db7be9e73e9.png", 
    isJackpot: false, 
    name: "Pi", 
    multiplier: 10 
  },
  { 
    id: 2, 
    imageUrl: "/lovable-uploads/d3e1b6b5-113b-45e6-a90a-fb0129dec067.png", 
    isJackpot: false, 
    name: "3.14", 
    multiplier: 5 
  },
  { 
    id: 3, 
    imageUrl: "/lovable-uploads/c1349e90-60c9-4296-b16c-e03ae26ace85.png", 
    isJackpot: false, 
    name: "GCV", 
    multiplier: 2 
  },
  { 
    id: 4, 
    imageUrl: "/lovable-uploads/6db61628-30c2-4746-a6d2-4195b148beb7.png", 
    isJackpot: false, 
    name: "RGCV", 
    multiplier: 5 
  },
  { 
    id: 5, 
    imageUrl: "/lovable-uploads/f110e1fa-74a6-4ab2-ba53-1ec6dd8e9309.png", 
    isJackpot: true, 
    name: "π", 
    multiplier: 0 // Jackpot symbol
  },
];

const INITIAL_CREDIT = 100;
const MIN_BET = 0.5;
const MAX_BET = 10;
const HOUSE_EDGE = 0.05; // 5% house edge on bets
const JACKPOT_HOUSE_EDGE = 0.05; // Additional 5% house edge on jackpot
const INITIAL_JACKPOT = 50;

const SlotMachine = () => {
  const { toast } = useToast();
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const stopSoundRef = useRef<HTMLAudioElement | null>(null);
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

  // For provably fair results
  const [seed, setSeed] = useState("");
  const [spinResults, setSpinResults] = useState<number[][]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // Load sound effects
    spinSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
    stopSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/220/220-preview.mp3');
    
    spinSoundRef.current.load();
    stopSoundRef.current.load();
    
    // Generate initial seed
    generateNewSeed();
  }, []);

  const generateNewSeed = () => {
    // Generate a random seed for provably fair spins
    const randomSeed = Math.random().toString(36).substring(2, 15);
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
    // Use the seed + timestamp to generate outcomes (simplified version of provably fair)
    const timestamp = new Date().getTime();
    const combinedSeed = seed + timestamp.toString();
    
    // Hash the combined seed (simple version using string operations)
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      hash = ((hash << 5) - hash) + combinedSeed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Generate 3 reels with 3 symbols each
    const results: number[][] = [];
    
    for (let reel = 0; reel < 3; reel++) {
      const reelResult: number[] = [];
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
    
    // 2. Add 1% of bet to jackpot
    const jackpotContribution = bet * 0.01;
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
      
      // Apply outcome to first reel
      setReels(prev => {
        const updatedReels = [...prev];
        updatedReels[0] = outcomes[0].map(idx => SYMBOLS[idx]);
        return updatedReels;
      });
      
      setTimeout(() => {
        // Stop second reel
        setReelStates(prev => [prev[0], true, prev[2]]);
        playStopSound();
        
        // Apply outcome to second reel
        setReels(prev => {
          const updatedReels = [...prev];
          updatedReels[1] = outcomes[1].map(idx => SYMBOLS[idx]);
          return updatedReels;
        });
        
        setTimeout(() => {
          // Stop third reel
          setReelStates(prev => [prev[0], prev[1], true]);
          playStopSound();
          
          // Apply outcome to third reel
          setReels(prev => {
            const updatedReels = [...prev];
            updatedReels[2] = outcomes[2].map(idx => SYMBOLS[idx]);
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
    // Check middle row for matches
    const middleRow = reels.map((reel) => reel[1]);
    const isWin = middleRow.every((symbol) => symbol.id === middleRow[0].id);
    
    if (isWin) {
      const winningSymbol = middleRow[0];
      const isJackpotWin = winningSymbol.isJackpot;
      
      if (isJackpotWin) {
        // Jackpot win - award the jackpot amount with combined house edge
        // 5% house edge on bets + 5% house edge on jackpot = 10% total reduction
        const totalHouseEdge = HOUSE_EDGE + JACKPOT_HOUSE_EDGE;
        const winAmount = jackpotAmount * (1 - totalHouseEdge);
        setCredit(prev => prev + winAmount);
        
        setMessage(`Jackpot! +${winAmount.toFixed(2)} Pi`);
        toast({
          title: "🎰 JACKPOT WIN! 🎰",
          description: `You won ${winAmount.toFixed(2)} Pi from the jackpot of ${jackpotAmount.toFixed(2)} Pi!`,
          className: "bg-slot-purple text-white",
        });
        
        // Reset jackpot after win
        setJackpotAmount(INITIAL_JACKPOT);
      } else {
        // Regular win based on symbol multiplier
        const multiplier = winningSymbol.multiplier;
        const rawWinAmount = bet * multiplier;
        const winAmount = rawWinAmount * (1 - HOUSE_EDGE); // Apply only regular house edge
        
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

  const adjustBet = (amount: number) => {
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
                  } ${symbol.isJackpot ? "animate-pulse bg-yellow-100" : ""}`}
                >
                  <img 
                    src={symbol.imageUrl} 
                    alt={symbol.name}
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