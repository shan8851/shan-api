import { loadEnvironment } from '../config/env.js';

import { createDatabaseConnection } from './client.js';
import { loadShanSiteSnapshot } from './importer/loadShanSiteSnapshot.js';
import {
  runBootstrapImport,
  type RunBootstrapImportOptions,
} from './importer/runBootstrapImport.js';
import type { BootstrapImportSummary, ImportMode } from './importer/types.js';

type SeedCliOptions = {
  mode: ImportMode;
};

const parseSeedCliOptions = (argv: string[]): SeedCliOptions => ({
  mode: argv.includes('--dry-run') ? 'dry-run' : 'apply',
});

const formatResourceSummaryLine = (
  label: string,
  summary: {
    inserted: number;
    updated: number;
    deactivated: number;
    unchanged: number;
  },
): string =>
  `${label}: inserted=${summary.inserted}, updated=${summary.updated}, deactivated=${summary.deactivated}, unchanged=${summary.unchanged}`;

const formatMetaSummaryLine = (
  summary: BootstrapImportSummary['meta'],
): string =>
  `meta: inserted=${summary.inserted}, updated=${summary.updated}, unchanged=${summary.unchanged}`;

const printSummary = (summary: BootstrapImportSummary): void => {
  const lines = [
    `Bootstrap import mode: ${summary.mode}`,
    formatResourceSummaryLine('uses', summary.uses),
    formatResourceSummaryLine('now_entries', summary.nowEntries),
    formatResourceSummaryLine('projects', summary.projects),
    formatResourceSummaryLine('posts', summary.posts),
    formatMetaSummaryLine(summary.meta),
  ];

  process.stdout.write(`${lines.join('\n')}\n`);
};

const runSeed = async (): Promise<void> => {
  const environment = loadEnvironment();
  const databaseConnection = createDatabaseConnection(environment.databaseUrl);
  const cliOptions = parseSeedCliOptions(process.argv.slice(2));

  try {
    const snapshot = await loadShanSiteSnapshot();

    const importOptions: RunBootstrapImportOptions = {
      mode: cliOptions.mode,
      snapshot,
    };

    const summary = await runBootstrapImport(
      databaseConnection.client,
      importOptions,
    );

    printSummary(summary);
  } finally {
    await databaseConnection.close();
  }
};

runSeed().catch((error: unknown) => {
  const errorMessage =
    error instanceof Error ? error.stack ?? error.message : String(error);

  process.stderr.write(`Seed failed: ${errorMessage}\n`);
  process.exit(1);
});
