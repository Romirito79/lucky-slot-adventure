import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import sha256 from 'crypto-js/sha256';

interface SlotSymbol {
  id: number;
  imageUrl: string;
  isJackpot: boolean;
  name: string;
  multiplier: number;
}

const SYMBOLS: SlotSymbol[] = [
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
  
  const reelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const slotsRef = useRef<HTMLDivElement | null>(null);
  
  const buttonSoundRef = useRef(null);
  const spinningSoundRef = useRef(null);
  const jackpotSoundRef = useRef(null);

  const [winClass, setWinClass] = useState("");

  useEffect(() => {
    buttonSoundRef.current = new Audio('/music/button.flac');
    spinningSoundRef.current = new Audio('/music/spinning.mp3');
    jackpotSoundRef.current = new Audio('/music/jackpot.wav');

    if (spinningSoundRef.current) {
      spinningSoundRef.current.loop = true;
    }

    [buttonSoundRef, spinningSoundRef, jackpotSoundRef].forEach(ref => {
      if (ref.current) ref.current.load();
    });

    const slotImage = new Image();
    slotImage.src = '/images/slot.jpg';
    slotImage.onload = () => {
      console.log("Slot image preloaded successfully");
    };
    slotImage.onerror = (e) => {
      console.error("Failed to preload slot image:", e);
    };

    generateNewSeed();
    checkJackpotReset();

    const savedJackpotWin = localStorage.getItem('lastJackpotWin');
    if (savedJackpotWin) {
      setLastJackpotWin(new Date(savedJackpotWin));
    }

    return () => {
      if (spinningSoundRef.current) {
        spinningSoundRef.current.pause();
        spinningSoundRef.current.currentTime = 0;
      }
    };
  }, []);

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
      return;
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
    console.log("New seed generated:", randomSeed);
  };

  const generateOutcomes = () => {
    const timestamp = new Date().getTime();
    const combinedSeed = seed + timestamp.toString();
    const hash = sha256(combinedSeed).toString();

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

  const rollReel = (reelIndex, offset = 0, targetPosition) => {
    return new Promise<void>((resolve) => {
      const reel = reelRefs.current[reelIndex];
      if (!reel) {
        resolve();
        return;
      }

      const delta = (offset + 2) * NUM_ICONS + Math.round(Math.random() * NUM_ICONS);
      
      const totalDelta = delta + targetPosition;
      
      const style = getComputedStyle(reel);
      const currentPos = parseFloat(style.backgroundPositionY || "0");
      
      const targetPos = currentPos + (totalDelta * ICON_HEIGHT);
      
      const normalizedTargetPos = targetPos % (NUM_ICONS * ICON_HEIGHT);

      setTimeout(() => {
        reel.style.transition = `background-position-y ${(8 + totalDelta) * TIME_PER_ICON}ms cubic-bezier(.41,-0.01,.63,1.09)`;
        reel.style.backgroundPositionY = `${targetPos}px`;
        
        setTimeout(() => {
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

    if (isSpinning) {
      return;
    }

    playButtonSound();

    setMessage("");

    setCredit((prev) => prev - bet);
    
    const jackpotContribution = bet * JACKPOT_POOL;
    setJackpotAmount(prev => prev + jackpotContribution);
    
    setIsSpinning(true);
    playSpinningSound();
    
    const outcomes = generateOutcomes();
    setSpinResults(outcomes);
    
    Promise.all(
      reelRefs.current.map((reel, i) => {
        const middleSymbol = outcomes[i][1];
        return rollReel(i, i, middleSymbol);
      })
    ).then(() => {
      setReels(prev => {
        const updatedReels = [...prev];
        outcomes.forEach((outcome, reelIndex) => {
          updatedReels[reelIndex] = outcome.map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        });
        return updatedReels;
      });
      
      setIsSpinning(false);
      stopSpinningSound();
      
      checkWin();
      
      generateNewSeed();
    });
  };

  const checkWin = () => {
    const middleRowIndices = spinResults.map(reel => reel[1]);
    
    console.log("Middle row indices:", middleRowIndices);
    
    const allMatch = middleRowIndices[0] === middleRowIndices[1] && middleRowIndices[1] === middleRowIndices[2];

    if (allMatch) {
      const winningSymbolIndex = middleRowIndices[0];
      
      if (winningSymbolIndex !== undefined && Number.isInteger(winningSymbolIndex) && winningSymbolIndex >= 0 && winningSymbolIndex < SYMBOLS.length) {
        const winningSymbol = SYMBOLS[winningSymbolIndex];
        const effectiveBet = bet * 0.9;

        if (winningSymbol.isJackpot) {
          if (!lastJackpotWin || new Date().getUTCDate() !== lastJackpotWin.getUTCDate()) {
            const winAmount = jackpotAmount;
            setCredit(prev => prev + winAmount);
            setMessage(`JACKPOT! +${winAmount.toFixed(2)} Pi`);
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
          const multiplier = winningSymbol.multiplier;

          if (multiplier > 0) {
            const winAmount = effectiveBet * multiplier;
            setCredit(prev => prev + winAmount);
            setMessage(`Winner! +${winAmount.toFixed(2)} Pi`);
            toast({
              title: "Winner!",
              description: `You won ${winAmount.toFixed(2)} Pi! (${multiplier}x your bet)`,
              className: "bg-slot-gold text-black",
            });
            setWinClass("win2");
          } else {
            setMessage("Try Again!");
            setWinClass("");
          }
        }
      } else {
        setMessage("Try Again!");
        setWinClass("");
        console.error("Invalid symbol index:", winningSymbolIndex);
      }
    } else {
      setMessage("Try Again!");
      setWinClass("");
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
                backgroundSize: "79px auto",
                backgroundRepeat: "repeat-y"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 shadow-inner"></div>
            </div>
          ))}
          
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
