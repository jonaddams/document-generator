interface JsonData {
  config?: any;
  model: Record<string, any>;
}

export function transformJsonToReadable(jsonData: JsonData): string {
  // Ignore config object, process only model
  if (!jsonData.model) {
    return 'No model data found';
  }

  const result: string[] = [];
  processObject(jsonData.model, result, 0);
  return result.join('\n');
}

function processObject(obj: Record<string, any>, result: string[], indentLevel: number): void {
  const indent = '    '.repeat(indentLevel); // 4 spaces per level

  for (const [key, value] of Object.entries(obj)) {
    const titleCaseKey = toTitleCase(key);

    if (value === null || value === undefined) {
      result.push(`${indent}• ${titleCaseKey}: ${value}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result.push(`${indent}• ${titleCaseKey}: []`);
      } else {
        result.push(`${indent}▼ ${titleCaseKey}:`);
        processArray(value, result, indentLevel + 1);
      }
    } else if (typeof value === 'object') {
      result.push(`${indent}▼ ${titleCaseKey}:`);
      processObject(value, result, indentLevel + 1);
    } else {
      // Simple value (string, number, boolean)
      result.push(`${indent}• ${titleCaseKey}: ${value}`);
    }
  }
}

function processArray(arr: any[], result: string[], indentLevel: number): void {
  const indent = '    '.repeat(indentLevel);

  arr.forEach((item, index) => {
    if (item === null || item === undefined) {
      result.push(`${indent}• [${index}]: ${item}`);
    } else if (Array.isArray(item)) {
      result.push(`${indent}▼ [${index}]:`);
      processArray(item, result, indentLevel + 1);
    } else if (typeof item === 'object') {
      result.push(`${indent}▼ [${index}]:`);
      processObject(item, result, indentLevel + 1);
    } else {
      result.push(`${indent}• [${index}]: ${item}`);
    }
  });
}

function toTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}