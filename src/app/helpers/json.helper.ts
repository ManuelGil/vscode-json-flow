import * as dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import hcl from 'hcl-parser';
import * as ini from 'ini';
import json5 from 'json5';
import { parse, ParseError } from 'jsonc-parser';
import * as toml from 'toml';
import { window } from 'vscode';
import * as yaml from 'yaml';

/**
 * The parseJSONContent function.
 *
 * @function parseJSONContent
 * @param {string} content - The content to parse
 * @param {string} type - The type of content
 * @returns {object | null} - The parsed content
 */
export const parseJSONContent = (
  content: string,
  type: string,
): object | null => {
  const errors: ParseError[] = [];
  let result;

  switch (type) {
    case 'json':
      try {
        return JSON.parse(content);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        window.showErrorMessage('Error parsing JSON:' + error);
        return null;
      }

    case 'jsonc':
      result = parse(content, errors);
      if (errors.length === 0) {
        return result;
      } else {
        console.error('Error parsing JSONC:', errors);
        window.showErrorMessage('Error parsing JSONC:' + errors);
        return null;
      }

    case 'json5':
      try {
        return json5.parse(content);
      } catch (error) {
        console.error('Error parsing JSON5:', error);
        return null;
      }

    case 'dockerfile':
    case 'yaml':
      try {
        return yaml.parse(content);
      } catch (error) {
        console.error('Error parsing YAML:', error);
        window.showErrorMessage('Error parsing YAML:' + error);
        return null;
      }

    case 'toml':
      try {
        return toml.parse(content);
      } catch (error) {
        console.error('Error parsing TOML:', error);
        window.showErrorMessage('Error parsing TOML:' + error);
        return null;
      }

    case 'ini':
    case 'properties':
      try {
        return ini.parse(content);
      } catch (error) {
        console.error('Error parsing INI/Properties:', error);
        window.showErrorMessage('Error parsing INI/Properties:' + error);
        return null;
      }

    case 'env':
      try {
        return dotenv.parse(content);
      } catch (error) {
        console.error('Error parsing ENV:', error);
        window.showErrorMessage('Error parsing ENV:' + error);
        return null;
      }

    case 'xml':
      try {
        const parser = new XMLParser();
        return parser.parse(content);
      } catch (error) {
        console.error('Error parsing XML:', error);
        window.showErrorMessage('Error parsing XML:' + error);
        return null;
      }

    case 'hcl':
      try {
        return hcl.parse(content);
      } catch (error) {
        console.error('Error parsing HCL:', error);
        window.showErrorMessage('Error parsing HCL:' + error);
        return null;
      }

    default:
      window.showErrorMessage('Invalid file type');
      return null;
  }
};
