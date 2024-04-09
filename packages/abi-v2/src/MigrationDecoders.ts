import { ethers, getAddress } from 'ethers';
import * as inputTypes from './MigrationFunctionInputTypes';
import contractAbi from './MigrationAbi.json';
import { MigrationFunctionName } from './MigrationFunctionNames';

export class MigrationDecoders {
    private readonly contractInterface: ethers.Interface = ethers.Interface.from(contractAbi);
    decodeConvertFromV1ToDemurrageInputs(callData: string): inputTypes.ConvertFromV1ToDemurrageInputs {
    const decoded = this.contractInterface.decodeFunctionData('convertFromV1ToDemurrage', callData);
      return {
              _amount: BigInt(decoded[0].toString())
      };
    };



    decodeMigrateInputs(callData: string): inputTypes.MigrateInputs {
    const decoded = this.contractInterface.decodeFunctionData('migrate', callData);
      return {
              _avatars: decoded[0].map((x: any) => getAddress(x)),
      _amounts: decoded[1].map((x: any) => BigInt(x.toString()))
      };
    };

 
    decode(callData: string): { name: string, inputs: inputTypes.MigrationFunctionInputs} {
      if (callData.length < 10) {
        throw new Error(`Call data too short to encode a methodId: ${callData}`);
      }
      const methodId = callData.slice(0, 10);
      const functionFragment = this.contractInterface.getFunction(methodId);
      if (!functionFragment) {
        throw new Error(`Cannot find function fragment for methodId: ${methodId}. Call data: ${callData}`);
      }

      if (functionFragment.inputs.length === 0) {
        return {
          name: functionFragment.name,
          inputs: <inputTypes.NoInputs>[]
        };
      }

      let decoded: any;
      switch (<MigrationFunctionName>functionFragment.name) {
          case 'convertFromV1ToDemurrage': decoded = this.decodeConvertFromV1ToDemurrageInputs(callData); break;
          case 'migrate': decoded = this.decodeMigrateInputs(callData); break;
      
      default:
        throw new Error(`Unknown function name '${functionFragment.name}' the code is out of sync with the ABI`);
    }
    return {
      name: functionFragment.name,
      inputs: decoded
    };
  }
  
}

