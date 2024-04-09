import { OutputBuffer } from './outputBuffer.js';
import { FunctionFragment } from 'ethers';
import { getInputName, solidityToTypeScriptTypes } from './utils.js';

const generateTypeDefinition = (functionAbi: any, typeName: string): string => {
  const inputs = functionAbi.inputs.map((input: any, index: number) => {
    if (input.components) {
      // TODO: Support structs
      /*

       */
    }
    const tsType = solidityToTypeScriptTypes(input.type);
    const paramName = getInputName(input, index);
    return `${paramName}: ${tsType};`;
  }).join('\n  ');

  return `export type ${typeName} = {
  ${inputs}
};
`;
};

/**
 * Generate the type definition for all function inputs.
 * @param contractName The name of the contract
 * @param output The file to write to
 * @param functionFragments The function fragments to generate types for
 * @returns A map of function names to their input type names
 */
export const generateFunctionInputTypes = (contractName: string, output: OutputBuffer, functionFragments: FunctionFragment[]): Map<string, string | undefined> => {
  const functionInputTypeMap: Map<string, string | undefined> = new Map();

  functionFragments.forEach((functionAbi) => {
    const functionName = functionAbi.name;
    functionInputTypeMap.set(functionName, undefined);
    if (!functionAbi.inputs.length) {
      return;
    }
    const typeName = `${functionAbi.name.charAt(0).toUpperCase()}${functionAbi.name.slice(1)}Inputs`;
    output.writeLine(generateTypeDefinition(functionAbi, typeName));
    functionInputTypeMap.set(functionName, typeName);
  });

  // Create a union type of all the function inputs
  output.writeLine(`export type NoInputs = [];
  
export type ${contractName}FunctionInputs = `);

  for (const typeName of functionInputTypeMap.values()) {
    if (!typeName) {
      continue;
    }
    output.writeLine(`  | ${typeName}`);
  }
  output.writeLine(`  | NoInputs;`);

  return functionInputTypeMap;
};