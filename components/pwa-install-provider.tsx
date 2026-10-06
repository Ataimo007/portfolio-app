"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const Context = createContext<{
  installed: boolean;
  install: () => Promise<string>;
} | null>(null);
export function usePwaInstall() {
  const value = useContext(Context);
  if (!value) throw Error("Installation provider is missing");
  return value;
}
export default function PwaInstallProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    const media = matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(media.matches);
    const initial = setTimeout(update, 0);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const added = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", added);
    media.addEventListener("change", update);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", added);
      media.removeEventListener("change", update);
    };
  }, []);
  async function install() {
    if (installed) return "Ataimo is already running as an installed app.";
    if (!prompt)
      return "On iPhone: Safari → Share → Add to Home Screen. On Android: your browser menu → Install app.";
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    return choice.outcome === "accepted"
      ? "Installation requested. Look for Ataimo on your home screen."
      : "Installation dismissed. You can install whenever you’re ready.";
  }
  return (
    <Context.Provider value={{ installed, install }}>
      {children}
    </Context.Provider>
  );
}
