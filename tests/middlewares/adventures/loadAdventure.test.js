    const { render } = require("ejs");
    const mw = require("../../../middlewares/adventures/loadAdventure");

    test('loadAdventure should load 1 adventure', async () => {
        const objRepo = {
            AdventureModel:{
                findOne: jest.fn((param) => {
                    return Promise.resolve('adventure');
                })
            }
        };
        const req = {
            params: {
                id: '123'
            }
        };
        const next = jest.fn(()=>{});
        const res = {
            locals: {}
        };
        await mw(objRepo)(req, res, next);
        expect(res.locals.adventure).toBe('adventure');
        expect(objRepo.AdventureModel.findOne).toBeCalledWith({
            _id: req.params.id
        });
        expect(next).toBeCalled();
    });

    test('loadAdventure should redirect to /adventures if adventure is not found', async () => {
        const objRepo = {
            AdventureModel:{
                findOne: jest.fn((param) => {
                    return Promise.resolve(null);
                })
            }
        };
        const req = {
            params: {
                id: '123'
            }
        };
        const next = jest.fn(()=>{});
        const res = {
            locals: {},
            redirect: jest.fn(()=>{})
        };
        await mw(objRepo)(req, res, next);
        expect(objRepo.AdventureModel.findOne).toBeCalledWith({
            _id: req.params.id
        });
        expect(next).not.toBeCalled();
        expect(res.redirect).toBeCalledWith("/adventures");
    });