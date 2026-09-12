describe('mailer without an API key', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  it('logs instead of throwing, so signup still works unconfigured', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mailer = require('../../lib/mailer');

    const result = await mailer.sendVerification('a@b.com', 'tok123');

    expect(result).toEqual({ delivered: false, reason: 'no-api-key' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('puts the token in a link the recipient can open', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mailer = require('../../lib/mailer');

    await mailer.sendPasswordReset('a@b.com', 'resettoken');
    const logged = warn.mock.calls.map((c) => c.join(' ')).join('\n');

    expect(logged).toContain('/reset?token=resettoken');
    warn.mockRestore();
  });
});
