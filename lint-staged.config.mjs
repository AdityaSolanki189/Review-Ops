import path from 'node:path'

const config = {
    '*.{js,ts,jsx,tsx,json,md,css,scss}': (filenames) => {
        const relativeFiles = filenames.map((file) => path.relative(process.cwd(), file)).join(' ')
        const spellCheckFiles = filenames
            .filter((file) => /\.(js|jsx|ts|tsx|md|mdx)$/.test(file))
            .map((file) => path.relative(process.cwd(), file))
            .join(' ')

        const commands = [`pnpm run lint -- ${relativeFiles}`, `pnpm run format -- ${relativeFiles}`]

        if (spellCheckFiles) {
            commands.push(`cspell ${spellCheckFiles}`)
        }

        commands.push(`git add ${relativeFiles}`)

        return commands
    },
}

export default config
