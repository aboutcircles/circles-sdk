import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';

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
    nodePolyfills(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ],
  external: ['@safe-global/protocol-kit', 'ethers', 'ethers-multisend']
};
