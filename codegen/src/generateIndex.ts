import { OutputBuffer } from './outputBuffer.js';

export const generateIndexFile = (contractName: string, eventTypeNames: string[], generateCommon: boolean, output: OutputBuffer) => {
  output.writeLine((generateCommon ? `import { Event, ParsedEvent, EventDecoder } from './common';` : ``) + ` 
import { ${contractName}Decoders } from './${contractName}Decoders';
import * as ${contractName}InputTypes from './${contractName}FunctionInputTypes';
import { ${contractName}FunctionName, ${contractName}FunctionNames } from './${contractName}FunctionNames';
import { ${contractName}Calls } from './${contractName}Encoders';
` + (eventTypeNames.length > 0 ? `
import { ${contractName}Events, ${contractName}Event ${eventTypeNames.length > 0 ? ', ' + eventTypeNames.join(', ') : ''} } from './${contractName}Events';` : '') + `
import { ${(contractName == '' || !contractName) ? 'Wrapper' : contractName} } from './${contractName == '' || !contractName ? 'Wrapper' : contractName + 'Wrapper'}';

export {
  ` + (generateCommon ? `Event,
  ParsedEvent,
  EventDecoder,` : ``) + `
  ${contractName}Decoders,
  ${contractName}InputTypes,
  ${contractName}FunctionName,
  ${contractName}FunctionNames,
  ${contractName}Calls,
  ` + (eventTypeNames.length > 0 ? `
  ${contractName}Events,
  ${contractName}Event${eventTypeNames.length > 0 ? ', ' + eventTypeNames.join(', ') + ',' : ''}` : '') + `
  ${contractName == '' || !contractName ? 'Wrapper' : contractName},
};`);
};