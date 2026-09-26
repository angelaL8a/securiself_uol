"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export interface RevokeContinuationProps {
  applicationName: string;
  contextLabel: string;
}

export function RevokeContinuation({
  applicationName,
  contextLabel,
}: RevokeContinuationProps) {
  return (
    <Alert data-testid="revoke-continuation">
      <CircleCheck aria-hidden="true" />
      <AlertTitle>Grant revoked</AlertTitle>
      <AlertDescription>
        <p>
          Access for {applicationName} to the {contextLabel} Context has been
          revoked. Open Activity to find the Access revoked record, then check
          PrymeCab to confirm that the previous profile access no longer works.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link
            href={routes.console.activity}
            aria-label="View Activity"
            data-testid="revoke-continuation-activity"
          >
            View Activity
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
