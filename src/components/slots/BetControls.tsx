
import { Button } from "@/components/ui/button";
import { MIN_BET, MAX_BET } from '@/utils/slotMachineConfig';

interface BetControlsProps {
  bet: number;
  isSpinning: boolean;
  onBetChange: (amount: number) => void;
  onSetMinBet: () => void;
  onSetMaxBet: () => void;
  onSpin: () => void;
}

const BetControls = ({ bet, isSpinning, onBetChange, onSetMinBet, onSetMaxBet, onSpin }: BetControlsProps) => {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={() => onBetChange(-0.5)}
          disabled={isSpinning}
          className="w-24"
        >
          -0.5
        </Button>
        <div className="text-xl font-bold">Bet: {bet.toFixed(2)} Pi</div>
        <Button
          variant="outline"
          onClick={() => onBetChange(0.5)}
          disabled={isSpinning}
          className="w-24"
        >
          +0.5
        </Button>
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          onClick={onSetMinBet}
          disabled={isSpinning}
          className="bg-slot-orange hover:bg-orange-700 text-white"
        >
          Min Bet
        </Button>
        <Button
          onClick={onSpin}
          disabled={isSpinning}
          className="bg-slot-red hover:bg-red-700 text-white w-32 h-12 text-lg font-bold animate-glow"
        >
          {isSpinning ? "Spinning..." : "SPIN"}
        </Button>
        <Button
          onClick={onSetMaxBet}
          disabled={isSpinning}
          className="bg-slot-purple hover:bg-purple-700 text-white"
        >
          Max Bet
        </Button>
      </div>
    </>
  );
};

export default BetControls;
