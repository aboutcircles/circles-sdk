import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';

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
    resolve(),
    json(),
    typescript({
      tsconfig: './tsconfig.json'
    }),
  ],
  external: ['ethers', 'multihashes']
};
