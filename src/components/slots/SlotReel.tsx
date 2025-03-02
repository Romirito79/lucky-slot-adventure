
import { useRef, useEffect } from 'react';
import { ICON_HEIGHT, NUM_ICONS, TIME_PER_ICON } from '@/utils/slotMachineConfig';

interface SlotReelProps {
  reelIndex: number;
  onAnimationComplete: () => void;
  targetPosition: number;
  isSpinning: boolean;
}

const SlotReel = ({ reelIndex, onAnimationComplete, targetPosition, isSpinning }: SlotReelProps) => {
  const reelRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (isSpinning && reelRef.current) {
      rollReel();
    }
  }, [isSpinning, targetPosition]);
  
  const rollReel = () => {
    const reel = reelRef.current;
    if (!reel) {
      onAnimationComplete();
      return;
    }

    const offset = reelIndex;
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
        onAnimationComplete();
      }, (8 + totalDelta) * TIME_PER_ICON);
    }, offset * 150);
  };

  return (
    <div 
      ref={reelRef}
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
  );
};

export default SlotReel;
