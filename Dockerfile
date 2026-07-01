FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js .
RUN mkdir -p /data && chmod 777 /data
ENV DB_PATH=/data/waitlist.json
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
