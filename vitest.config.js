import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        // core/ は DOM に触らへんので node 環境。web/ を足す時に projects へ分ける
        environment: 'node',
        include: ['src/core/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
});
