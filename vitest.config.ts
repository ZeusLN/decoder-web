import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify('test'),
        __GIT_SHA__: JSON.stringify('test')
    },
    test: {
        // The decoding library is DOM-free and runs under node. Component
        // tests opt into jsdom with a `@vitest-environment jsdom` comment.
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        clearMocks: true,
        restoreMocks: true
    }
});
