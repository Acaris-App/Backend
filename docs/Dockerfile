FROM oven/bun:1.1.42-alpine

WORKDIR /app

COPY docs/package.json docs/bun.lockb ./
RUN bun install --production --frozen-lockfile

COPY docs/src ./src
COPY docs/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "src/docs.ts"]
