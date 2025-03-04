
import { useSlotMachine } from '@/hooks/useSlotMachine';
import SlotReel from './slots/SlotReel';
import BetControls from './slots/BetControls';
import { Button } from '@/components/ui/button';
import { SYMBOLS } from '@/utils/slotMachineConfig';

const SlotMachine = () => {
  const {
    credit,
    bet,
    isSpinning,
    jackpotAmount,
    spinResults,
    message,
    winClass,
    isPiUser,
    spin,
    adjustBet,
    setMinBet,
    setMaxBet,
    handleReelAnimationComplete
  } = useSlotMachine();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-500 to-gray-300 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        {isPiUser && (
          <div className="mb-4 p-2 bg-slot-purple text-white text-center rounded-md">
            Connected to Pi Network
          </div>
        )}
        
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
          className={`relative flex justify-between p-6 bg-gradient-to-br from-gray-500 to-gray-300 border-t border-r border-l border-b border-t-white/60 border-r-white/60 border-l-black/40 border-b-black/40 shadow-md rounded mx-auto mb-6 w-full max-w-md ${winClass}`}
        >
          {[0, 1, 2].map((reelIndex) => (
            <SlotReel
              key={reelIndex}
              reelIndex={reelIndex}
              targetPosition={spinResults[reelIndex]?.[1] || 0}
              isSpinning={isSpinning}
              onAnimationComplete={() => handleReelAnimationComplete(reelIndex)}
            />
          ))}
          
          <div className="absolute top-1/2 left-0 w-2.5 h-0.5 bg-black/50 -translate-x-[200%] -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-2.5 h-0.5 bg-black/50 translate-x-[200%] -translate-y-1/2"></div>
        </div>

        <BetControls
          bet={bet}
          isSpinning={isSpinning}
          onBetChange={adjustBet}
          onSetMinBet={setMinBet}
          onSetMaxBet={setMaxBet}
          onSpin={spin}
        />

        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-bold mb-2">Symbol Values:</h3>
          <div className="grid grid-cols-3 gap-2">
            {SYMBOLS.map(symbol => (
              <div key={symbol.id} className="flex items-center space-x-2 bg-gray-100 p-2 rounded">
                <img 
                  src={symbol.imageUrl} 
                  alt={symbol.name} 
                  className="w-8 h-8 object-contain" 
                />
                <div className="text-xs">
                  <div className="font-bold">{symbol.name}</div>
                  <div>
                    {symbol.isJackpot ? "Jackpot" : ""}
                    {symbol.multiplier > 0 ? ` ${symbol.multiplier}x` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;
