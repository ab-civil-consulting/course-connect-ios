import { Platform } from "react-native";
import Head from "expo-router/head";
import { useTranslation } from "react-i18next";
import { ForumScreen } from "../../screens/ForumScreen";

export default function forum() {
  const { t } = useTranslation();

  return (
    <>
      {Platform.select({
        default: null,
        web: (
          <Head>
            <title>{t("forum.communityForum")}</title>
            <meta name="description" content="Community forum and discussions" />
          </Head>
        ),
      })}
      <ForumScreen />
    </>
  );
}
