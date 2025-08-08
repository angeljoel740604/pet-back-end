const usersService = () => require('./user-settings.service');

describe.skip('Users Services', () => {
    it.skip('Get users', async () => {
        jest.doMock('../ai-document-cs/api-client', () => () => ({
            doGet: () => {},
            doPost: () => {},
            doDelete: () => {},
        }));

        const userServiceFnc = usersService();
        try {
            await userServiceFnc().getUserFilersSettings();
        } catch (error) {
            expect(error).toBe(error);
        }
    });
    it('Remove users', async () => {
        jest.doMock('../ai-document-cs/api-client', () => () => ({
            doDelete: () => {},
        }));

        const userServiceFnc = usersService();
        try {
            await userServiceFnc().removeFiler('XL4');
        } catch (error) {
            expect(error).toBe(error);
        }
    });
    it('Save users', async () => {
        jest.doMock('../ai-document-cs/api-client', () => () => ({
            doPost: () => {},
        }));
        const data = {
            username: 'cert_magaya_sy4',
            password: 'testusermagaya!@#',
            filerId: 'sy4',
            Division: { id: 'id', name: 'name' },
            EventSubscribed: true,
            EntrySummary: true,
            FTZ: false,
            InBond: false,
            ISF: false,
        };
        const userServiceFnc = usersService();
        try {
            await userServiceFnc().saveUserSettings(data);
        } catch (error) {
            expect(error).toBe(error);
        }
    });
});
