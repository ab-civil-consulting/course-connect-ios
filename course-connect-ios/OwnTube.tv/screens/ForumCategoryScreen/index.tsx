import { ThreadList } from "../../components/Forum";
import { useAppConfigContext } from "../../contexts";
import { Screen } from "../../layouts/Screen";
import { useLocalSearchParams } from "expo-router";

export const ForumCategoryScreen = () => {
  const { currentBackend } = useAppConfigContext();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName?: string }>();

  if (!categoryId) {
    return null;
  }

  return (
    <Screen>
      <ThreadList backend={currentBackend} categoryId={categoryId} categoryName={categoryName} />
    </Screen>
  );
};
