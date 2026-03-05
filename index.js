const program = require('commander');
const cors = require('cors');
const socketIo = require('socket.io');
const express = require('express');
const path = require('path');
const sockets = require('@magaya/socket-tunnel-node');

require('dotenv').config({ path: path.join(__dirname, './.env') });


const packageJson = require('./package.json');

const environment = process.env.ENVIRONMENT || 'development';

// Parse CLI args first so program.networkId is available
program
    .version(packageJson.version)
    .option('-p, --port <n>', 'running port', parseInt)
    .option('-r, --root <value>', 'startup root for api')
    .option('-s, --service-name <value>', 'name for service')
    .option('-g, --gateway', 'dictates if we should be through gateway')
    .option('-i, --network-id <n>', 'magaya network id', parseInt)
    .option('--connection-string <value>', 'connection endpoint for database')
    .option('--no-daemon', 'pm2 no daemon option')
    .parse(process.argv);

const extension = { company: 'magaya', name: 'container-tracking' };
const extensionId = `${extension.company}-${extension.name}`;

const config = require('@magaya/hyperion-extension-api-key').getApiKeyConfig(
    extension,
    program.networkId,
    extensionId,
);

const fileUpload = require('express-fileupload');

const hyperionMiddleware = require('@magaya/hyperion-express-middleware');

const expressMiddleware = hyperionMiddleware.middleware(process.argv, config);

const app = express();
const requestorMiddleware = require('./src/middlewares/requestor');
const logger = require('./src/logger');

if (!program.port) {
    logger.info('Must submit port on which to listen...');
    process.exit(1);
} else if (!program.root) {
    logger.info('Must submit root...');
    process.exit(1);
}

const contextInitMiddleware = require('./src/middlewares/context-init.middleware');
const exceptionMiddleware = require('./src/middlewares/exceptions.middleware');

// 1. CORS — must be first to handle preflight OPTIONS requests
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }));

// 2. Body parsers — before any route that reads req.body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. File uploads
app.use(fileUpload());

// 4. Magaya platform middleware — populates request.api, request.dbx, request.dbw
app.use(expressMiddleware);
app.use(contextInitMiddleware);

// 5. Static files
app.use(
    `${program.root}/`,
    express.static(path.join(__dirname, 'src/static'), {
        etag: true,
        lastModified: true,
        setHeaders: (res, urlPath) => {
            if (urlPath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-store');
            }
        },
    }),
);

const server = require('./src/routes/routes');
const init = require('./src/setup/initialize');

init()
    // .CreateCustomFields(hyperion)
    .then(() => {
        const httpServer = app.listen(program.port, async () => {
            if (!program.gateway) {
                console.log(`Server started on port ${program.port}...`);
            } else {
                sockets(
                    {
                        server: process.env.GATEWAY_URL,
                        app: 'ai-document',
                        groupId: program.networkId,
                        root: `http://localhost:${program.port}${program.root}`,
                        retryStrategy: {
                            maxRetries: 3,
                        },
                    },
                    (error, socket) => {
                        if (error) {
                            logger.error(error);
                            process.exit(1);
                        }
                        logger.info('Server started...');
                    },
                );
            }
        });
        app.get(`${program.root}/mgy-open-awb`, async (request, response) => {
            logger.info(`mgy-open-awb called.`);
            const root = program.root.split('/').join('||');
            //http://localhost:5173/
            const finalUrl = `${program.root}/index.html#/documents/network/${program.networkId}/port/${program.port}/root/${root}/section/awb-documents`;
            const testUrl = `http://localhost:5173/ext/magaya/ai-documents/index.html#/documents/network/33087/port/8100/root/||server/section/awb-documents`;
            logger.info(`Redirect to : ${finalUrl}`);
            response.redirect(finalUrl);
        });
        app.get(`${program.root}/mgy-open-bol`, async (request, response) => {
            logger.info(`mgy-open-bol called.`);
            const root = program.root.split('/').join('||');

            const finalUrl = `${program.root}/index.html#/documents/network/${program.networkId}/port/${program.port}/root/${root}/section/bol-documents`;
            const testUrl = `http://localhost:5173/ext/magaya/ai-documents/index.html#/documents/network/33087/port/8100/root/||server/section/bol-documents`;
            logger.info(`Redirect to : ${finalUrl}`);
            response.redirect(finalUrl);
        });

        app.post(`${program.root}/ai-update-trans`, async (request, response) => {
            logger.info(`Magaya endpoints:started ai-update-trans.`);
            let guidList = request.body.operations.join(';');
            logger.info(`Track GUID List: ${guidList}`);

            const root = program.root.split('/').join('||');
            const uiUrl = `${program.root}/index.html#/documents/network/${program.networkId}/port/${program.port}/root/${root}/transIds/${guidList}`;
            logger.info(`Redirect to : ${uiUrl}`);
            response.redirect(uiUrl);
        });

        // 6. Post-init Magaya middlewares
        app.use(requestorMiddleware);

        // 7. Socket.io setup
        const scktio =
            environment === 'development'
                ? socketIo(httpServer, {
                      cors: {
                          origin: '*',
                      },
                  })
                : socketIo(httpServer, {
                      cors: {
                          origin: '*',
                      },
                      path: `${program.root}/socket.io`,
                  });

        scktio.sockets.on('connection', function (socket) {
            console.log('Client connected:', socket.id);

            socket.on('echo', function (data) {
                scktio.sockets.emit('message', data);
            });

            socket.on('disconnect', function () {
                console.log('Client disconnected:', socket.id);
            });
        });

        // 8. Expose socket.io to routes
        app.use((req, _res, next) => {
            req.io = scktio;
            next();
        });

        // 9. Application routes
        app.use(`${program.root}`, server);

        // 10. Error handler — always last
        app.use(exceptionMiddleware);
    })
    .catch((er) => {
        console.log(er);
    });
