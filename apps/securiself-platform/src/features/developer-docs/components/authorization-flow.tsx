import { AUTHORIZATION_FLOW, type AuthorizationFlowStep } from "../developer-docs";
import { BoundaryTag } from "./docs-primitives";

/**
 * The causal chain from consent to a Context-filtered profile.
 *
 * An ordered list, not a drawing: the numbering, the actor label and the
 * artifact label each carry the meaning in text, so the sequence survives
 * without colour, arrows or a screen-reader-hostile diagram. The `artifact`
 * column is what makes the authorization-code/access-token transition legible
 * at a glance — the code is carried for three steps and then never again.
 *
 * Steps with a `phase` show it as a label on the first step of each run, so a
 * shorter list can group itself by channel (browser, server, API request).
 */
export function AuthorizationFlow({
  steps = AUTHORIZATION_FLOW,
}: {
  steps?: AuthorizationFlowStep[];
}) {
  return (
    <ol className="space-y-0 rounded-lg border">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-3 border-b p-3 last:border-b-0 sm:gap-4"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums"
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            {step.phase && step.phase !== steps[index - 1]?.phase ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {step.phase}
              </p>
            ) : null}
            <p className="text-sm font-medium leading-snug">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </p>
            <p className="break-words text-sm text-muted-foreground">
              {step.detail}
            </p>
          </div>
          <div className="flex w-32 shrink-0 flex-col items-start gap-1 sm:w-40">
            <BoundaryTag kind={step.actor} />
            {step.artifact ? (
              <span className="break-words rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
                carries: {step.artifact}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
