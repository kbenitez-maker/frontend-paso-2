ARG BASE_IMAGE
FROM ${BASE_IMAGE}

ARG BUILD_DIR=.next
ARG APP_PORT=3000

COPY --chown=nextjs:nodejs $BUILD_DIR/standalone ./
COPY --chown=nextjs:nodejs $BUILD_DIR/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

EXPOSE $APP_PORT
ENV PORT $APP_PORT

CMD ["node", "server.js"]