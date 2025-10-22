import { Platform } from "react-native";
import Head from "expo-router/head";
import { useTranslation } from "react-i18next";
import { ForumCategoryScreen } from "../../screens/ForumCategoryScreen";

export default function forumCategory() {
  const { t } = useTranslation();

  return (
    <>
      {Platform.select({
        default: null,
        web: (
          <Head>
            <title>{t("forum.threads")}</title>
            <meta name="description" content="Forum category threads" />
          </Head>
        ),
      })}
      <ForumCategoryScreen />
    </>
  );
}
