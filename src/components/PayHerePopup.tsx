export type PayHerePayment = Record<string, string | boolean>;

type PayHereSdk = {
  startPayment: (payment: PayHerePayment) => void;
  onCompleted: (orderId: string) => void;
  onDismissed: () => void;
  onError: (error: string) => void;
};

declare global {
  interface Window {
    payhere?: PayHereSdk;
  }
}

let sdk: Promise<PayHereSdk> | undefined;

function loadSdk(): Promise<PayHereSdk> {
  if (window.payhere) return Promise.resolve(window.payhere);
  if (sdk) return sdk;
  sdk = new Promise<PayHereSdk>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.payhere.lk/lib/payhere.js";
    s.async = true;
    s.onload = () => (window.payhere ? resolve(window.payhere) : reject(new Error("PayHere didn't load.")));
    s.onerror = () => reject(new Error("PayHere couldn't be reached."));
    document.head.appendChild(s);
  });
  sdk.catch(() => (sdk = undefined));
  return sdk;
}

/**
 * Opens PayHere's payment window on top of our checkout page (no redirect). Resolves "completed" when the customer
 * paid in the window (our server still waits for PayHere's signed notification before marking the order paid),
 * "dismissed" if they closed it, and rejects with a message on errors.
 */
export async function openPayHere(payment: PayHerePayment): Promise<"completed" | "dismissed"> {
  const payhere = await loadSdk();
  return new Promise((resolve, reject) => {
    payhere.onCompleted = () => resolve("completed");
    payhere.onDismissed = () => resolve("dismissed");
    payhere.onError = (e) => reject(new Error(e || "The payment couldn't be completed."));
    payhere.startPayment(payment);
  });
}
