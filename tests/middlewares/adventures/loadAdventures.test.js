const mw = require("../../../middlewares/adventures/loadAdventures");

const makeObjRepo = (result) => {
    const populate = jest.fn(() => result);
    return {
        populate,
        objRepo: {
            AdventureModel: {
                find: jest.fn(() => ({ populate }))
            }
        }
    };
};

test('loadAdventures should load every adventure', async () => {
    const adventures = ['adventure1', 'adventure2'];
    const { populate, objRepo } = makeObjRepo(Promise.resolve(adventures));
    const req = {};
    const res = {
        locals: {}
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(objRepo.AdventureModel.find).toBeCalledWith({});
    expect(populate).toBeCalledWith('_location');
    expect(res.locals.adventures).toBe(adventures);
    expect(next).toBeCalled();
});

test('loadAdventures should store an empty list if there are no adventures', async () => {
    const { objRepo } = makeObjRepo(Promise.resolve([]));
    const req = {};
    const res = {
        locals: {}
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(res.locals.adventures).toEqual([]);
    expect(next).toBeCalled();
});

test('loadAdventures should pass the error to next if the query fails', async () => {
    const error = new Error('db is down');
    const { objRepo } = makeObjRepo(Promise.reject(error));
    const req = {};
    const res = {
        locals: {}
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(res.locals.adventures).toBeUndefined();
    expect(next).toBeCalledWith(error);
});
