const UserModel = require('../../models/user');
const subscribeToRoutes = require('../../routing/routing');

jest.mock('../../models/user');

/**
 * routing.js registers everything on the router it is handed, so a stub that
 * records the calls is enough to get at one handler without standing up an
 * app, a database or a photo store.
 */
function landingHandler() {
  const routes = [];
  const router = new Proxy(
    {},
    {
      get: (_target, prop) => (...args) => {
        if (prop === 'get' || prop === 'post') {
          routes.push({ method: prop, path: args[0], handler: args[args.length - 1] });
        }
        return router;
      },
    }
  );
  subscribeToRoutes(router);
  const landing = routes.find((r) => r.method === 'get' && r.path === '/');
  if (!landing) throw new Error('no GET / route was registered');
  return landing.handler;
}

/** Mongoose chain the handler walks: findOne(...).select(...).lean(). */
const resolvesTo = (doc) => ({ select: () => ({ lean: async () => doc }) });

describe('landing page featured handle', () => {
  let warn;

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warn.mockRestore());

  it('hides the link when FEATURED_HANDLE names an account that does not exist', async () => {
    UserModel.findOne.mockReturnValue(resolvesTo(null));
    const res = { locals: { featuredHandle: 'feri' }, render: jest.fn(), redirect: jest.fn() };

    await landingHandler()({}, res, jest.fn());

    expect(res.locals.featuredHandle).toBe('');
    expect(res.render).toHaveBeenCalledWith('landing', res.locals);
  });

  it('keeps the link when the handle still resolves', async () => {
    UserModel.findOne.mockReturnValue(resolvesTo({ _id: 'u1' }));
    const res = { locals: { featuredHandle: 'ferencpalos' }, render: jest.fn(), redirect: jest.fn() };

    await landingHandler()({}, res, jest.fn());

    expect(UserModel.findOne).toHaveBeenCalledWith({ handle: 'ferencpalos' });
    expect(res.locals.featuredHandle).toBe('ferencpalos');
    expect(res.render).toHaveBeenCalledWith('landing', res.locals);
  });

  it('does not query at all when no handle is configured', async () => {
    const res = { locals: { featuredHandle: '' }, render: jest.fn(), redirect: jest.fn() };

    await landingHandler()({}, res, jest.fn());

    expect(UserModel.findOne).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith('landing', res.locals);
  });

  it('sends a logged-in visitor to their lists instead of rendering', async () => {
    const res = { locals: { currentUser: { _id: 'u1' } }, render: jest.fn(), redirect: jest.fn() };

    await landingHandler()({}, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith('/lists');
    expect(res.render).not.toHaveBeenCalled();
  });

  it('passes a lookup failure to the error handler rather than rendering', async () => {
    UserModel.findOne.mockReturnValue({
      select: () => ({ lean: async () => { throw new Error('mongo is down'); } }),
    });
    const res = { locals: { featuredHandle: 'ferencpalos' }, render: jest.fn(), redirect: jest.fn() };
    const next = jest.fn();

    await landingHandler()({}, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.render).not.toHaveBeenCalled();
  });
});
