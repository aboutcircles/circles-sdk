import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: './src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    json(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ],
  external: ['ethers', 'multihashes', '@circles-sdk/abi-v1', '@circles-sdk/abi-v2', '@circles-sdk/data', '@circles-sdk/utils']
};
