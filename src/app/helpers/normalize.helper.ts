/**
 * Helper para normalizar fragmentos de JS/TS a JSON string y detectar el tipo de archivo.
 * Devuelve el texto normalizado y el tipo detectado.
 */
export function normalizeToJsonString(
  text: string,
  fileType: string,
): { normalized: string; detectedType: string } {
  let normalized = text;
  let detectedType = fileType;

  if (
    ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(
      fileType,
    )
  ) {
    detectedType = 'jsonc';
    normalized = text
      .replace(/'([^']+)'/g, '"$1"')
      .replace(/(["'])?([a-zA-Z0-9_]+)(["'])?:/g, '"$2":')
      .replace(/,*\s*\n*\]/g, ']')
      .replace(/{\s*\n*/g, '{')
      .replace(/,*\s*\n*};*/g, '}');
  }

  return { normalized, detectedType };
}
