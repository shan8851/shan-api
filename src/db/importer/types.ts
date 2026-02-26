export type UseSectionSnapshot = {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
};

export type NowEntrySnapshot = {
  label: string;
  text: string;
  href: string | null;
};

export type ProjectSnapshot = {
  sourceGroup: 'active_projects' | 'ai_projects';
  title: string;
  summary: string;
  href: string | null;
  payload: Record<string, unknown>;
};

export type BootstrapContentSnapshot = {
  uses: {
    lastUpdated: Date | null;
    sections: UseSectionSnapshot[];
  };
  now: {
    lastUpdated: Date | null;
    narrative: string;
    entries: NowEntrySnapshot[];
  };
  projects: {
    lastUpdated: Date | null;
    items: ProjectSnapshot[];
  };
};

export type ImportMode = 'apply' | 'dry-run';

export type ResourceImportSummary = {
  inserted: number;
  updated: number;
  deactivated: number;
  unchanged: number;
};

export type MetaImportSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
};

export type BootstrapImportSummary = {
  mode: ImportMode;
  uses: ResourceImportSummary;
  nowEntries: ResourceImportSummary;
  projects: ResourceImportSummary;
  meta: MetaImportSummary;
};
