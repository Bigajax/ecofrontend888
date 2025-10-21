import { PropsWithChildren } from "react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";

function AuthAwareChatProvider({ children }: PropsWithChildren): JSX.Element {
  const { userId } = useAuth();
  return <ChatProvider key={userId ?? "anon"}>{children}</ChatProvider>;
}

export function RootProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <AuthProvider>
      <AuthAwareChatProvider>{children}</AuthAwareChatProvider>
    </AuthProvider>
  );
}
