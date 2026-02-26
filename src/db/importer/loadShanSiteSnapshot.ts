import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import type {
  BootstrapContentSnapshot,
  ProjectSnapshot,
} from './types.js';

const defaultShanSiteRootPath = '/home/shan/giles/shan_site';

const usesItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const usesSectionSchema = z.object({
  title: z.string(),
  items: z.array(usesItemSchema),
});

const usesModuleSchema = z.object({
  usesLastUpdated: z.string(),
  usesSections: z.array(usesSectionSchema),
});

const nowLogItemSchema = z.object({
  label: z.string(),
  text: z.string(),
  href: z.string().optional(),
});

const activeProjectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  href: z.string().optional(),
  track: z.enum(['core', 'experiments']),
  status: z.enum(['live', 'in-progress', 'exploring']),
  nextMove: z.string().optional(),
  maturity: z.literal('raw').optional(),
});

const aiProjectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  href: z.string(),
  status: z.enum(['live', 'in-progress']),
  learning: z.string(),
});

const operatorModuleSchema = z.object({
  siteLastUpdated: z.string(),
  nowFocusNarrative: z.string(),
  nowLogItems: z.array(nowLogItemSchema),
  activeProjects: z.array(activeProjectSchema),
  aiProjects: z.array(aiProjectSchema),
});

const parseDateOnlyString = (value: string): Date | null => {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const assertFileExists = async (filePath: string): Promise<void> => {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Required bootstrap source file not found: ${filePath}`);
  }
};

const loadModule = async (filePath: string): Promise<unknown> => {
  const moduleFileUrl = pathToFileURL(filePath).href;
  return import(moduleFileUrl);
};

const mapActiveProjects = (
  activeProjects: z.infer<typeof activeProjectSchema>[],
): ProjectSnapshot[] =>
  activeProjects.map((activeProject) => ({
    sourceGroup: 'active_projects',
    title: activeProject.title,
    summary: activeProject.summary,
    href: activeProject.href ?? null,
    payload: {
      source: 'shan_site',
      sourceGroup: 'active_projects',
      track: activeProject.track,
      status: activeProject.status,
      nextMove: activeProject.nextMove ?? null,
      maturity: activeProject.maturity ?? null,
    },
  }));

const mapAiProjects = (
  aiProjects: z.infer<typeof aiProjectSchema>[],
): ProjectSnapshot[] =>
  aiProjects.map((aiProject) => ({
    sourceGroup: 'ai_projects',
    title: aiProject.title,
    summary: aiProject.summary,
    href: aiProject.href,
    payload: {
      source: 'shan_site',
      sourceGroup: 'ai_projects',
      status: aiProject.status,
      learning: aiProject.learning,
    },
  }));

export type LoadShanSiteSnapshotOptions = {
  shanSiteRootPath?: string;
};

export const loadShanSiteSnapshot = async (
  loadOptions: LoadShanSiteSnapshotOptions = {},
): Promise<BootstrapContentSnapshot> => {
  const shanSiteRootPath =
    loadOptions.shanSiteRootPath ??
    process.env.SHAN_SITE_ROOT ??
    defaultShanSiteRootPath;

  const usesSourceFilePath = join(shanSiteRootPath, 'app/content/uses.ts');
  const operatorSourceFilePath = join(
    shanSiteRootPath,
    'app/content/operatorFrontDoor.ts',
  );

  await Promise.all([
    assertFileExists(usesSourceFilePath),
    assertFileExists(operatorSourceFilePath),
  ]);

  const [usesModuleRaw, operatorModuleRaw] = await Promise.all([
    loadModule(usesSourceFilePath),
    loadModule(operatorSourceFilePath),
  ]);

  const usesModule = usesModuleSchema.parse(usesModuleRaw);
  const operatorModule = operatorModuleSchema.parse(operatorModuleRaw);

  const usesLastUpdated = parseDateOnlyString(usesModule.usesLastUpdated);
  const siteLastUpdated = parseDateOnlyString(operatorModule.siteLastUpdated);

  const projectItems = [
    ...mapActiveProjects(operatorModule.activeProjects),
    ...mapAiProjects(operatorModule.aiProjects),
  ];

  return {
    uses: {
      lastUpdated: usesLastUpdated,
      sections: usesModule.usesSections,
    },
    now: {
      lastUpdated: siteLastUpdated,
      narrative: operatorModule.nowFocusNarrative,
      entries: operatorModule.nowLogItems.map((nowLogItem) => ({
        label: nowLogItem.label,
        text: nowLogItem.text,
        href: nowLogItem.href ?? null,
      })),
    },
    projects: {
      lastUpdated: siteLastUpdated,
      items: projectItems,
    },
  };
};
