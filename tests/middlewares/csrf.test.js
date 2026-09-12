const csrf = require('../../middlewares/csrf');
const { verifyCsrf } = require('../../middlewares/csrf');

function ctx({ method = 'POST', body = {}, session = {}, headers = {} } = {}) {
  const req = {
    method,
    body,
    session,
    get: (h) => headers[h.toLowerCase()],
  };
  const res = { locals: {} };
  const next = jest.fn();
  return { req, res, next };
}

describe('csrf', () => {
  it('mints a token and exposes it to templates', () => {
    const { req, res, next } = ctx({ method: 'GET' });
    csrf()(req, res, next);
    expect(res.locals.csrfToken).toEqual(expect.any(String));
    expect(res.locals.csrfToken.length).toBeGreaterThan(20);
    expect(next).toHaveBeenCalledWith();
  });

  it('lets a GET through without a token', () => {
    const { req, res, next } = ctx({ method: 'GET', session: { csrfToken: 'abc' } });
    csrf()(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a POST with no token', () => {
    const { req, res, next } = ctx({ session: { csrfToken: 'abc' } });
    csrf()(req, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it('rejects a POST with the wrong token', () => {
    const { req, res, next } = ctx({ body: { _csrf: 'nope' }, session: { csrfToken: 'abc' } });
    csrf()(req, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it('accepts a POST with the right token', () => {
    const { req, res, next } = ctx({ body: { _csrf: 'abc' }, session: { csrfToken: 'abc' } });
    csrf()(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts the token from a header', () => {
    const { req, res, next } = ctx({
      session: { csrfToken: 'abc' },
      headers: { 'x-csrf-token': 'abc' },
    });
    csrf()(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('defers multipart requests instead of rejecting them', () => {
    const { req, res, next } = ctx({
      session: { csrfToken: 'abc' },
      headers: { 'content-type': 'multipart/form-data; boundary=xyz' },
    });
    csrf()(req, res, next);
    expect(req.csrfDeferred).toBe(true);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('verifyCsrf', () => {
  it('rejects a deferred request whose token is wrong', () => {
    const { req, res, next } = ctx({ body: { _csrf: 'nope' }, session: { csrfToken: 'abc' } });
    verifyCsrf()(req, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it('accepts a deferred request whose token is right', () => {
    const { req, res, next } = ctx({ body: { _csrf: 'abc' }, session: { csrfToken: 'abc' } });
    verifyCsrf()(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.csrfDeferred).toBe(false);
  });

  it('rejects when the session has no token at all', () => {
    const { req, res, next } = ctx({ body: { _csrf: 'abc' }, session: {} });
    verifyCsrf()(req, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});
