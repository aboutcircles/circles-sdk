import { OutputBuffer } from './outputBuffer.js';
import { EventFragment } from 'ethers';
import { solidityToTypeScriptTypes } from './utils.js';

const generateEventTypesAndParsers = (eventFragments: EventFragment[]): {
  eventTypes: string,
  parsers: string,
  eventTypeNames: string[]
} => {
  let eventTypes = '';
  let parsers = '';
  const eventTypeNames: string[] = [];
  eventFragments.forEach(eventFragment => {
    const eventTypeFields = eventFragment.inputs.map((input: any) => {
      const tsType = solidityToTypeScriptTypes(input.type);
      return `${input.name}: ${tsType};`;
    }).join('\n  ');

    const eventName = eventFragment.name;
    const typeName = `${eventName}Event`;
    eventTypeNames.push(typeName);
    eventTypes += `export type ${typeName} = Event & {\n  ${eventTypeFields}\n};\n\n`;

    // Utilize the existing type mapping functions for conversion logic
    const params = eventFragment.inputs.map((input: any) => {
      const tsType = solidityToTypeScriptTypes(input.type);
      const paramName = input.name;
      let conversion;
      switch (tsType) {
        case 'bigint':
          conversion = `BigInt(log.args.getValue('${paramName}'))`;
          break;
        case 'string':
          conversion = input.type === 'address' ? `getAddress(log.args.getValue('${paramName}'))` : `log.args.getValue('${paramName}')`;
          break;
        default:
          conversion = `log.args.getValue('${paramName}')`; // Directly use the value for types that don't require conversion
      }
      return `${paramName}: ${conversion}`;
    }).join(',\n  ');

    parsers += `const parse${typeName} = (log: ethers.LogDescription): ${typeName} => ({\n  ${params}\n});\n\n`;
  });

  return { eventTypes, parsers, eventTypeNames };
};


export const generateEventDecoders = (contractName: string, output: OutputBuffer, eventFragments: EventFragment[]): string[] => {
  const { eventTypes, parsers, eventTypeNames } = generateEventTypesAndParsers(eventFragments);
  const decoderCases = eventFragments.map(eventAbi => {
    const eventName = eventAbi.name;
    const typeName = `${eventName}Event`;
    return `case '${eventName}':
        eventData = parse${typeName}(decoded);
        break;`;
  }).join('\n      ');

  output.writeLine(`import { ethers, getAddress } from 'ethers';
import { Event, EventDecoder, ParsedEvent } from './common';
import contractAbi from './${contractName}Abi.json';

${eventTypes}

export type ${contractName}Event =
  ${eventFragments.map(eventAbi => eventAbi.name + 'Event').join(' |\n  ')};

export type Parsed${contractName}Event<T extends ${contractName}Event> = ParsedEvent<T>;

${parsers}

export class ${contractName}Events implements EventDecoder {
  private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

  decodeEventData<T extends Event>(log: {
    topics: string[],
    data: string
  }): ParsedEvent<T> | null {
    const decoded = this.contractInterface.parseLog(log);
    if (!decoded) {
      return null;
    }

    let eventData: any;
    switch (decoded.name) {
      ${decoderCases}
      default:
        return null;
    }

    return {
      name: decoded.name,
      data: eventData
    };
  }
}`);

  return eventTypeNames
};