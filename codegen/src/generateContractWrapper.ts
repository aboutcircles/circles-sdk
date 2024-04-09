import { OutputBuffer } from './outputBuffer.js';
import { generateDecoder, getInputName, solidityToTypeScriptTypes } from './utils.js';
import { EventFragment, FunctionFragment, ParamType } from 'ethers';

export const generateContractWrapper = (contractName: string, output: OutputBuffer, functionFragments: FunctionFragment[], eventFragments: EventFragment[]): void => {
  const viewFunctionFragments = functionFragments.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure');
  const transactionFunctionFragments = functionFragments.filter(f => f.stateMutability !== 'view' && f.stateMutability !== 'pure');

  const generateFunctionArguments = (inputs: readonly ParamType[]) =>
    inputs.map((input, index: number) =>
      `${getInputName(input, index)}: ${solidityToTypeScriptTypes(input.type)}`
    ).join(', ');

  const generateOutputType = (outputs: readonly ParamType[]) => {
    if (outputs.length === 1) {
      return solidityToTypeScriptTypes(outputs[0].type);
    } else {
      return `[${outputs.map(output => solidityToTypeScriptTypes(output.type)).join(', ')}]`;
    }
  };

  const wrapInDecoder = (outputs: readonly ParamType[], valueExpression: string) => {
    if (outputs.length === 1 && outputs[0].type.endsWith('[]')) {
      const elementType = outputs[0].type.slice(0, -2); // Get the element type without '[]'
      return `return ethers.AbiCoder.defaultAbiCoder().decode(["${outputs[0].type}"], ${valueExpression})[0].map((x:any) => ${generateDecoder(elementType, 'x')});`;
    } else if (outputs.length === 1) {
      return `return ${generateDecoder(outputs[0].type, valueExpression)};`;
    } else {
      const types = outputs.map(output => `"${output.type}"`).join(', ');
      return `const decoded = ethers.AbiCoder.defaultAbiCoder().decode([${types}], ${valueExpression});
return [${outputs.map((output, index) => `${generateDecoder(output.type, `decoded[${index}]`)}`).join(', ')}];`;
    }
  };

  const generateViewFunctions = () =>
    viewFunctionFragments.map(f => {
      // Adjust to include proper function scope and return statement handling
      const functionBody = wrapInDecoder(f.outputs, `await this.provider.call({
      to: this.address,
      data: this.callEncoder.${f.name}(${generateInputObject(f.inputs)})
    })`);

      return `${f.name} = async (${generateFunctionArguments(f.inputs)}): Promise<${generateOutputType(f.outputs)}> => {
      ${functionBody}
    };`;
    }).join('\n');

  const generateInputObject = (inputs: readonly ParamType[]) =>
    inputs.length === 0 ? `` : `{ ` + inputs.map((input, index) => `${getInputName(input, index)}: ${getInputName(input, index)}`).join(', ') + ` }`;

  const generateTransactionFunctions = () =>
    transactionFunctionFragments.map(f =>
      `${f.name} = async (${generateFunctionArguments(f.inputs)}): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.${f.name}(${generateInputObject(f.inputs)})
      });
      return tx.wait();
    }
`).join('\n');

  const generateClass = (viewFunctions: string, transactionFunctions: string) =>
    `import { ${contractName}Calls } from './${contractName}Encoders';`
  + (eventFragments.length > 0 ? `
import { Parsed${contractName}Event, ${contractName}Event, ${contractName}Events } from './${contractName}Events';` : '') + `
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { Observable } from "./common";

export class ${contractName || 'Wrapper'} {
  readonly address: string;
  private readonly provider: ethers.Provider;
  ` + (eventFragments.length > 0 ? `
  private readonly eventDecoder: ${contractName}Events = new ${contractName}Events();
  public readonly events: Observable<Parsed${contractName}Event<${contractName}Event>>;
  private readonly emitEvent: (event: Parsed${contractName}Event<${contractName}Event>) => void;` : '') + `

  private callEncoder: ${contractName}Calls = new ${contractName}Calls(); 

  constructor(provider: ethers.Provider, address: string) {
      this.provider = provider;
      this.address = address;
      
  ` + (eventFragments.length > 0 ? `
      const events = Observable.create<Parsed${contractName}Event<${contractName}Event>>();
      this.events = events.property;
      this.emitEvent = events.emit;
  ` : '') + `
  }
  
  private sendTransaction(request: TransactionRequest) : Promise<TransactionResponse> {
    if (!this.provider.sendTransaction) {
      throw new Error('sendTransaction not available on this provider');
    }
    return this.provider.sendTransaction(request);
  }
  
  ${viewFunctions}
  ${transactionFunctions}
}`;

  const viewFunctions = generateViewFunctions();
  const transactionFunctions = generateTransactionFunctions();
  const classDefinition = generateClass(viewFunctions, transactionFunctions);

  output.writeLine(classDefinition);
};
