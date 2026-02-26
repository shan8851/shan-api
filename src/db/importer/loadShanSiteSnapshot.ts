import { access, readFile, readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import matter from 'gray-matter';
import readingTime from 'reading-time';
import { z } from 'zod';

import type {
  BootstrapContentSnapshot,
  PostSnapshot,
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

const frontmatterDateSchema = z.union([z.string(), z.date()]);

const writingPostFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  date: frontmatterDateSchema,
  updated: frontmatterDateSchema.optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().trim().min(1).optional(),
  featured: z.boolean().optional(),
});

const parseDateOnlyString = (value: string): Date | null => {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const parseFrontmatterDate = (value: z.infer<typeof frontmatterDateSchema>): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const roundToTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100;

const getLatestTimestamp = (timestamps: Date[]): Date | null => {
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latestTimestamp, timestamp) =>
    timestamp > latestTimestamp ? timestamp : latestTimestamp,
  );
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

const loadWritingPostFromFile = async (
  writingDirectoryPath: string,
  fileName: string,
): Promise<PostSnapshot> => {
  const filePath = join(writingDirectoryPath, fileName);
  const fileContent = await readFile(filePath, 'utf8');
  const parsedMarkdown = matter(fileContent);
  const frontmatter = writingPostFrontmatterSchema.parse(parsedMarkdown.data);

  const publishedAt = parseFrontmatterDate(frontmatter.date);

  if (!publishedAt) {
    throw new Error(
      `Invalid "date" frontmatter in writing file: ${filePath}`,
    );
  }

  const updatedAtSource = frontmatter.updated
    ? parseFrontmatterDate(frontmatter.updated)
    : null;

  if (frontmatter.updated && !updatedAtSource) {
    throw new Error(
      `Invalid "updated" frontmatter in writing file: ${filePath}`,
    );
  }

  const normalizedTags = (frontmatter.tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const readingStats = readingTime(parsedMarkdown.content);
  const slug = basename(fileName, extname(fileName));

  return {
    slug,
    title: frontmatter.title,
    summary: frontmatter.summary,
    bodyMarkdown: parsedMarkdown.content.trim(),
    publishedAt,
    updatedAtSource,
    author: frontmatter.author ?? null,
    featured: frontmatter.featured ?? false,
    tags: normalizedTags,
    readingTimeText: readingStats.text,
    readingTimeMinutes: roundToTwoDecimals(readingStats.minutes),
    payload: {
      source: 'shan_site',
      sourcePath: `content/writing/${fileName}`,
    },
  };
};

const loadWritingPosts = async (
  shanSiteRootPath: string,
): Promise<{ lastUpdated: Date | null; items: PostSnapshot[] }> => {
  const writingDirectoryPath = join(shanSiteRootPath, 'content/writing');
  await assertFileExists(writingDirectoryPath);

  const writingDirectoryEntries = await readdir(writingDirectoryPath, {
    withFileTypes: true,
  });

  const writingFileNames = writingDirectoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((entryName) => ['.md', '.mdx'].includes(extname(entryName).toLowerCase()))
    .sort((leftFileName, rightFileName) =>
      leftFileName.localeCompare(rightFileName),
    );

  const posts = await Promise.all(
    writingFileNames.map((fileName) =>
      loadWritingPostFromFile(writingDirectoryPath, fileName),
    ),
  );

  const postsLastUpdated = getLatestTimestamp(
    posts.map((post) => post.updatedAtSource ?? post.publishedAt),
  );

  return {
    lastUpdated: postsLastUpdated,
    items: posts,
  };
};

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

  const posts = await loadWritingPosts(shanSiteRootPath);

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
    posts,
  };
};
