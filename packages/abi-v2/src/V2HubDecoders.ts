import { ethers, getAddress } from 'ethers';
import * as inputTypes from './V2HubFunctionInputTypes';
import contractAbi from './V2HubAbi.json';
import { V2HubFunctionName } from './V2HubFunctionNames';

export class V2HubDecoders {
    private readonly contractInterface: ethers.Interface = ethers.Interface.from(contractAbi);
    decodeAvatarsInputs(callData: string): inputTypes.AvatarsInputs {
    const decoded = this.contractInterface.decodeFunctionData('avatars', callData);
      return {
              arg0: getAddress(decoded[0])
      };
    };
    decodeBalanceOfInputs(callData: string): inputTypes.BalanceOfInputs {
    const decoded = this.contractInterface.decodeFunctionData('balanceOf', callData);
      return {
              _account: getAddress(decoded[0]),
      _id: BigInt(decoded[1].toString())
      };
    };
    decodeBalanceOfBatchInputs(callData: string): inputTypes.BalanceOfBatchInputs {
    const decoded = this.contractInterface.decodeFunctionData('balanceOfBatch', callData);
      return {
              _accounts: decoded[0].map((x: any) => getAddress(x)),
      _ids: decoded[1].map((x: any) => BigInt(x.toString()))
      };
    };
    decodeBalanceOfOnDayInputs(callData: string): inputTypes.BalanceOfOnDayInputs {
    const decoded = this.contractInterface.decodeFunctionData('balanceOfOnDay', callData);
      return {
              _account: getAddress(decoded[0]),
      _id: BigInt(decoded[1].toString()),
      _day: BigInt(decoded[2].toString())
      };
    };
    decodeBurnInputs(callData: string): inputTypes.BurnInputs {
    const decoded = this.contractInterface.decodeFunctionData('burn', callData);
      return {
              _id: BigInt(decoded[0].toString()),
      _amount: BigInt(decoded[1].toString()),
      _data: ethers.getBytes(decoded[2])
      };
    };
    decodeCalculateIssuanceInputs(callData: string): inputTypes.CalculateIssuanceInputs {
    const decoded = this.contractInterface.decodeFunctionData('calculateIssuance', callData);
      return {
              _human: getAddress(decoded[0])
      };
    };
    decodeCalculateIssuanceWithCheckInputs(callData: string): inputTypes.CalculateIssuanceWithCheckInputs {
    const decoded = this.contractInterface.decodeFunctionData('calculateIssuanceWithCheck', callData);
      return {
              _human: getAddress(decoded[0])
      };
    };
    decodeConvertBatchInflationaryToDemurrageValuesInputs(callData: string): inputTypes.ConvertBatchInflationaryToDemurrageValuesInputs {
    const decoded = this.contractInterface.decodeFunctionData('convertBatchInflationaryToDemurrageValues', callData);
      return {
              _inflationaryValues: decoded[0].map((x: any) => BigInt(x.toString())),
      _day: BigInt(decoded[1].toString())
      };
    };
    decodeConvertInflationaryToDemurrageValueInputs(callData: string): inputTypes.ConvertInflationaryToDemurrageValueInputs {
    const decoded = this.contractInterface.decodeFunctionData('convertInflationaryToDemurrageValue', callData);
      return {
              _inflationaryValue: BigInt(decoded[0].toString()),
      _day: BigInt(decoded[1].toString())
      };
    };
    decodeDayInputs(callData: string): inputTypes.DayInputs {
    const decoded = this.contractInterface.decodeFunctionData('day', callData);
      return {
              _timestamp: BigInt(decoded[0].toString())
      };
    };
    decodeDiscountedBalancesInputs(callData: string): inputTypes.DiscountedBalancesInputs {
    const decoded = this.contractInterface.decodeFunctionData('discountedBalances', callData);
      return {
              arg0: BigInt(decoded[0].toString()),
      arg1: getAddress(decoded[1])
      };
    };
    decodeGroupMintInputs(callData: string): inputTypes.GroupMintInputs {
    const decoded = this.contractInterface.decodeFunctionData('groupMint', callData);
      return {
              _group: getAddress(decoded[0]),
      _collateralAvatars: decoded[1].map((x: any) => getAddress(x)),
      _amounts: decoded[2].map((x: any) => BigInt(x.toString())),
      _data: ethers.getBytes(decoded[3])
      };
    };



    decodeInviteHumanInputs(callData: string): inputTypes.InviteHumanInputs {
    const decoded = this.contractInterface.decodeFunctionData('inviteHuman', callData);
      return {
              _human: getAddress(decoded[0])
      };
    };
    decodeIsApprovedForAllInputs(callData: string): inputTypes.IsApprovedForAllInputs {
    const decoded = this.contractInterface.decodeFunctionData('isApprovedForAll', callData);
      return {
              _account: getAddress(decoded[0]),
      _operator: getAddress(decoded[1])
      };
    };
    decodeIsGroupInputs(callData: string): inputTypes.IsGroupInputs {
    const decoded = this.contractInterface.decodeFunctionData('isGroup', callData);
      return {
              _group: getAddress(decoded[0])
      };
    };
    decodeIsHumanInputs(callData: string): inputTypes.IsHumanInputs {
    const decoded = this.contractInterface.decodeFunctionData('isHuman', callData);
      return {
              _human: getAddress(decoded[0])
      };
    };
    decodeIsOrganizationInputs(callData: string): inputTypes.IsOrganizationInputs {
    const decoded = this.contractInterface.decodeFunctionData('isOrganization', callData);
      return {
              _organization: getAddress(decoded[0])
      };
    };
    decodeIsTrustedInputs(callData: string): inputTypes.IsTrustedInputs {
    const decoded = this.contractInterface.decodeFunctionData('isTrusted', callData);
      return {
              _truster: getAddress(decoded[0]),
      _trustee: getAddress(decoded[1])
      };
    };

    decodeMigrateInputs(callData: string): inputTypes.MigrateInputs {
    const decoded = this.contractInterface.decodeFunctionData('migrate', callData);
      return {
              _owner: getAddress(decoded[0]),
      _avatars: decoded[1].map((x: any) => getAddress(x)),
      _amounts: decoded[2].map((x: any) => BigInt(x.toString()))
      };
    };

    decodeMintPoliciesInputs(callData: string): inputTypes.MintPoliciesInputs {
    const decoded = this.contractInterface.decodeFunctionData('mintPolicies', callData);
      return {
              arg0: getAddress(decoded[0])
      };
    };
    decodeMintTimesInputs(callData: string): inputTypes.MintTimesInputs {
    const decoded = this.contractInterface.decodeFunctionData('mintTimes', callData);
      return {
              arg0: getAddress(decoded[0])
      };
    };

    decodeOperateFlowMatrixInputs(callData: string): inputTypes.OperateFlowMatrixInputs {
    const decoded = this.contractInterface.decodeFunctionData('operateFlowMatrix', callData);
      return {
              _flowVertices: decoded[0].map((x: any) => getAddress(x)),
      _flow: decoded[1].map((x: any) => x),
      _streams: decoded[2].map((x: any) => x),
      _packedCoordinates: ethers.getBytes(decoded[3])
      };
    };

    decodeRegisterCustomGroupInputs(callData: string): inputTypes.RegisterCustomGroupInputs {
    const decoded = this.contractInterface.decodeFunctionData('registerCustomGroup', callData);
      return {
              _mint: getAddress(decoded[0]),
      _treasury: getAddress(decoded[1]),
      _name: decoded[2],
      _symbol: decoded[3],
      _cidV0Digest: ethers.getBytes(decoded[4])
      };
    };
    decodeRegisterGroupInputs(callData: string): inputTypes.RegisterGroupInputs {
    const decoded = this.contractInterface.decodeFunctionData('registerGroup', callData);
      return {
              _mint: getAddress(decoded[0]),
      _name: decoded[1],
      _symbol: decoded[2],
      _cidV0Digest: ethers.getBytes(decoded[3])
      };
    };
    decodeRegisterHumanInputs(callData: string): inputTypes.RegisterHumanInputs {
    const decoded = this.contractInterface.decodeFunctionData('registerHuman', callData);
      return {
              _cidV0Digest: ethers.getBytes(decoded[0])
      };
    };
    decodeRegisterOrganizationInputs(callData: string): inputTypes.RegisterOrganizationInputs {
    const decoded = this.contractInterface.decodeFunctionData('registerOrganization', callData);
      return {
              _name: decoded[0],
      _cidV0Digest: ethers.getBytes(decoded[1])
      };
    };
    decodeSafeBatchTransferFromInputs(callData: string): inputTypes.SafeBatchTransferFromInputs {
    const decoded = this.contractInterface.decodeFunctionData('safeBatchTransferFrom', callData);
      return {
              _from: getAddress(decoded[0]),
      _to: getAddress(decoded[1]),
      _ids: decoded[2].map((x: any) => BigInt(x.toString())),
      _values: decoded[3].map((x: any) => BigInt(x.toString())),
      _data: ethers.getBytes(decoded[4])
      };
    };
    decodeSafeTransferFromInputs(callData: string): inputTypes.SafeTransferFromInputs {
    const decoded = this.contractInterface.decodeFunctionData('safeTransferFrom', callData);
      return {
              _from: getAddress(decoded[0]),
      _to: getAddress(decoded[1]),
      _id: BigInt(decoded[2].toString()),
      _value: BigInt(decoded[3].toString()),
      _data: ethers.getBytes(decoded[4])
      };
    };
    decodeSetApprovalForAllInputs(callData: string): inputTypes.SetApprovalForAllInputs {
    const decoded = this.contractInterface.decodeFunctionData('setApprovalForAll', callData);
      return {
              _operator: getAddress(decoded[0]),
      _approved: decoded[1]
      };
    };


    decodeStoppedInputs(callData: string): inputTypes.StoppedInputs {
    const decoded = this.contractInterface.decodeFunctionData('stopped', callData);
      return {
              _human: getAddress(decoded[0])
      };
    };
    decodeSupportsInterfaceInputs(callData: string): inputTypes.SupportsInterfaceInputs {
    const decoded = this.contractInterface.decodeFunctionData('supportsInterface', callData);
      return {
              _interfaceId: ethers.getBytes(decoded[0])
      };
    };
    decodeToTokenIdInputs(callData: string): inputTypes.ToTokenIdInputs {
    const decoded = this.contractInterface.decodeFunctionData('toTokenId', callData);
      return {
              _avatar: getAddress(decoded[0])
      };
    };
    decodeTreasuriesInputs(callData: string): inputTypes.TreasuriesInputs {
    const decoded = this.contractInterface.decodeFunctionData('treasuries', callData);
      return {
              arg0: getAddress(decoded[0])
      };
    };
    decodeTrustInputs(callData: string): inputTypes.TrustInputs {
    const decoded = this.contractInterface.decodeFunctionData('trust', callData);
      return {
              _trustReceiver: getAddress(decoded[0]),
      _expiry: BigInt(decoded[1].toString())
      };
    };
    decodeTrustMarkersInputs(callData: string): inputTypes.TrustMarkersInputs {
    const decoded = this.contractInterface.decodeFunctionData('trustMarkers', callData);
      return {
              arg0: getAddress(decoded[0]),
      arg1: getAddress(decoded[1])
      };
    };
    decodeUriInputs(callData: string): inputTypes.UriInputs {
    const decoded = this.contractInterface.decodeFunctionData('uri', callData);
      return {
              _id: BigInt(decoded[0].toString())
      };
    };
    decodeWrapInputs(callData: string): inputTypes.WrapInputs {
    const decoded = this.contractInterface.decodeFunctionData('wrap', callData);
      return {
              _avatar: getAddress(decoded[0]),
      _amount: BigInt(decoded[1].toString()),
      _type: BigInt(decoded[2].toString())
      };
    };
 
    decode(callData: string): { name: string, inputs: inputTypes.V2HubFunctionInputs} {
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
      switch (<V2HubFunctionName>functionFragment.name) {
          case 'avatars': decoded = this.decodeAvatarsInputs(callData); break;
          case 'balanceOf': decoded = this.decodeBalanceOfInputs(callData); break;
          case 'balanceOfBatch': decoded = this.decodeBalanceOfBatchInputs(callData); break;
          case 'balanceOfOnDay': decoded = this.decodeBalanceOfOnDayInputs(callData); break;
          case 'burn': decoded = this.decodeBurnInputs(callData); break;
          case 'calculateIssuance': decoded = this.decodeCalculateIssuanceInputs(callData); break;
          case 'calculateIssuanceWithCheck': decoded = this.decodeCalculateIssuanceWithCheckInputs(callData); break;
          case 'convertBatchInflationaryToDemurrageValues': decoded = this.decodeConvertBatchInflationaryToDemurrageValuesInputs(callData); break;
          case 'convertInflationaryToDemurrageValue': decoded = this.decodeConvertInflationaryToDemurrageValueInputs(callData); break;
          case 'day': decoded = this.decodeDayInputs(callData); break;
          case 'discountedBalances': decoded = this.decodeDiscountedBalancesInputs(callData); break;
          case 'groupMint': decoded = this.decodeGroupMintInputs(callData); break;
          case 'inviteHuman': decoded = this.decodeInviteHumanInputs(callData); break;
          case 'isApprovedForAll': decoded = this.decodeIsApprovedForAllInputs(callData); break;
          case 'isGroup': decoded = this.decodeIsGroupInputs(callData); break;
          case 'isHuman': decoded = this.decodeIsHumanInputs(callData); break;
          case 'isOrganization': decoded = this.decodeIsOrganizationInputs(callData); break;
          case 'isTrusted': decoded = this.decodeIsTrustedInputs(callData); break;
          case 'migrate': decoded = this.decodeMigrateInputs(callData); break;
          case 'mintPolicies': decoded = this.decodeMintPoliciesInputs(callData); break;
          case 'mintTimes': decoded = this.decodeMintTimesInputs(callData); break;
          case 'operateFlowMatrix': decoded = this.decodeOperateFlowMatrixInputs(callData); break;
          case 'registerCustomGroup': decoded = this.decodeRegisterCustomGroupInputs(callData); break;
          case 'registerGroup': decoded = this.decodeRegisterGroupInputs(callData); break;
          case 'registerHuman': decoded = this.decodeRegisterHumanInputs(callData); break;
          case 'registerOrganization': decoded = this.decodeRegisterOrganizationInputs(callData); break;
          case 'safeBatchTransferFrom': decoded = this.decodeSafeBatchTransferFromInputs(callData); break;
          case 'safeTransferFrom': decoded = this.decodeSafeTransferFromInputs(callData); break;
          case 'setApprovalForAll': decoded = this.decodeSetApprovalForAllInputs(callData); break;
          case 'stopped': decoded = this.decodeStoppedInputs(callData); break;
          case 'supportsInterface': decoded = this.decodeSupportsInterfaceInputs(callData); break;
          case 'toTokenId': decoded = this.decodeToTokenIdInputs(callData); break;
          case 'treasuries': decoded = this.decodeTreasuriesInputs(callData); break;
          case 'trust': decoded = this.decodeTrustInputs(callData); break;
          case 'trustMarkers': decoded = this.decodeTrustMarkersInputs(callData); break;
          case 'uri': decoded = this.decodeUriInputs(callData); break;
          case 'wrap': decoded = this.decodeWrapInputs(callData); break;
      
      default:
        throw new Error(`Unknown function name '${functionFragment.name}' the code is out of sync with the ABI`);
    }
    return {
      name: functionFragment.name,
      inputs: decoded
    };
  }
  
}

