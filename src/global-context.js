let hyperion;
let apiToken;

module.exports = {
    initContext: (hyp, token) => {
        hyperion = hyp;
        apiToken = token;
    },
    getContext: () => ({
        hyperion,
        apiToken,
    }),
};
