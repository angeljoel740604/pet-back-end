const program = require('commander');
const cors = require('cors');
const socketIo = require('socket.io');
const express = require('express');
const path = require('path');
const sockets = require('@magaya/socket-tunnel-node');

require('dotenv').config({ path: path.join(__dirname, './.env') });

const fileUpload = require('express-fileupload');

const hyperionMiddleware = require('@magaya/hyperion-express-middleware');

const extension = { company: 'magaya', name: 'container-tracking' };
const extensionId = `${extension.company}-${extension.name}`;

const config = require('@magaya/hyperion-extension-api-key').getApiKeyConfig(
    extension,
    program.networkId,
    extensionId,
);

const expressMiddleware = hyperionMiddleware.middleware(process.argv, config);
const hyperion = hyperionMiddleware.hyperion(process.argv, config);

const app = express();
const requestorMiddleware = require('./middlewares/requestor');

const bodyParser = require('body-parser');
const environment = process.env.ENVIRONMENT || 'development';

// helper for filesystem.

//const extensionCheckUpdates = require('@magaya/extension-check-updates');
const packageJson = require('./package.json');

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

// const connInitEventHandler = require("./src/setup/wf-events-handler");

const logger = require('./src/logger');

if (!program.port) {
    logger.info('Must submit port on which to listen...');
    process.exit(1);
} else if (!program.root) {
    logger.info('Must submit root...');
    process.exit(1);
}

//const extensionCheckUpdatesMiddleware = extensionCheckUpdates.middleware(extension, program.networkId);
// const extensionCheckUpdatesRouter = extensionCheckUpdates.router;


const contextInitMiddleware = require('./src/middlewares/context-init.middleware');
const exceptionMiddleware = require('./src/middlewares/exceptions.middleware');

// apply the middleware in the application.
app.use(hyperion);
app.use(contextInitMiddleware);

// apply other helper middlewares.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }));

app.use(fileUpload());

// connInitEventHandler();

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
        //app.use(extensionCheckUpdatesMiddleware);
        // app.use(`${program.root}/versioninfo`, extensionCheckUpdatesRouter);
        // start your application in the port specified.
        const httpServer = app.listen(program.port, async () => {
            if (!program.gateway) {
                //  stateHelper.started();
                //logger.info(`Server started on port ${program.port}...`);
                console.log(`Server started on port ${program.port}...`);
            } else {
                sockets(
                    {
                        server: process.env.GATEWAY_URL,
                        app: 'container-tracking', //TODO: to be updated with the actual service name
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

                        // stateHelper.started();
                        logger.info('Server started...');
                    },
                );
            }
            // logger.LogMessage(`Server started on port ${program.port}...`);
        });
        // Socket.io configuration — always use the app root as the path
        // so the frontend path '/server/socket.io' always matches
        // const scktio = io(expressServer, {
        //     cors: {
        //         origin: '*',
        //     },
        //     path: `${program.root}/socket.io`,
        // });
        app.post(`${program.root}/mgy-track-containers`, async (request, response) => {
            customLogger.info(`Magaya endpoints:started mgy-track-containers.`);
            let guidList = request.body.operations.join(';');
            customLogger.info(`Track GUID List: ${guidList}`);

            const root = program.root.split('/').join('||');
            const uiUrl = `${program.root}/index.html#/containers/network/${program.networkId}/port/${program.port}/root/${root}/doRequest/${guidList}`;
            customLogger.info(`Redirect to : ${uiUrl}`);
            response.redirect(uiUrl);
        });
        app.use(expressMiddleware);
        app.use(requestorMiddleware);
        app.use(express.json());


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
        // Socket.io connection handling
        scktio.sockets.on('connection', function (socket) {
            console.log('Client connected:', socket.id);

            socket.on('echo', function (data) {
                scktio.sockets.emit('message', data);
            });

            socket.on('disconnect', function () {
                console.log('Client disconnected:', socket.id);
            });
        });

        // Middleware to access io from routes
        app.use((req, res, next) => {
            req.io = scktio;
            next();
        });

        app.use(`${program.root}`, server);
        app.use(exceptionMiddleware);
    })
    .catch((er) => {
        console.log(er);
    });
