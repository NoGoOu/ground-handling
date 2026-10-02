FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The postinstall script generates the Prisma client, so the schema must be there first.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-fund --no-audit

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production
# The running version (13. mérföldkő), given by the update script; after the
# build, so a new commit does not throw away the build cache of the layers above.
ARG APP_COMMIT=unknown
ARG APP_BUILD_DATE=unknown
ENV APP_COMMIT=$APP_COMMIT APP_BUILD_DATE=$APP_BUILD_DATE
EXPOSE 3000
CMD ["sh", "docker/start.sh"]
