import { Platform } from "react-native";
import Head from "expo-router/head";
import { useTranslation } from "react-i18next";
import { ForumThreadScreen } from "../../screens/ForumThreadScreen";

export default function forumThread() {
  const { t } = useTranslation();

  return (
    <>
      {Platform.select({
        default: null,
        web: (
          <Head>
            <title>{t("forum.thread")}</title>
            <meta name="description" content="Forum thread discussion" />
          </Head>
        ),
      })}
      <ForumThreadScreen />
    </>
  );
}
