
// Pi Network SDK declarations
declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string }) => void;
      authenticate: (scopes: string[], onIncompletePaymentFound?: Function) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
      createPayment: (payment: { amount: number, memo: string }) => Promise<{id: string}>;
      openPayment: (paymentId: string) => Promise<any>;
    };
  }
}

class PiNetworkService {
  private initialized: boolean = false;
  private accessToken: string | null = null;
  private piUser: { uid: string; username: string } | null = null;
  private apiKey: string = "0h0es3ejgocl5h3zjjoh9e4gooctgidbnwryxcgu0aqzwsufo9vsoamwjkxmva8u";

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (!window.Pi) {
      console.log("Pi SDK not available. Running in non-Pi browser environment.");
      return false;
    }
    
    try {
      window.Pi.init({ version: "2.0" });
      console.log("Pi Network SDK initialized");
      
      const auth = await window.Pi.authenticate(['username'], this.handleIncompletePayment);
      this.accessToken = auth.accessToken;
      this.piUser = auth.user;
      
      console.log("Pi authentication successful:", this.piUser?.username);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Pi Network initialization failed:", error);
      return false;
    }
  }

  handleIncompletePayment(payment: any) {
    console.log("Incomplete payment found:", payment);
    // Handle incomplete payment if needed
  }

  async makePayment(amount: number, memo: string): Promise<string | null> {
    if (!this.initialized || !window.Pi) {
      console.error("Pi Network not initialized");
      return null;
    }
    
    try {
      const payment = await window.Pi.createPayment({
        amount: amount,
        memo: memo,
      });
      
      console.log("Payment created:", payment);
      return payment.id;
    } catch (error) {
      console.error("Payment creation failed:", error);
      return null;
    }
  }

  async completePayment(paymentId: string): Promise<boolean> {
    if (!this.initialized || !window.Pi) {
      console.error("Pi Network not initialized");
      return false;
    }
    
    try {
      const result = await window.Pi.openPayment(paymentId);
      console.log("Payment completed:", result);
      return true;
    } catch (error) {
      console.error("Payment completion failed:", error);
      return false;
    }
  }

  get isAuthenticated(): boolean {
    return this.initialized && this.accessToken !== null;
  }

  get username(): string | null {
    return this.piUser?.username || null;
  }
}

// Singleton instance
export const piNetworkService = new PiNetworkService();
