import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'
import bodyParser from 'body-parser'
import schema from './schema'
require('dotenv').config()

const PORT = process.env.PORT || 4000

;(async function () {
  const app = express()
  const httpServer = createServer(app)

  // ws Server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql', // localhost:xxx/graphql
  })

  const serverCleanup = useServer({ schema }, wsServer) // dispose

  // apollo server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            },
          }
        },
      },
    ],
  })

  // start our server
  await server.start()

  // apply middlewares (cors, expressmiddlewares)
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server)
  )

  // http server start
  httpServer.listen(PORT || 4000, () => {
    console.log(`Server running on http://localhost:${PORT}/graphql`)
  })
})()
