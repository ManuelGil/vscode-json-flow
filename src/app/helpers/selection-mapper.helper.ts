import type { SelectionMapper } from '../interfaces';
import { csvSelectionMapper } from './csv-selection.helper';
import { envSelectionMapper } from './env-selection.helper';
import { hclSelectionMapper } from './hcl-selection.helper';
import { iniSelectionMapper } from './ini-selection.helper';
import { jsonSelectionMapper } from './json-selection.helper';
import { tomlSelectionMapper } from './toml-selection.helper';
import { xmlSelectionMapper } from './xml-selection.helper';
import { yamlSelectionMapper } from './yaml-selection.helper';

/**
 * Return a format-specific SelectionMapper based on VS Code's languageId and/or file name.
 * LanguageId and file name are normalized to lowercase to ensure consistent matching.
 */
export function getSelectionMapper(
  languageId: string,
  fileName?: string,
): SelectionMapper | undefined {
  const lang = (languageId ?? '').toLowerCase();
  const ext = (fileName ?? '').toLowerCase();

  switch (lang) {
    case 'json':
    case 'jsonc':
    case 'json5':
      return jsonSelectionMapper;
    case 'yaml':
    case 'yml':
      return yamlSelectionMapper;
    case 'csv':
    case 'tsv':
      return csvSelectionMapper;
    case 'dotenv':
      return envSelectionMapper;
    case 'ini':
      return iniSelectionMapper;
    case 'toml':
      return tomlSelectionMapper;
    case 'xml':
      return xmlSelectionMapper;
    case 'hcl':
      return hclSelectionMapper;
    default: {
      // Fallback by file extension when languageId is unknown or generic
      if (ext.endsWith('.csv')) {
        return csvSelectionMapper;
      }
      if (ext.endsWith('.tsv')) {
        return csvSelectionMapper;
      }
      if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
        return yamlSelectionMapper;
      }
      if (ext.endsWith('.env') || ext.includes('.env.')) {
        return envSelectionMapper;
      }
      if (ext.endsWith('.ini') || ext.endsWith('.properties')) {
        return iniSelectionMapper;
      }
      if (ext.endsWith('.toml')) {
        return tomlSelectionMapper;
      }
      if (ext.endsWith('.xml')) {
        return xmlSelectionMapper;
      }
      if (ext.endsWith('.hcl')) {
        return hclSelectionMapper;
      }
      return undefined;
    }
  }
}

export type { SelectionMapper } from '../interfaces';
