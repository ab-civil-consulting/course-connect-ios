import Head from "expo-router/head";
import { Platform, ScrollView, StyleSheet } from "react-native";
import { Button, Typography } from "../../components";
import { Link, useRouter } from "expo-router";
import { spacing } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROUTES } from "../../types";
import { Spacer } from "../../components/shared/Spacer";
import { colors } from "../../colors";

export default function privacy() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const handleBackButton = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(ROUTES.HOME);
    }
  };

  return (
    <>
      {Platform.select({
        default: null,
        web: (
          <Head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width" />
            <title>Privacy Policy</title>
          </Head>
        ),
      })}
      <ScrollView style={{ padding: spacing.xl, paddingTop: top }}>
        {Platform.select({
          web: <Spacer height={spacing.xl} />,
          default: (
            <Button
              onPress={handleBackButton}
              contrast="high"
              icon="Arrow-Left"
              style={{ alignSelf: "flex-start", marginBottom: spacing.xl }}
            />
          ),
        })}
        <Typography fontWeight="Bold">Privacy Policy</Typography>
        <Typography>
          This privacy policy applies to this app (hereafter referred to as &#34;Application&#34;) for mobile/TV devices
          that is created by {process.env.EXPO_PUBLIC_PROVIDER_LEGAL_ENTITY || "OwnTube Nordic AB"} (hereafter referred
          to as &#34;Service Provider&#34;) as a free service. This service is provided &#34;AS IS&#34;.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">What information does the Application obtain and how is it used?</Typography>
        <Typography>
          <Typography fontWeight="Bold">Optional User Registration:</Typography> Registration is optional but required for
          certain features. When you register, your email and username are sent to a PeerTube instance where your account is
          created.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>
          <Typography fontWeight="Bold">Watch History:</Typography> Your watch history is stored locally on your device
          only. We do not collect this data on our servers. Your watch history is limited to 50 items.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>
          <Typography fontWeight="Bold">User Preferences:</Typography> Your preferences (theme, playback settings) are
          stored locally on your device.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>
          <Typography fontWeight="Bold">Analytics:</Typography> We use PostHog for analytics to understand how the app is
          used. PostHog tracks playback events, user actions, and device information. Data is sent to EU servers
          (eu.i.posthog.com). You can disable analytics through app configuration.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">
          Does the Application collect precise real-time location information of the device?
        </Typography>
        <Typography>This Application does not collect or use precise location data from your mobile device.</Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">
          Do third parties see and/or have access to personal information obtained by the Application?
        </Typography>
        <Typography>
          <Typography fontWeight="Bold">PeerTube:</Typography> Your email and username are shared with the PeerTube instance
          where your account is created. Your watch history on that instance is governed by the PeerTube instance's privacy
          policy.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>
          <Typography fontWeight="Bold">PostHog Analytics:</Typography> Analytics data (playback events, device information)
          is sent to PostHog for analysis. Review PostHog's privacy policy for details on how they handle this data.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>
          <Typography fontWeight="Bold">Casting Services:</Typography> When using Chromecast, AirPlay, or similar features,
          minimal device discovery information may be shared with those services.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">Children</Typography>
        <Typography>
          The Application is intended for users aged 13 and older. We do not knowingly collect any personal data from
          children under 13. If you believe a child has provided personal data, please contact us at{" "}
          <Link
            style={styles.link}
            href={`mailto:${process.env.EXPO_PUBLIC_PROVIDER_LEGAL_EMAIL || "contact@ab-civil.com"}`}
          >
            {process.env.EXPO_PUBLIC_PROVIDER_LEGAL_EMAIL || "contact@ab-civil.com"}
          </Link>{" "}
          so that we can take appropriate action.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">Security</Typography>
        <Typography>
          Watch history and preferences are stored locally on your device. Protect your device with strong authentication
          (passcode or biometric). Keep your device and apps updated. Data sent to PeerTube and PostHog is protected by
          those services' security measures.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">Changes</Typography>
        <Typography>
          This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of
          any changes to this Privacy Policy by updating this page. You are advised to consult this Privacy Policy
          regularly for any updates, as continued use is deemed approval of all changes.
        </Typography>
        <Typography>{"\n"}</Typography>
        <Typography>This privacy policy is effective as of December 2024</Typography>
        <Typography>{"\n"}</Typography>
        <Typography fontWeight="Bold">Contact Us</Typography>
        <Typography>
          If you have any questions regarding privacy while using the Application, please contact the Service Provider
          via email at{" "}
          <Link
            style={styles.link}
            href={`mailto:${process.env.EXPO_PUBLIC_PROVIDER_CONTACT_EMAIL || "contact@ab-civil.com"}`}
          >
            {process.env.EXPO_PUBLIC_PROVIDER_CONTACT_EMAIL || "contact@ab-civil.com"}
          </Link>
          .
        </Typography>
        <Spacer height={spacing.lg} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.blue, textDecorationLine: "underline" },
});
