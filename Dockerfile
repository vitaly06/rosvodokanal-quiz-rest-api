# Development stage
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Устанавливаем Nest CLI глобально
RUN npm install -g @nestjs/cli

# Копируем файлы зависимостей
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install

# Копируем остальные файлы
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN yarn build

# Production stage
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Копируем только необходимые файлы
COPY package.json yarn.lock ./
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/prisma ./prisma

# Устанавливаем только production зависимости
RUN yarn install --production

EXPOSE 3000

CMD ["yarn", "start:prod"]