import { OutputBuffer } from './outputBuffer.js';
import { FunctionFragment, ParamType } from 'ethers';
import { getInputName } from './utils.js';


const generateGenericDecodeMethod = (contractName: string, output: OutputBuffer, functionFragments: FunctionFragment[], functionInputTypeMap: Map<string, string | undefined>) => {
  return ` 
    decode(callData: string): { name: string, inputs: inputTypes.${contractName}FunctionInputs} {
      if (callData.length < 10) {
        throw new Error(\`Call data too short to encode a methodId: \${callData}\`);
      }
      const methodId = callData.slice(0, 10);
      const functionFragment = this.contractInterface.getFunction(methodId);
      if (!functionFragment) {
        throw new Error(\`Cannot find function fragment for methodId: \${methodId}. Call data: \${callData}\`);
      }

      if (functionFragment.inputs.length === 0) {
        return {
          name: functionFragment.name,
          inputs: <inputTypes.NoInputs>[]
        };
      }

      let decoded: any;
      switch (<${contractName}FunctionName>functionFragment.name) {
      ${functionFragments.map((functionAbi) => {
    const typeName = functionInputTypeMap.get(functionAbi.name);
    if (!typeName) return '';
    return `    case '${functionAbi.name}': decoded = this.decode${typeName}(callData); break;
      `;
  }).join('')}
      default:
        throw new Error(\`Unknown function name '\${functionFragment.name}' the code is out of sync with the ABI\`);
    }
    return {
      name: functionFragment.name,
      inputs: decoded
    };
  }
  `;
};

const generateConversionCode = (type: string, value: any, index: number): string => {
  // Array type handling
  if (type.endsWith('[]')) {
    const baseType = type.slice(0, -2); // Remove the [] from the type
    return `decoded[${index}].map((x: any) => ${generateConversionCode(baseType, 'x', index)})`;
  }
  // Base type handling
  switch (true) {
    case type.startsWith('uint') || type.startsWith('int'):
      return `BigInt(${value}.toString())`;
    case type.startsWith('bytes'):
      return `ethers.getBytes(${value})`;
    case type.startsWith('address'):
      return `getAddress(${value})`;
    default:
      return value; // Fallback for types that do not require special handling
  }
};


const generateDecoderFunction = (functionAbi: any, functionInputTypeMap: Map<string, string | undefined>): string => {
  if (!functionAbi.inputs.length) return '';

  const typeName = functionInputTypeMap.get(functionAbi.name);
  const decodedParams = functionAbi.inputs.map((o, index) => generateConversionCode(o.type, 'decoded[' + index + ']', index));
  const decodedFields = `      `
    + functionAbi.inputs.map((input: ParamType, index) => `${getInputName(input, index)}: ${decodedParams[index]}`)
      .join(',\n      ');

  return `    decode${typeName}(callData: string): inputTypes.${typeName} {
    const decoded = this.contractInterface.decodeFunctionData('${functionAbi.name}', callData);
      return {
        ${decodedFields}
      };
    };`;
};

export const generateCallDecoders = (contractName: string, output: OutputBuffer, functionFragments: FunctionFragment[], functionInputTypes: Map<string, string | undefined>): void => {
  let decoders = '';
  const genericDecodeMethod = generateGenericDecodeMethod(contractName, output, functionFragments, functionInputTypes);

  const decoderMethods = functionFragments.map((functionAbi: any) => {
    const decoder = generateDecoderFunction(functionAbi, functionInputTypes);
    if (decoder) decoders += decoder;
    return decoder;
  }).join('\n');

  output.writeLine(`import { ethers, getAddress } from 'ethers';
import * as inputTypes from './${contractName}FunctionInputTypes';
import contractAbi from './${contractName}Abi.json';
import { ${contractName}FunctionName } from './${contractName}FunctionNames';

export class ${contractName}Decoders {
    private readonly contractInterface: ethers.Interface = ethers.Interface.from(contractAbi);
${decoderMethods}
${genericDecodeMethod}
}
`);

};