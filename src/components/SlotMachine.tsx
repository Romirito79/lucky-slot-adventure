
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Cherry, Grape, Apple } from 'lucide-react';

const SYMBOLS = [
  { id: 1, component: Cherry, color: "#FF4136" },
  { id: 2, component: Grape, color: "#B10DC9" },
  { id: 3, component: Cherry, color: "#FF7F50" },  // Changed from Lemon to Cherry with different color
  { id: 4, component: Apple, color: "#FF4136" },
];

const INITIAL_CREDIT = 100;
const MIN_BET = 0.5;
const MAX_BET = 10;
const JACKPOT_MULTIPLIER = 50; // Higher reward for jackpot

const SlotMachine = () => {
  const { toast } = useToast();
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const [credit, setCredit] = useState(INITIAL_CREDIT);
  const [bet, setBet] = useState(MIN_BET);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isJackpotMode, setIsJackpotMode] = useState(false);
  const [reels, setReels] = useState([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[1], SYMBOLS[2], SYMBOLS[3]],
    [SYMBOLS[2], SYMBOLS[3], SYMBOLS[0]],
  ]);

  useEffect(() => {
    // Create audio element for spinning sound
    spinSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
    spinSoundRef.current.load();
  }, []);

  const playSpinSound = () => {
    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(e => console.log("Audio play failed:", e));
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

    setIsSpinning(true);
    setCredit((prev) => prev - bet);
    playSpinSound();

    // Simulate reel spinning
    const spinDuration = 2000;
    const spinInterval = 100;
    let spins = 0;

    const spinInterval$ = setInterval(() => {
      setReels((currentReels) =>
        currentReels.map((reel) => {
          const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, 3);
        })
      );

      spins += spinInterval;
      if (spins >= spinDuration) {
        clearInterval(spinInterval$);
        setIsSpinning(false);
        checkWin();
      }
    }, spinInterval);
  };

  const checkWin = () => {
    // Simple win check - middle row matching
    const middleRow = reels.map((reel) => reel[1].id);
    const isWin = middleRow.every((id) => id === middleRow[0]);

    if (isWin) {
      const multiplier = isJackpotMode ? JACKPOT_MULTIPLIER : 10;
      const winAmount = bet * multiplier;
      setCredit((prev) => prev + winAmount);
      toast({
        title: isJackpotMode ? "JACKPOT WIN! 🎉" : "Winner!",
        description: `You won $${winAmount.toFixed(2)}!`,
        className: isJackpotMode ? "bg-slot-purple text-white" : "bg-slot-gold text-black",
      });
    }
    setIsJackpotMode(false); // Reset jackpot mode after spin
  };

  const adjustBet = (amount: number) => {
    const newBet = Math.max(MIN_BET, Math.min(MAX_BET, bet + amount));
    setBet(newBet);
  };

  const activateJackpot = () => {
    if (credit < bet * 2) {
      toast({
        title: "Insufficient Credit",
        description: "Jackpot mode requires double your current bet.",
        variant: "destructive",
      });
      return;
    }
    setIsJackpotMode(true);
    setBet((prevBet) => prevBet * 2);
    toast({
      title: "Jackpot Mode Activated! 🎰",
      description: "Higher stakes, bigger rewards!",
      className: "bg-slot-purple text-white",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slot-orange to-slot-gold p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        <div className="text-2xl font-bold text-center mb-4 bg-slot-red text-white py-2 rounded-md animate-shine">
          Credit: ${credit.toFixed(2)}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-100 p-4 rounded-lg">
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="flex flex-col items-center space-y-4 overflow-hidden">
              {reel.map((symbol, symbolIndex) => {
                const Symbol = symbol.component;
                return (
                  <div
                    key={`${reelIndex}-${symbolIndex}`}
                    className={`p-4 bg-white rounded-lg shadow transition-transform ${
                      isSpinning ? "animate-spin-slow" : ""
                    }`}
                  >
                    <Symbol size={48} color={symbol.color} />
                  </div>
                );
              })}
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
          <div className="text-xl font-bold">Bet: ${bet.toFixed(2)}</div>
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
            onClick={activateJackpot}
            disabled={isSpinning || isJackpotMode}
            className="bg-slot-gold hover:bg-yellow-600 text-black font-bold animate-pulse"
          >
            JACKPOT 🎰
          </Button>
          <Button
            onClick={spin}
            disabled={isSpinning}
            className={`hover:bg-red-700 text-white w-32 h-12 text-lg font-bold animate-glow ${
              isJackpotMode ? "bg-slot-purple" : "bg-slot-red"
            }`}
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;
