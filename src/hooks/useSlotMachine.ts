
import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { 
  SYMBOLS, 
  FALLBACK_SYMBOL, 
  INITIAL_CREDIT, 
  MIN_BET, 
  MAX_BET, 
  JACKPOT_POOL, 
  INITIAL_JACKPOT, 
  SlotSymbol 
} from '@/utils/slotMachineConfig';
import { generateNewSeed, generateOutcomes } from '@/utils/provablyFair';
import { soundService } from '@/services/SoundService';
import { piNetworkService } from '@/services/PiNetworkService';

export const useSlotMachine = () => {
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
  const [spinResults, setSpinResults] = useState<number[][]>([]);
  const [message, setMessage] = useState("Try Again!");
  const [lastJackpotWin, setLastJackpotWin] = useState<Date | null>(null);
  const [winClass, setWinClass] = useState("");
  const [reelAnimationsCompleted, setReelAnimationsCompleted] = useState<Record<number, boolean>>({
    0: false, 1: false, 2: false
  });
  const [isPiUser, setIsPiUser] = useState(false);

  // Initialize on first load
  useEffect(() => {
    soundService.initialize();
    
    // Initialize Pi Network
    const initializePiNetwork = async () => {
      try {
        const isPiNetworkUser = await piNetworkService.initialize();
        setIsPiUser(isPiNetworkUser);
        if (isPiNetworkUser) {
          toast({
            title: "Pi Network Connected",
            description: "You're playing using your Pi Network account",
            className: "bg-slot-purple text-white",
          });
        }
      } catch (error) {
        console.error("Failed to initialize Pi Network:", error);
      }
    };
    
    initializePiNetwork();
    
    const slotImage = new Image();
    slotImage.src = '/images/slot.jpg';
    slotImage.onload = () => {
      console.log("Slot image preloaded successfully");
    };
    slotImage.onerror = (e) => {
      console.error("Failed to preload slot image:", e);
    };

    setSeed(generateNewSeed());
    checkJackpotReset();

    const savedJackpotWin = localStorage.getItem('lastJackpotWin');
    if (savedJackpotWin) {
      setLastJackpotWin(new Date(savedJackpotWin));
    }
  }, []);

  useEffect(() => {
    if (winClass) {
      const timer = setTimeout(() => {
        setWinClass("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [winClass]);

  useEffect(() => {
    // Check if all reel animations are complete
    if (isSpinning && reelAnimationsCompleted[0] && reelAnimationsCompleted[1] && reelAnimationsCompleted[2]) {
      setReels(prev => {
        const updatedReels = [...prev];
        spinResults.forEach((outcome, reelIndex) => {
          updatedReels[reelIndex] = outcome.map(idx => SYMBOLS[idx] || FALLBACK_SYMBOL);
        });
        return updatedReels;
      });
      
      setIsSpinning(false);
      soundService.stopSpinningSound();
      
      checkWin();
      setSeed(generateNewSeed());
      
      // Reset animation completed states
      setReelAnimationsCompleted({0: false, 1: false, 2: false});
    }
  }, [reelAnimationsCompleted, isSpinning]);

  const checkJackpotReset = () => {
    const now = new Date();
    const todayStart = new Date(now.setUTCHours(0, 0, 0, 0));
    
    if (lastJackpotWin instanceof Date && lastJackpotWin < todayStart) {
      setLastJackpotWin(null);
      setJackpotAmount(INITIAL_JACKPOT);
    }
  };

  const handleReelAnimationComplete = (reelIndex: number) => {
    setReelAnimationsCompleted(prev => ({
      ...prev,
      [reelIndex]: true
    }));
  };

  const checkWin = () => {
    // Get middle row (index 1) for each reel
    if (!spinResults || spinResults.length !== 3) {
      console.error("Invalid spin results:", spinResults);
      return;
    }
    
    console.log("Checking win with spin results:", spinResults);
    
    // Extract the middle row from each reel (index 1)
    const middleRow = [
      spinResults[0][1],
      spinResults[1][1],
      spinResults[2][1]
    ];
    
    console.log("Middle row to check:", middleRow);
    
    // Check if all symbols in the middle row are the same
    const allMatch = middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2];
    console.log("All match?", allMatch);

    if (allMatch) {
      const winningSymbolIndex = middleRow[0];
      console.log("Winning symbol index:", winningSymbolIndex);
      
      if (winningSymbolIndex !== undefined && Number.isInteger(winningSymbolIndex) && winningSymbolIndex >= 0 && winningSymbolIndex < SYMBOLS.length) {
        const winningSymbol = SYMBOLS[winningSymbolIndex];
        console.log("Winning symbol:", winningSymbol);
        const effectiveBet = bet * 0.9;

        if (winningSymbol.isJackpot) {
          if (!lastJackpotWin || new Date().getUTCDate() !== lastJackpotWin.getUTCDate()) {
            const winAmount = jackpotAmount;
            setCredit(prev => prev + winAmount);
            setMessage(`JACKPOT! +${winAmount.toFixed(2)} Pi`);
            soundService.playJackpotSound();
            toast({
              title: "🎰 JACKPOT WIN! 🎰",
              description: `You won ${winAmount.toFixed(2)} Pi from the jackpot!`,
              className: "bg-slot-purple text-white",
            });
            setJackpotAmount(INITIAL_JACKPOT);
            setLastJackpotWin(new Date());
            localStorage.setItem('lastJackpotWin', new Date().toISOString());
            setWinClass("win2");
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

    soundService.playButtonSound();
    setMessage("");
    setCredit((prev) => prev - bet);
    
    const jackpotContribution = bet * JACKPOT_POOL;
    setJackpotAmount(prev => prev + jackpotContribution);
    
    setIsSpinning(true);
    soundService.playSpinningSound();
    
    const outcomes = generateOutcomes(seed);
    console.log("Generated spin outcomes:", outcomes);
    setSpinResults(outcomes);
  };

  const adjustBet = (amount: number) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
    soundService.playButtonSound();
  };

  const setMinBet = () => {
    setBet(MIN_BET);
    soundService.playButtonSound();
  };

  const setMaxBet = () => {
    setBet(MAX_BET);
    soundService.playButtonSound();
  };

  return {
    credit,
    bet,
    isSpinning,
    jackpotAmount,
    reels,
    spinResults,
    message,
    winClass,
    isPiUser,
    spin,
    adjustBet,
    setMinBet,
    setMaxBet,
    handleReelAnimationComplete
  };
};
