import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      // ESM build
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      entryFileNames: '[name].js'
    },
    {
      // CommonJS build
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].js'
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json'
    }),
  ],
  external: ['ethers']
};
