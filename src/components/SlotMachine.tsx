
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import sha256 from 'crypto-js/sha256';

// Define the Symbol type interface
interface SlotSymbol {
  id: number;
  imageUrl: string;
  isJackpot: boolean;
  name: string;
  multiplier: number;
}

// Custom symbol names (mapped to slot.jpg positions)
const SYMBOLS: SlotSymbol[] = [
  { id: 1, imageUrl: "/images/pi-coin.png", isJackpot: false, name: "Pi", multiplier: 2 },
  { id: 2, imageUrl: "/images/3.14.png", isJackpot: false, name: "3.14", multiplier: 1 },
  { id: 3, imageUrl: "/images/gcv.png", isJackpot: false, name: "GCV", multiplier: 10 },
  { id: 4, imageUrl: "/images/rgcv.png", isJackpot: false, name: "RGCV", multiplier: 5 },
  { id: 5, imageUrl: "/images/Jackpot.png", isJackpot: true, name: "π", multiplier: 0 },
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
  const [jackpotAmount, setJackpotAmount] = useState(INITIAL_JACKPOT);
  const [reels, setReels] = useState<SlotSymbol[][]>([
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
    [FALLBACK_SYMBOL, FALLBACK_SYMBOL, FALLBACK_SYMBOL],
  ]);
  const [reelStates, setReelStates] = useState([true, true, true]); // All reels stopped initially
  const [seed, setSeed] = useState("");
  const [spinResults, setSpinResults] = useState([]);
  const [message, setMessage] = useState("Try Again!"); // Default message
  const [lastJackpotWin, setLastJackpotWin] = useState(null);

  // References to reel elements
  const reelRefs = [useRef(null), useRef(null), useRef(null)];
  
  // Audio references
  const buttonSoundRef = useRef(null);
  const spinningSoundRef = useRef(null);
  const jackpotSoundRef = useRef(null);

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
    // Reset jackpot if last win was yesterday or earlier
    const now = new Date();
    const todayStart = new Date(now.setUTCHours(0, 0, 0, 0));
    
    if (lastJackpotWin instanceof Date && lastJackpotWin < todayStart) {
      setLastJackpotWin(null);
      setJackpotAmount(INITIAL_JACKPOT);
    }
  };

  const generateNewSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString();
    setSeed(randomSeed);
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

    // Play button sound immediately
    playButtonSound();

    // Clear previous message
    setMessage("");

    // 1. Deduct bet from balance
    setCredit((prev) => prev - bet);
    
    // 2. Add to jackpot
    const jackpotContribution = bet * JACKPOT_POOL;
    setJackpotAmount(prev => prev + jackpotContribution);
    
    // 3. Start spinning animation and sound
    setIsSpinning(true);
    setReelStates([false, false, false]); // Start all reels spinning
    playSpinningSound();
    
    // 4. Generate outcomes
    const outcomes = generateOutcomes();
    setSpinResults(outcomes);
    
    // 5. Sequential stopping of reels with CodePen-like timing
    setTimeout(() => {
      // Stop first reel after 800ms
      setReelStates(prev => [true, prev[1], prev[2]]);
      const firstReelSymbols = outcomes[0].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
      setReels(prev => {
        const updated = [...prev];
        updated[0] = firstReelSymbols;
        return updated;
      });
      
      setTimeout(() => {
        // Stop second reel after 1200ms total
        setReelStates(prev => [prev[0], true, prev[2]]);
        const secondReelSymbols = outcomes[1].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        setReels(prev => {
          const updated = [...prev];
          updated[1] = secondReelSymbols;
          return updated;
        });
        
        setTimeout(() => {
          // Stop third reel after 1600ms total
          setReelStates(prev => [prev[0], prev[1], true]);
          const thirdReelSymbols = outcomes[2].map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
          setReels(prev => {
            const updated = [...prev];
            updated[2] = thirdReelSymbols;
            return updated;
          });
          
          // End spinning state and sound
          setIsSpinning(false);
          stopSpinningSound();
          
          // Check for wins and set message
          checkWin();
          
          // Generate new seed for next spin
          generateNewSeed();
        }, 400); // 400ms between second and third reel stops
      }, 400); // 400ms between first and second reel stops
    }, 800); // 800ms until first reel stops
  };

  const checkWin = () => {
    // Check if all three middle symbols match
    const middleRow = [reels[0][1].name, reels[1][1].name, reels[2][1].name];
    const allMatch = middleRow.every(symbol => symbol === middleRow[0]);

    if (allMatch) {
      const winningSymbol = SYMBOLS.find(s => s.name === middleRow[0]);
      if (winningSymbol?.isJackpot) {
        // Jackpot win
        if (!lastJackpotWin || new Date().getUTCDate() !== lastJackpotWin.getUTCDate()) {
          const winAmount = jackpotAmount;
          setCredit(prev => prev + winAmount);
          setMessage(`Jackpot! +${winAmount.toFixed(2)} Pi`);
          
          // Play jackpot sound
          playJackpotSound();
          
          toast({
            title: "🎰 JACKPOT WIN! 🎰",
            description: `You won ${winAmount.toFixed(2)} Pi from the jackpot!`,
            className: "bg-slot-purple text-white",
          });
          setJackpotAmount(INITIAL_JACKPOT);
          setLastJackpotWin(new Date());
          localStorage.setItem('lastJackpotWin', new Date().toISOString());
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
        const effectiveBet = bet * 0.9;
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
      setMessage("Try Again!");
    }
  };

  const adjustBet = (amount) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
    playButtonSound();
  };

  const handleImageError = (e) => {
    const imgElement = e.currentTarget;
    imgElement.onerror = null;
    imgElement.src = '/placeholder.svg';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#3f3f3f] to-[#161616] p-4">
      <div className="bg-[#2e2e2e] rounded-lg shadow-2xl p-6 w-full max-w-2xl border-4 border-[#ffd700]">
        <div className="flex flex-col space-y-4">
          {/* Balance and Jackpot Display */}
          <div className="flex justify-between gap-4 mb-2">
            <div className="text-2xl font-bold text-center bg-[#d4af37] text-white py-2 px-4 rounded-md flex-1 shadow-inner shadow-[#ffea00]">
              <span className="block text-sm font-normal">Balance</span>
              {credit.toFixed(2)} Pi
            </div>
            <div className="text-2xl font-bold text-center bg-[#B10DC9] text-white py-2 px-4 rounded-md flex-1 animate-pulse shadow-inner shadow-[#e535ff]">
              <span className="block text-sm font-normal">Jackpot</span>
              {jackpotAmount.toFixed(2)} Pi
            </div>
          </div>

          {/* Message Bar */}
          <div className="text-xl font-bold text-center mb-4 py-2 px-4 rounded-md bg-black text-white border-2 border-[#ffd700]">
            {message}
          </div>

          {/* Slot Machine Display */}
          <div className="grid grid-cols-3 gap-2 mb-6 bg-black p-6 rounded-lg border-4 border-[#ffd700] relative">
            {/* Golden Highlight for Middle Row (winning line) */}
            <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-[90px] bg-[#ffd700]/20 z-0 border-y-2 border-[#ffd700]"></div>
            
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="relative overflow-hidden h-[270px] bg-[#111] rounded border-2 border-[#444]">
                <div 
                  ref={reelRefs[reelIndex]}
                  className={`flex flex-col transition-all duration-500 ${!reelStates[reelIndex] ? "animate-spin-reel" : ""}`}
                  style={{ transform: "translateY(0)" }}
                >
                  {/* Use actual symbols instead of slot.jpg */}
                  {reel.map((symbol, symbolIndex) => (
                    <div 
                      key={symbolIndex} 
                      className="flex items-center justify-center h-[90px] border-b border-[#333]"
                    >
                      <img 
                        src={symbol.imageUrl}
                        alt={symbol.name}
                        onError={handleImageError}
                        className="h-[70px] w-[70px] object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bet Controls */}
          <div className="flex justify-between items-center mb-4 bg-[#222] p-3 rounded-md border border-[#444]">
            <Button
              variant="outline"
              onClick={() => adjustBet(-0.5)}
              disabled={isSpinning}
              className="w-24 bg-[#d4af37] text-black border-[#ffd700] hover:bg-[#ffd700]"
            >
              -0.5
            </Button>
            <div className="text-xl font-bold text-white">Bet: {bet.toFixed(2)} Pi</div>
            <Button
              variant="outline"
              onClick={() => adjustBet(0.5)}
              disabled={isSpinning}
              className="w-24 bg-[#d4af37] text-black border-[#ffd700] hover:bg-[#ffd700]"
            >
              +0.5
            </Button>
          </div>

          {/* Spin Button */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setBet(MAX_BET)}
              disabled={isSpinning}
              className="bg-[#B10DC9] hover:bg-[#8B5CF6] text-white border-2 border-[#e535ff]"
            >
              Max Bet
            </Button>
            <Button
              onClick={spin}
              disabled={isSpinning}
              className="bg-[#d4af37] hover:bg-[#ffd700] text-black w-32 h-12 text-lg font-bold border-2 border-[#ffd700] shadow-lg shadow-[#ffd700]/30"
            >
              {isSpinning ? "Spinning..." : "SPIN"}
            </Button>
          </div>
        </div>
      </div>

      {/* Fix: Removed the 'jsx: true' property which was causing the type error */}
      <style>
        {`
          @keyframes spin-reel {
            0% { transform: translateY(0); }
            100% { transform: translateY(-${90 * SYMBOLS.length}px); }
          }
          
          .animate-spin-reel {
            animation: spin-reel 0.5s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default SlotMachine;
