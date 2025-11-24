FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY ./data /app/data

EXPOSE 5007
CMD ["npm", "start"]
