const loadAdventureMW = require('../../../middlewares/adventures/loadAdventure');

const OWNER = '507f1f77bcf86cd799439012';

function makeCtx(id) {
  const req = { params: { id } };
  const res = {
    locals: { currentUser: { _id: OWNER } },
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
  };
  return { req, res, next: jest.fn() };
}

describe('loadAdventure', () => {
  it('always scopes the lookup by owner', async () => {
    const objRepo = {
      AdventureModel: { findOne: jest.fn().mockResolvedValue({ _id: 'a' }) },
      ListModel: { find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) },
    };
    const { req, res, next } = makeCtx('abc');

    await loadAdventureMW(objRepo)(req, res, next);

    expect(objRepo.AdventureModel.findOne).toHaveBeenCalledWith({ _id: 'abc', _owner: OWNER });
    expect(res.locals.adventure).toEqual({ _id: 'a' });
    expect(next).toHaveBeenCalledWith();
  });

  it("renders 404 for an adventure the user does not own", async () => {
    const objRepo = {
      AdventureModel: { findOne: jest.fn().mockResolvedValue(null) },
      ListModel: { find: jest.fn() },
    };
    const { req, res, next } = makeCtx('abc');

    await loadAdventureMW(objRepo)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('404', res.locals);
    expect(next).not.toHaveBeenCalled();
  });

  it('turns a malformed id into a 404 rather than a 500', async () => {
    const castError = Object.assign(new Error('bad id'), { name: 'CastError' });
    const objRepo = {
      AdventureModel: { findOne: jest.fn().mockRejectedValue(castError) },
      ListModel: { find: jest.fn() },
    };
    const { req, res, next } = makeCtx('not-an-id');

    await loadAdventureMW(objRepo)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
