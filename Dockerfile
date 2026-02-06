# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY mcp-server/package.json mcp-server/
RUN npm ci

# Stage 2: Build all workspaces
FROM deps AS build
COPY . .
RUN npm run build

# Stage 3: Server production image
FROM node:22-slim AS server
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY mcp-server/package.json mcp-server/
RUN npm ci --omit=dev
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]

# Stage 4: MCP server production image
FROM node:22-slim AS mcp-server
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY mcp-server/package.json mcp-server/
RUN npm ci --omit=dev
COPY --from=build /app/mcp-server/dist mcp-server/dist
EXPOSE 3002
CMD ["node", "mcp-server/dist/index.js"]
