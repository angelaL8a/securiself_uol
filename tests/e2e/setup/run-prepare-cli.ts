import { buildE2EApps } from "./build-apps";
import { runPrepareE2E } from "./run-prepare";

runPrepareE2E({ skipSchemaSync: false });
buildE2EApps();
