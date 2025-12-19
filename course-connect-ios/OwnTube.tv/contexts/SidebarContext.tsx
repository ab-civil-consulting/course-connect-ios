import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LayoutAnimation, Platform } from "react-native";
import { readFromAsyncStorage, writeToAsyncStorage } from "../utils";

interface SidebarContextValue {
  isManuallyExpanded: boolean | null; // null = auto (follows breakpoint), true/false = user preference
  toggleSidebar: (currentExpandedState: boolean) => void;
  setSidebarExpanded: (expanded: boolean | null) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarContextProvider = ({ children }: { children: ReactNode }) => {
  const [isManuallyExpanded, setIsManuallyExpanded] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    readFromAsyncStorage("SIDEBAR_EXPANDED").then((value) => {
      if (value === "true") {
        setIsManuallyExpanded(true);
      } else if (value === "false") {
        setIsManuallyExpanded(false);
      }
      // If null/undefined, keep as null (auto mode)
      setIsLoaded(true);
    });
  }, []);

  const toggleSidebar = (currentExpandedState: boolean) => {
    // Trigger smooth animation (not on web)
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
      );
    }

    // Simply toggle to opposite of current visual state
    const newValue = !currentExpandedState;
    setIsManuallyExpanded(newValue);
    writeToAsyncStorage("SIDEBAR_EXPANDED", String(newValue));
  };

  const setSidebarExpanded = (expanded: boolean | null) => {
    setIsManuallyExpanded(expanded);

    if (expanded === null) {
      writeToAsyncStorage("SIDEBAR_EXPANDED", "");
    } else {
      writeToAsyncStorage("SIDEBAR_EXPANDED", String(expanded));
    }
  };

  // Don't render children until we've loaded the preference
  if (!isLoaded) {
    return null;
  }

  return (
    <SidebarContext.Provider value={{ isManuallyExpanded, toggleSidebar, setSidebarExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarContextProvider");
  }
  return context;
};
