/**
 * Module dependencies.
 */
import asyncFs from 'node:fs/promises';
import path from 'node:path';

/**
 * Returns `true` if the path exists, `false` otherwise.
 *
 * @param path
 * @return {boolean}
 * @api private
 */
export async function isPathExists(targetPath: string) {
  try {
    await asyncFs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if it's hidden.
 */
export function isPathHidden(root: string, targetPath: any) {
  const pathParts = targetPath.slice(root.length).split(path.sep);
  for (const part of pathParts) {
    if (part.at(0) === '.') return true;
  }

  return false;
}

/**
 * File type.
 */
export function getFileType(file: string, ext: string) {
  if (ext !== '') return path.extname(path.basename(file, ext));
  return path.extname(file);
}
