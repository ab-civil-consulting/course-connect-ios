import { ForumList } from "../../components/Forum";
import { useAppConfigContext } from "../../contexts";
import { Screen } from "../../layouts/Screen";

export const ForumScreen = () => {
  const { currentBackend } = useAppConfigContext();

  return (
    <Screen>
      <ForumList backend={currentBackend} />
    </Screen>
  );
};
