import { ParamType } from 'ethers';

export const solidityToTypeScriptTypes = (solidityType: string): string => {
  switch (true) {
    case solidityType.endsWith('[]'):
      return `${solidityToTypeScriptTypes(solidityType.slice(0, -2))}[]`;
    case solidityType.startsWith('uint') || solidityType.startsWith('int'):
      return 'bigint';
    case solidityType.startsWith('address'):
      return 'string';
    case solidityType.startsWith('bool'):
      return 'boolean';
    case solidityType.startsWith('bytes'):
      return 'Uint8Array';
    case solidityType.startsWith('string'):
      return 'string';
    default:
      return 'any'; // Fallback for complex types
  }
};


export const getInputName = (type: ParamType, index?: number): string => {
  return type.name || `arg${index ?? 0}`;
};


export const generateDecoder = (type: string, valueExpression?: string): string => {
  switch (true) {
    case type.endsWith('[]'):
      const baseType = type.slice(0, -2); // Remove the [] from the type
      return `(${valueExpression}).map((x: any) => ${generateDecoder(baseType, 'x')})`;
    case type.startsWith('uint') || type.startsWith('int'):
      return `BigInt(${valueExpression})`;
    case type.startsWith('address'):
      return `await (async () => { const val = ${valueExpression}; return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })()`;
    case type.startsWith('bool'):
      return `${valueExpression} === '0x0000000000000000000000000000000000000000000000000000000000000001'`;
    case type.startsWith('bytes'):
      return `ethers.getBytes(${valueExpression})`;
    default:
      return valueExpression;
  }
};