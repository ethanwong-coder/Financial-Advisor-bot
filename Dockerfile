# Simple single-stage image for the MVP. (For production, switch to Next.js
# "standalone" output + a multi-stage build to shrink the image.)
FROM node:22-alpine
WORKDIR /app

# Prisma needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000

# Apply migrations, then start. (Seed manually with `npm run db:seed` if wanted.)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
