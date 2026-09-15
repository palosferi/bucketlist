const loadCurrentUserMW = require('../../../middlewares/auth/loadCurrentUser');

const USER_ID = '507f1f77bcf86cd799439012';

function makeCtx({ userId = USER_ID, issuedAt = Date.now() } = {}) {
  const req = {
    session: {
      userId,
      issuedAt,
      regenerate: jest.fn((cb) => cb()),
    },
  };
  return { req, res: { locals: {} }, next: jest.fn() };
}

const repoReturning = (user) => ({
  UserModel: { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) }) },
});

describe('loadCurrentUser', () => {
  it('loads the user for a valid session', async () => {
    const user = { _id: USER_ID, sessionsValidFrom: new Date(Date.now() - 10000) };
    const { req, res, next } = makeCtx();

    await loadCurrentUserMW(repoReturning(user))(req, res, next);

    expect(res.locals.currentUser).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  it('leaves currentUser null when there is no session', async () => {
    const { res, next } = makeCtx();
    const req = { session: {} };

    await loadCurrentUserMW(repoReturning(null))(req, res, next);

    expect(res.locals.currentUser).toBeNull();
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a session issued before the account cutoff', async () => {
    // password changed after this session was minted
    const user = { _id: USER_ID, sessionsValidFrom: new Date(Date.now() + 60000) };
    const { req, res, next } = makeCtx({ issuedAt: Date.now() });

    await loadCurrentUserMW(repoReturning(user))(req, res, next);

    expect(res.locals.currentUser).toBeNull();
    expect(req.session.regenerate).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('regenerates rather than destroys, so later middleware still has a session', async () => {
    const { req, res, next } = makeCtx();

    await loadCurrentUserMW(repoReturning(null))(req, res, next);

    // csrf() throws without req.session; destroy() would have removed it.
    expect(req.session.regenerate).toHaveBeenCalled();
    expect(req.session).toBeDefined();
  });

  it('treats a session with no issuedAt as pre-dating any cutoff', async () => {
    const user = { _id: USER_ID, sessionsValidFrom: new Date(Date.now() - 1) };
    const req = { session: { userId: USER_ID, regenerate: jest.fn((cb) => cb()) } };
    const res = { locals: {} };
    const next = jest.fn();

    await loadCurrentUserMW(repoReturning(user))(req, res, next);

    expect(res.locals.currentUser).toBeNull();
    expect(req.session.regenerate).toHaveBeenCalled();
  });
});
