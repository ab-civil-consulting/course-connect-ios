import { ThreadView } from "../../components/Forum";
import { useAppConfigContext } from "../../contexts";
import { Screen } from "../../layouts/Screen";
import { useLocalSearchParams } from "expo-router";

export const ForumThreadScreen = () => {
  const { currentBackend } = useAppConfigContext();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  if (!threadId) {
    return null;
  }

  return (
    <Screen>
      <ThreadView backend={currentBackend} threadId={threadId} />
    </Screen>
  );
};
