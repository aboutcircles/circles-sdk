import { ethers } from 'ethers';
import * as inputTypes from './MigrationFunctionInputTypes';
import contractAbi from './MigrationAbi.json';

export class MigrationCalls {
    private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

        convertFromV1ToDemurrage(params: inputTypes.ConvertFromV1ToDemurrageInputs): string {
        return this.contractInterface.encodeFunctionData('convertFromV1ToDemurrage', [params._amount]);
    }

    hubV1(): string {
        return this.contractInterface.encodeFunctionData('hubV1', []);
    }

    hubV2(): string {
        return this.contractInterface.encodeFunctionData('hubV2', []);
    }

    inflationDayZero(): string {
        return this.contractInterface.encodeFunctionData('inflationDayZero', []);
    }

    migrate(params: inputTypes.MigrateInputs): string {
        return this.contractInterface.encodeFunctionData('migrate', [params._avatars, params._amounts]);
    }

    period(): string {
        return this.contractInterface.encodeFunctionData('period', []);
    }

}

