// helper package for parsing command arguments.
const io = require('socket.io');

const program = require('commander');
const packageJson = require('./package.json');
// const extConfigJson = require('./extension.config.json'); //trabajar local
// const extConfigJson = require('../../../extension.config.json');
const express = require('express');

const fileUpload = require('express-fileupload');

const app = express();

const cors = require('cors');

// helper package to get the body of requests
const bodyParser = require('body-parser');
// require the config helper.

const sockets = require('@magaya/socket-tunnel-node');

// helper for paths
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, './.env') });
// helper for filesystem.
const fs = require('fs');

const hyperionMiddleware = require('@magaya/hyperion-express-middleware');
const extensionCheckUpdates = require('@magaya/extension-check-updates');

const connInitEventHandler = require('./src/setup/wf-events-handler');

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

const extension = { company: 'magaya', name: 'ai-document' };
const config = require('@magaya/hyperion-extension-api-key').getApiKeyConfig(extension, program.networkId);

const logger = require('./src/logger');

if (!program.port) {
    logger.info('Must submit port on which to listen...');
    process.exit(1);
} else if (!program.root) {
    logger.info('Must submit root...');
    process.exit(1);
}

const extensionCheckUpdatesMiddleware = extensionCheckUpdates.middleware(extension, program.networkId);
const extensionCheckUpdatesRouter = extensionCheckUpdates.router;

const middleware = hyperionMiddleware.middleware(process.argv, config);
const hyperion = hyperionMiddleware.hyperion(process.argv, config);

const contextInitMiddleware = require('./src/middlewares/context-init.middleware');
const exceptionMiddleware = require('./src/middlewares/exceptions.middleware');

// apply the middleware in the application.
app.use(middleware);
app.use(contextInitMiddleware);

// apply other helper middlewares.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }));

app.use(fileUpload());

connInitEventHandler();

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

const init = require('./src/setup/fields.init');

init()
    //.CreateCustomFields(hyperion)
    .then(() => {
        app.use(extensionCheckUpdatesMiddleware);
        //app.use(`${program.root}/versioninfo`, extensionCheckUpdatesRouter);
        // start your application in the port specified.
        const expressServer = app.listen(program.port, async () => {
            // const dataUsers = await api.doGet('RetrieveUsers');

            
            // app.post(`${program.root}/send-inbond`, async (request, response) => {
            //     const guidList = request.body.operations.join(';');
            //     const root = program.root.substring(1).split('/').join('||');

            //     response.redirect(`${program.root}/index.html#/inbond/${guidList}/${program.port}/${root}`);
            // });

            // app.get(`${program.root}/configurations`, async (request, response) => {
            //     const root = program.root.substring(1).split('/').join('||');

            //     response.redirect(`${program.root}/index.html#/users/${program.port}/${root}`);
            // });

            // app.post(`${program.root}/send-attachment`, async (request, response) => {
            //     const guidList = request.body.operations.join(';');
            //     const root = program.root.substring(1).split('/').join('||');
            //     response.redirect(
            //         `${program.root}/index.html#/attach-document/${guidList}/${program.port}/${root}`,
            //     );
            // });

            if (!program.gateway) {
                //  stateHelper.started();
                logger.info(`Server started on port ${program.port}...`);
            } else {
                sockets(
                    {
                        server: 'https://appgw.magaya.net',
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

                        // stateHelper.started();
                        logger.info('Server started...');
                    },
                );
            }
            // logger.LogMessage(`Server started on port ${program.port}...`);
        });
        const scktio = io(expressServer, {
            cors: {
                origin: '*',
            },
            path: `${program.root}/socket.io`,
        });

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
