const mw = require("../../../middlewares/adventures/saveAdventure");

const validBody = {
    name: 'Kilimanjaro',
    type: 'hiking',
    date: '2025-07-01',
    _location: '456',
    description: 'the roof of Africa'
};

const makeObjRepo = (saveResult = Promise.resolve()) => {
    const save = jest.fn(() => saveResult);
    const AdventureModel = jest.fn(function () {
        this.save = save;
    });
    return { save, objRepo: { AdventureModel } };
};

test('saveAdventure should create and save a new adventure', async () => {
    const { save, objRepo } = makeObjRepo();
    const req = { body: { ...validBody } };
    const res = {
        locals: {},
        redirect: jest.fn(()=>{})
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(objRepo.AdventureModel).toBeCalled();
    const adventure = objRepo.AdventureModel.mock.instances[0];
    expect(adventure.name).toBe(validBody.name);
    expect(adventure.type).toBe(validBody.type);
    expect(adventure.date).toBe(validBody.date);
    expect(adventure._location).toBe(validBody._location);
    expect(adventure.description).toBe(validBody.description);
    expect(save).toBeCalled();
    expect(res.redirect).toBeCalledWith("/adventures");
    expect(next).not.toBeCalled();
});

test('saveAdventure should update the adventure already on res.locals', async () => {
    const { objRepo } = makeObjRepo();
    const existing = {
        name: 'old name',
        save: jest.fn(() => Promise.resolve())
    };
    const req = { body: { ...validBody } };
    const res = {
        locals: { adventure: existing },
        redirect: jest.fn(()=>{})
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(objRepo.AdventureModel).not.toBeCalled();
    expect(existing.name).toBe(validBody.name);
    expect(existing.description).toBe(validBody.description);
    expect(existing.save).toBeCalled();
    expect(res.redirect).toBeCalledWith("/adventures");
    expect(next).not.toBeCalled();
});

test('saveAdventure should skip saving if a field is missing from the body', async () => {
    const { save, objRepo } = makeObjRepo();
    const { description, ...incompleteBody } = validBody;
    const req = { body: incompleteBody };
    const res = {
        locals: {},
        redirect: jest.fn(()=>{})
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(save).not.toBeCalled();
    expect(res.redirect).not.toBeCalled();
    expect(next).toBeCalled();
});

test('saveAdventure should skip saving if there is no body', async () => {
    const { save, objRepo } = makeObjRepo();
    const req = {};
    const res = {
        locals: {},
        redirect: jest.fn(()=>{})
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(save).not.toBeCalled();
    expect(res.redirect).not.toBeCalled();
    expect(next).toBeCalled();
});

test('saveAdventure should pass the error to next if saving fails', async () => {
    const error = new Error('db is down');
    const { objRepo } = makeObjRepo(Promise.reject(error));
    const req = { body: { ...validBody } };
    const res = {
        locals: {},
        redirect: jest.fn(()=>{})
    };
    const next = jest.fn(()=>{});

    await mw(objRepo)(req, res, next);

    expect(res.redirect).not.toBeCalled();
    expect(next).toBeCalledWith(error);
});
