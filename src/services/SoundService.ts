
class SoundService {
  private buttonSound: HTMLAudioElement | null = null;
  private spinningSound: HTMLAudioElement | null = null;
  private jackpotSound: HTMLAudioElement | null = null;
  private initialized: boolean = false;

  initialize() {
    if (this.initialized) return;
    
    this.buttonSound = new Audio('/music/button.flac');
    this.spinningSound = new Audio('/music/spinning.mp3');
    this.jackpotSound = new Audio('/music/jackpot.wav');

    if (this.spinningSound) {
      this.spinningSound.loop = true;
    }

    [this.buttonSound, this.spinningSound, this.jackpotSound].forEach(sound => {
      if (sound) sound.load();
    });

    this.initialized = true;
  }

  playButtonSound() {
    if (this.buttonSound) {
      this.buttonSound.currentTime = 0;
      this.buttonSound.play().catch(e => console.log("Button sound failed:", e));
    }
  }

  playSpinningSound() {
    if (this.spinningSound && !this.spinningSound.paused) {
      return;
    }
    if (this.spinningSound) {
      this.spinningSound.currentTime = 0;
      this.spinningSound.play().catch(e => console.log("Spinning sound failed:", e));
    }
  }

  stopSpinningSound() {
    if (this.spinningSound) {
      this.spinningSound.pause();
      this.spinningSound.currentTime = 0;
    }
  }

  playJackpotSound() {
    if (this.jackpotSound) {
      this.jackpotSound.currentTime = 0;
      this.jackpotSound.play().catch(e => console.log("Jackpot sound failed:", e));
    }
  }
}

// Singleton instance
export const soundService = new SoundService();
