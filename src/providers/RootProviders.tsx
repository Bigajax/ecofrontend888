import { PropsWithChildren } from "react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { RingsProvider } from "@/contexts/RingsContext";
import { ProgramProvider } from "@/contexts/ProgramContext";
import { GuestExperienceProvider } from "@/contexts/GuestExperienceContext";

function AuthAwareChatProvider({ children }: PropsWithChildren): JSX.Element {
  const { userId } = useAuth();
  return <ChatProvider key={userId ?? "anon"}>{children}</ChatProvider>;
}

function AuthAwareRingsProvider({ children }: PropsWithChildren): JSX.Element {
  const { userId } = useAuth();
  return <RingsProvider key={userId ?? "anon"}>{children}</RingsProvider>;
}

export function RootProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <AuthProvider>
      <GuestExperienceProvider>
        <ProgramProvider>
          <AuthAwareChatProvider>
            <AuthAwareRingsProvider>{children}</AuthAwareRingsProvider>
          </AuthAwareChatProvider>
        </ProgramProvider>
      </GuestExperienceProvider>
    </AuthProvider>
  );
}
