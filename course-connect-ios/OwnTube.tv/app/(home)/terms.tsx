import Head from "expo-router/head";
import { Platform, ScrollView } from "react-native";
import { Button, Typography } from "../../components";
import { Link, useRouter } from "expo-router";
import { spacing } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROUTES } from "../../types";
import { Spacer } from "../../components/shared/Spacer";
import { useTheme } from "@react-navigation/native";

export default function terms() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
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
            <title>Terms of Service</title>
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
        <Typography fontWeight="Bold" fontSize="sizeLg">Terms of Service</Typography>
        <Typography>{"\n"}</Typography>
        <Typography color={colors.themeDesaturated500}>Effective Date: December 2024</Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">1. Welcome</Typography>
        <Typography>
          Welcome to Course Connect! These Terms of Service apply to all users of the Course Connect mobile application
          (&quot;Course Connect&quot; or the &quot;App&quot;), owned and operated by {process.env.EXPO_PUBLIC_PROVIDER_LEGAL_ENTITY || "AB Civil Consulting LLC"} (&quot;AB Civil,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          By using the App, you agree to be bound by all of the Terms of Service. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT
          REGISTER FOR OR USE ANY OF THE SERVICES OFFERED OR PROVIDED THROUGH COURSE CONNECT. The Services are provided free of charge.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">2. Access and Use of the Service</Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="SemiBold">(a) Use Description</Typography>
        <Typography>
          When you use Course Connect and any content viewed through our Services, we grant to you a limited, non-exclusive,
          non-transferable license to access and use the content for training and information purposes. You agree not to use
          the service for public performances. AB Civil may revoke your license at any time in its sole discretion.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="SemiBold">(b) Your Registration Obligations</Typography>
        <Typography>
          You may be required to register in order to access and use certain features of the Service. If you choose to register,
          you agree to provide and maintain true, accurate, current and complete information about yourself. If you are under 13
          years of age, you are not authorized to use the Service. If you are under 18 years old, you may use the Service only
          with the approval of a parent or guardian.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="SemiBold">(c) Member Account, Password and Security</Typography>
        <Typography>
          You are fully responsible for any and all activities that occur under your password or account. You agree to immediately
          notify AB Civil of any unauthorized use of your password or account or any other breach of security.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="SemiBold">(d) Modifications to Service</Typography>
        <Typography>
          AB Civil reserves the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof)
          with or without notice. You agree that AB Civil will not be liable to you or to any third party for any modification,
          suspension, or discontinuance of the Service.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="SemiBold">(e) Video Hosting</Typography>
        <Typography>
          The Service uses PeerTube, a third-party video hosting platform, to deliver video content. Your use of video content
          is also subject to the terms and policies of the PeerTube instance hosting the content. AB Civil is not responsible
          for the availability, accuracy, or content hosted on third-party PeerTube instances.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">3. Intellectual Property Rights</Typography>
        <Typography>
          All content found on the App or provided through the Services is considered the copyrighted and trademarked
          intellectual property of AB Civil, or of the party that created or licensed the Content. You agree not to modify,
          copy, frame, scrape, rent, lease, loan, sell, distribute, republish, or create derivative works of the Content.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">4. Third Party Websites</Typography>
        <Typography>
          The Service may provide links or other access to other sites and resources on the Internet. AB Civil has no control
          over such sites and resources and is not responsible for and does not endorse such sites and resources.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">5. Disclaimer of Warranties</Typography>
        <Typography>
          YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK. THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS.
          AB CIVIL EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING THE
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">6. Limitation of Liability</Typography>
        <Typography>
          AB CIVIL WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES. IN NO
          EVENT WILL AB CIVIL&apos;S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES OR CAUSES OF ACTION EXCEED ONE HUNDRED
          DOLLARS ($100).
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">7. Termination</Typography>
        <Typography>
          You agree that AB Civil, in its sole discretion, may suspend or terminate your account or use of the Service for
          any reason, including if AB Civil believes that you have violated these Terms of Service.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">8. General</Typography>
        <Typography>
          These Terms of Service will be governed by the laws of the State of Tennessee. We reserve the right to change or
          modify portions of these Terms of Service at any time. Your continued use of the App after changes become effective
          constitutes your acceptance of the new Terms of Service.
        </Typography>
        <Typography>{"\n"}</Typography>

        <Typography fontWeight="Bold">9. Contact Us</Typography>
        <Typography>
          Questions? Concerns? Please contact us at{" "}
          <Link
            style={{ color: colors.theme500, textDecorationLine: "underline" }}
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

