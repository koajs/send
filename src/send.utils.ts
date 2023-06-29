/**
 * Module dependencies.
 */
import asyncFs from 'node:fs/promises'
import pathModule from 'node:path'

/**
 * Returns `true` if the path exists, `false` otherwise.
 * 
 * @param path 
 * @return {boolean}
 * @api private
 */
export async function asyncFsExists(path: string) {
  try {
    await asyncFs.access(path)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Check if it's hidden.
 */
export function isHidden(root: string, _path: any) {
  _path = _path.substr(root.length).split(pathModule.sep)
  for (let i = 0; i < _path.length; i++) {
    if (_path[i][0] === '.') return true
  }
  return false
}

/**
 * File type.
 */
export function type (file: string, ext: string) {
  return ext !== '' ? pathModule.extname(pathModule.basename(file, ext)) : pathModule.extname(file)
}

/**
 * Decode `path`.
 */
export function decode(targetPath: string) {
  try {
    return decodeURIComponent(targetPath)
  } catch (err) {
    return -1
  }
}
