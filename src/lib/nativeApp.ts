import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function openExternalBrowser(url: string) {
  await Browser.open({ url });
}
