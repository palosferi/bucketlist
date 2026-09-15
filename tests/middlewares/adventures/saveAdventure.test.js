const saveAdventureMW = require('../../../middlewares/adventures/saveAdventure');

const OWNER = '507f1f77bcf86cd799439012';
const LIST = '507f1f77bcf86cd799439011';

function makeCtx(body, { adventure } = {}) {
  const req = { method: 'POST', body };
  const res = {
    locals: { currentUser: { _id: OWNER }, errors: {}, form: {}, adventure },
    status: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  };
  return { req, res, next: jest.fn() };
}

describe('saveAdventure', () => {
  let objRepo;
  let saved;

  beforeEach(() => {
    saved = null;
    objRepo = {
      ListModel: { findOne: jest.fn() },
      AdventureModel: jest.fn().mockImplementation(function (attrs) {
        Object.assign(this, attrs);
        this.save = jest.fn().mockImplementation(() => {
          saved = this;
          return Promise.resolve(this);
        });
      }),
    };
  });

  it('is a no-op on GET so one chain serves form and submission', async () => {
    const { req, res, next } = makeCtx({});
    req.method = 'GET';
    await saveAdventureMW(objRepo)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(objRepo.ListModel.findOne).not.toHaveBeenCalled();
  });

  it('scopes the target list to the current user', async () => {
    objRepo.ListModel.findOne.mockResolvedValue({ _id: LIST });
    const { req, res, next } = makeCtx({ name: 'Dive', _list: LIST, country: 'HU' });

    await saveAdventureMW(objRepo)(req, res, next);

    expect(objRepo.ListModel.findOne).toHaveBeenCalledWith({ _id: LIST, _owner: OWNER });
    expect(res.redirect).toHaveBeenCalledWith(`/lists/${LIST}`);
  });

  it("refuses to file an adventure into someone else's list", async () => {
    objRepo.ListModel.findOne.mockResolvedValue(null); // not owned by this user
    const { req, res, next } = makeCtx({ name: 'Injected', _list: LIST });

    await saveAdventureMW(objRepo)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.locals.errors._list).toMatch(/your own lists/);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(saved).toBeNull();
  });

  it('stores coordinates at full precision', async () => {
    objRepo.ListModel.findOne.mockResolvedValue({ _id: LIST });
    const { req, res, next } = makeCtx({
      name: 'Hill', _list: LIST, latitude: '47.4863921', longitude: '19.0397544',
    });

    await saveAdventureMW(objRepo)(req, res, next);

    expect(saved.latitude).toBe(47.4863921);
    expect(saved.longitude).toBe(19.0397544);
  });

  it('re-renders with a 400 when validation fails', async () => {
    const { req, res, next } = makeCtx({ name: '', _list: LIST });
    await saveAdventureMW(objRepo)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.locals.errors.name).toBeDefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('passes unexpected database errors to next', async () => {
    const boom = new Error('db is down');
    objRepo.ListModel.findOne.mockRejectedValue(boom);
    const { req, res, next } = makeCtx({ name: 'x', _list: LIST });

    await saveAdventureMW(objRepo)(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
