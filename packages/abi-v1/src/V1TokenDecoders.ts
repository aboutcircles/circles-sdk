import { ethers, getAddress } from 'ethers';
import * as inputTypes from './V1TokenFunctionInputTypes';
import contractAbi from './V1TokenAbi.json';
import { V1TokenFunctionName } from './V1TokenFunctionNames';

export class V1TokenDecoders {
  private readonly contractInterface: ethers.Interface = ethers.Interface.from(contractAbi);

  decodeAllowanceInputs(callData: string): inputTypes.AllowanceInputs {
    const decoded = this.contractInterface.decodeFunctionData('allowance', callData);
    return {
      owner: getAddress(decoded[0]),
      spender: getAddress(decoded[1])
    };
  };

  decodeApproveInputs(callData: string): inputTypes.ApproveInputs {
    const decoded = this.contractInterface.decodeFunctionData('approve', callData);
    return {
      spender: getAddress(decoded[0]),
      amount: BigInt(decoded[1].toString())
    };
  };

  decodeBalanceOfInputs(callData: string): inputTypes.BalanceOfInputs {
    const decoded = this.contractInterface.decodeFunctionData('balanceOf', callData);
    return {
      account: getAddress(decoded[0])
    };
  };


  decodeDecreaseAllowanceInputs(callData: string): inputTypes.DecreaseAllowanceInputs {
    const decoded = this.contractInterface.decodeFunctionData('decreaseAllowance', callData);
    return {
      spender: getAddress(decoded[0]),
      subtractedValue: BigInt(decoded[1].toString())
    };
  };


  decodeHubTransferInputs(callData: string): inputTypes.HubTransferInputs {
    const decoded = this.contractInterface.decodeFunctionData('hubTransfer', callData);
    return {
      from: getAddress(decoded[0]),
      to: getAddress(decoded[1]),
      amount: BigInt(decoded[2].toString())
    };
  };

  decodeIncreaseAllowanceInputs(callData: string): inputTypes.IncreaseAllowanceInputs {
    const decoded = this.contractInterface.decodeFunctionData('increaseAllowance', callData);
    return {
      spender: getAddress(decoded[0]),
      addedValue: BigInt(decoded[1].toString())
    };
  };


  decodeTransferInputs(callData: string): inputTypes.TransferInputs {
    const decoded = this.contractInterface.decodeFunctionData('transfer', callData);
    return {
      dst: getAddress(decoded[0]),
      wad: BigInt(decoded[1].toString())
    };
  };

  decodeTransferFromInputs(callData: string): inputTypes.TransferFromInputs {
    const decoded = this.contractInterface.decodeFunctionData('transferFrom', callData);
    return {
      sender: getAddress(decoded[0]),
      recipient: getAddress(decoded[1]),
      amount: BigInt(decoded[2].toString())
    };
  };


  decode(callData: string): { name: string, inputs: inputTypes.V1TokenFunctionInputs } {
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
    switch (<V1TokenFunctionName>functionFragment.name) {
      case 'allowance':
        decoded = this.decodeAllowanceInputs(callData);
        break;
      case 'approve':
        decoded = this.decodeApproveInputs(callData);
        break;
      case 'balanceOf':
        decoded = this.decodeBalanceOfInputs(callData);
        break;
      case 'decreaseAllowance':
        decoded = this.decodeDecreaseAllowanceInputs(callData);
        break;
      case 'hubTransfer':
        decoded = this.decodeHubTransferInputs(callData);
        break;
      case 'increaseAllowance':
        decoded = this.decodeIncreaseAllowanceInputs(callData);
        break;
      case 'transfer':
        decoded = this.decodeTransferInputs(callData);
        break;
      case 'transferFrom':
        decoded = this.decodeTransferFromInputs(callData);
        break;

      default:
        throw new Error(`Unknown function name '${functionFragment.name}' the code is out of sync with the ABI`);
    }
    return {
      name: functionFragment.name,
      inputs: decoded
    };
  }

}

