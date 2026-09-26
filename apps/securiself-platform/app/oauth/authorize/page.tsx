import { Suspense } from "react";
import { OAuthConsent } from "@/features/oauth/components/oauth-consent";

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={null}>
      <OAuthConsent />
    </Suspense>
  );
}
