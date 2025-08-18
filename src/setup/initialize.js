// Initialize the application
module.exports = async function initialize(app, program, logger, sockets, io) {
    // Load global context
    // const globalContext = require('../global-context');
    // await globalContext.loadContext();

    // // Set up routes
    // const routes = require('../routes/routes');
    // app.use(program.root, routes);

    // // Start the server
    // const expressServer = app.listen(program.port, async () => {
    //     if (!program.gateway) {
    //         logger.info(`Server started on port ${program.port}...`);
    //     } else {
    //         sockets(
    //             {
    //                 server: 'https://appgw.magaya.net',
    //                 app: 'ai-document',
    //                 groupId: program.networkId,
    //                 root: `http://localhost:${program.port}${program.root}`,
    //                 retryStrategy: {
    //                     maxRetries: 3,
    //                 },
    //             },
    //             (error, socket) => {
    //                 if (error) {
    //                     logger.error(error);
    //                     process.exit(1);
    //                 }
    //                 logger.info('Server started...');
    //             },
    //         );
    //     }
    // });

    // // Set up Socket.IO
    // const scktio = io(expressServer, {
    //     cors: {
    //         origin: '*',
    //     },
    //     // Add any additional Socket.IO configuration here
    // });

    // // Attach Socket.IO to the Express server
    // scktio.on('connection', (socket) => {
    //     logger.info('New client connected');
    //     socket.on('disconnect', () => {
    //         logger.info('Client disconnected');
    //     });
    // });
}