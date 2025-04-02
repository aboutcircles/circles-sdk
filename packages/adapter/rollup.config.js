import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      // ESM build
      format: 'esm',
      sourcemap: true,
      entryFileNames: 'esm/[name].js',
      chunkFileNames: 'esm/[name].js',
      dir: 'dist'
    },
    {
      // CommonJS build
      format: 'cjs',
      sourcemap: true,
      entryFileNames: 'cjs/[name].js',
      chunkFileNames: 'cjs/[name].js',
      dir: 'dist'
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        outDir: undefined,
        declaration: true,
        declarationDir: 'dist/types'
      }
    }),
  ],
  external: []
};
