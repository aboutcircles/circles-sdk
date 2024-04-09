import fs from 'fs';
import { generateFunctionInputTypes } from './generateFunctionInputTypes.js';
import { OutputBuffer } from './outputBuffer.js';
import { EventFragment, Fragment, FunctionFragment, JsonFragment } from 'ethers';
import { generateCallEncoders } from './generateCallEncoders.js';
import { generateCallDecoders } from './generateCallDecoders.js';
import { generateEventDecoders } from './generateEventDecoders.js';
import { generateFunctionNames } from './generateFunctionNames.js';
import { generateContractWrapper } from './generateContractWrapper.js';
import { generateCommon } from './generateCommon.js';
import { generateIndexFile } from './generateIndex.js';

const displayUsage = () => {
  console.log('Usage: node main.js <contractPath> <outputDir> <contractName?>');
  process.exit(1);
};

const contractPath = process.argv[2];
if (!fs.existsSync(contractPath)) {
  console.error(`File not found: ${contractPath}`);
  displayUsage();
}

const outputDir = process.argv.length > 3 ? process.argv[3] : '';
const contractName = process.argv.length > 4 ? process.argv[4] : '';
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const abi = <ReadonlyArray<Fragment | JsonFragment | string>>contractJson.abi;

const CommonCode = new OutputBuffer('common.ts');
generateCommon(CommonCode);

const functionFragments = abi
  .filter((item: any) => item.type === 'function')
  .map(o => <FunctionFragment>Fragment.from(o));

const FunctionInputTypes = new OutputBuffer(`${contractName}FunctionInputTypes.ts`);
const functionInputTypes = generateFunctionInputTypes(contractName, FunctionInputTypes, functionFragments);

const FunctionNames = new OutputBuffer(`${contractName}FunctionNames.ts`);
generateFunctionNames(contractName, FunctionNames, functionInputTypes);

const CallEncoders = new OutputBuffer(`${contractName}Encoders.ts`);
generateCallEncoders(contractName, CallEncoders, functionFragments, functionInputTypes);

const CallDecoders = new OutputBuffer(`${contractName}Decoders.ts`);
generateCallDecoders(contractName, CallDecoders, functionFragments, functionInputTypes);

const eventFragments = abi
  .filter((item: any) => item.type === 'event')
  .map(o => <EventFragment>Fragment.from(o));

const EventDecoders = new OutputBuffer(`${contractName}Events.ts`);
let eventTypeNames: string[] = [];
if (eventFragments.length > 0) {
  eventTypeNames = generateEventDecoders(contractName, EventDecoders, eventFragments);
} else {
  EventDecoders.writeLine(`export const empty = "";`)
}
const ContractWrapper = new OutputBuffer(`${contractName}Wrapper.ts`);
generateContractWrapper(contractName, ContractWrapper, functionFragments, eventFragments);

const Index = new OutputBuffer('index.ts');
let writeCommon: boolean = true;
if (fs.existsSync(`${outputDir}/index.ts`)) {
  fs.readFileSync(`${outputDir}/index.ts`, 'utf8').split('\n').forEach((line: string) => {
    Index.writeLine(line);
  });
  fs.truncateSync(`${outputDir}/index.ts`);
  writeCommon = false;
}
generateIndexFile(contractName, eventTypeNames, writeCommon, Index);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
fs.writeFileSync(`${outputDir}/${CommonCode.name}`, CommonCode.toString());
fs.writeFileSync(`${outputDir}/${CallDecoders.name}`, CallDecoders.toString());
fs.writeFileSync(`${outputDir}/${FunctionInputTypes.name}`, FunctionInputTypes.toString());
fs.writeFileSync(`${outputDir}/${CallEncoders.name}`, CallEncoders.toString());
fs.writeFileSync(`${outputDir}/${EventDecoders.name}`, EventDecoders.toString());
fs.writeFileSync(`${outputDir}/${FunctionNames.name}`, FunctionNames.toString());
fs.writeFileSync(`${outputDir}/${ContractWrapper.name}`, ContractWrapper.toString());
fs.writeFileSync(`${outputDir}/${contractName}Abi.json`, JSON.stringify(abi));
fs.writeFileSync(`${outputDir}/${Index.name}`, Index.toString());